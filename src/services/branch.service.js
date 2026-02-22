const { getCurrentPrisma } = require('../middlewares/requestContext');
const prisma = new Proxy({}, { get: (_, prop) => getCurrentPrisma()[prop] });
const { pagination: paginationConfig } = require('../config/constants');
const { NotFoundError, ConflictError } = require('../middlewares/errorHandler');

class BranchService {
  /**
   * Get paginated list of branches
   */
  async getBranches(query) {
    const {
      page = paginationConfig.defaultPage,
      per_page = paginationConfig.defaultPerPage,
      search,
      status
    } = query;

    const skip = (page - 1) * per_page;
    const take = Math.min(per_page, paginationConfig.maxPerPage);

    const where = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { address: { contains: search } }
      ];
    }

    if (status) {
      where.isActive = status === 'active';
    }

    const [branches, total] = await Promise.all([
      prisma.branch.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.branch.count({ where })
    ]);

    const items = branches.map(branch => ({
      id: branch.id,
      name: branch.name,
      code: branch.code,
      address: branch.address,
      phone: branch.phone,
      email: branch.email,
      is_active: branch.isActive,
      settings: branch.settings,
      created_at: branch.createdAt
    }));

    return {
      items,
      pagination: {
        current_page: parseInt(page),
        per_page: take,
        total_pages: Math.ceil(total / take),
        total_items: total
      }
    };
  }

  /**
   * Get branch by ID
   */
  async getBranchById(id) {
    const branch = await prisma.branch.findUnique({
      where: { id: parseInt(id) }
    });

    if (!branch) {
      throw new NotFoundError('Branch');
    }

    // Get branch stats
    const stats = await this.getBranchStats(branch.id);

    return {
      id: branch.id,
      name: branch.name,
      code: branch.code,
      address: branch.address,
      phone: branch.phone,
      email: branch.email,
      is_active: branch.isActive,
      settings: branch.settings,
      stats,
      created_at: branch.createdAt,
      updated_at: branch.updatedAt
    };
  }

  /**
   * Create new branch
   */
  async createBranch(data) {
    const { name, code, address, phone, email, is_active = true, settings } = data;

    // Check if code exists
    const existingBranch = await prisma.branch.findUnique({
      where: { code }
    });

    if (existingBranch) {
      throw new ConflictError('Branch with this code already exists');
    }

    const branch = await prisma.branch.create({
      data: {
        name,
        code,
        address,
        phone,
        email,
        isActive: is_active,
        settings: settings || {
          tax_rate: 10,
          tax_type: 'exclusive',
          receipt_header: `Welcome to ${name}`,
          receipt_footer: 'Thank you for shopping!'
        }
      }
    });

    return {
      id: branch.id,
      name: branch.name,
      code: branch.code,
      address: branch.address,
      phone: branch.phone,
      email: branch.email,
      is_active: branch.isActive,
      settings: branch.settings,
      created_at: branch.createdAt
    };
  }

  /**
   * Update branch
   */
  async updateBranch(id, data) {
    const branchId = parseInt(id);
    const { name, address, phone, email, is_active, settings } = data;

    const existingBranch = await prisma.branch.findUnique({
      where: { id: branchId }
    });

    if (!existingBranch) {
      throw new NotFoundError('Branch');
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (address !== undefined) updateData.address = address;
    if (phone !== undefined) updateData.phone = phone;
    if (email !== undefined) updateData.email = email;
    if (is_active !== undefined) updateData.isActive = is_active;
    if (settings !== undefined) {
      updateData.settings = { ...existingBranch.settings, ...settings };
    }

    const branch = await prisma.branch.update({
      where: { id: branchId },
      data: updateData
    });

    return {
      id: branch.id,
      name: branch.name,
      code: branch.code,
      address: branch.address,
      phone: branch.phone,
      email: branch.email,
      is_active: branch.isActive,
      settings: branch.settings,
      updated_at: branch.updatedAt
    };
  }

  /**
   * Delete branch
   */
  async deleteBranch(id) {
    const branchId = parseInt(id);

    const branch = await prisma.branch.findUnique({
      where: { id: branchId }
    });

    if (!branch) {
      throw new NotFoundError('Branch');
    }

    // Check if branch has orders
    const ordersCount = await prisma.order.count({
      where: { branchId }
    });

    if (ordersCount > 0) {
      throw new ConflictError('Cannot delete branch with existing orders');
    }

    await prisma.branch.delete({
      where: { id: branchId }
    });

    return { message: 'Branch deleted successfully' };
  }

  /**
   * Get branch stats
   */
  async getBranchStats(branchId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [usersCount, productsCount, todayStats] = await Promise.all([
      prisma.userBranch.count({ where: { branchId } }),
      prisma.productStock.count({ where: { branchId, stockQuantity: { gt: 0 } } }),
      prisma.order.aggregate({
        where: {
          branchId,
          status: 'completed',
          createdAt: { gte: today }
        },
        _sum: { total: true },
        _count: true
      })
    ]);

    return {
      total_users: usersCount,
      total_products: productsCount,
      today_sales: Number(todayStats._sum.total || 0),
      today_orders: todayStats._count
    };
  }
}

module.exports = new BranchService();

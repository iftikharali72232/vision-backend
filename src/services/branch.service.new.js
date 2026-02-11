/**
 * Branch Service
 * Handles all branch-related business logic for multi-tenant system
 */

const { systemPrisma, getTenantPrisma } = require('../config/database');
const { pagination: paginationConfig } = require('../config/constants');
const { NotFoundError, ConflictError, BadRequestError } = require('../middlewares/errorHandler');

class BranchService {
  /**
   * Get paginated list of branches for a company
   */
  async getBranches(tenantDb, query) {
    const {
      page = paginationConfig.defaultPage,
      per_page = paginationConfig.defaultPerPage,
      search,
      status
    } = query;

    const tenantPrisma = getTenantPrisma(tenantDb);
    const skip = (page - 1) * per_page;
    const take = Math.min(per_page, paginationConfig.maxPerPage);

    const where = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { address: { contains: search } },
        { code: { contains: search } }
      ];
    }

    if (status) {
      where.isActive = status === 'active';
    }

    const [branches, total] = await Promise.all([
      tenantPrisma.branch.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              users: true,
              orders: true,
              products: true
            }
          }
        }
      }),
      tenantPrisma.branch.count({ where })
    ]);

    const items = branches.map(branch => ({
      id: branch.id,
      name: branch.name,
      code: branch.code,
      address: branch.address,
      phone: branch.phone,
      email: branch.email,
      isActive: branch.isActive,
      settings: branch.settings,
      userCount: branch._count.users,
      orderCount: branch._count.orders,
      productCount: branch._count.products,
      createdAt: branch.createdAt
    }));

    return {
      items,
      pagination: {
        currentPage: parseInt(page),
        perPage: take,
        totalPages: Math.ceil(total / take),
        totalItems: total
      }
    };
  }

  /**
   * Get branch by ID
   */
  async getBranchById(tenantDb, id) {
    const tenantPrisma = getTenantPrisma(tenantDb);
    
    const branch = await tenantPrisma.branch.findUnique({
      where: { id: parseInt(id) },
      include: {
        users: {
          where: { isActive: true },
          select: {
            id: true,
            systemUserId: true,
            roleId: true,
            isActive: true,
            createdAt: true
          }
        },
        _count: {
          select: {
            orders: true,
            products: true,
            categories: true
          }
        }
      }
    });

    if (!branch) {
      throw new NotFoundError('Branch');
    }

    // Get user details from system database
    const systemUserIds = branch.users.map(u => u.systemUserId);
    const systemUsers = await systemPrisma.systemUser.findMany({
      where: { id: { in: systemUserIds } },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatar: true
      }
    });

    // Get role details
    const roleIds = branch.users.map(u => u.roleId).filter(Boolean);
    const roles = await systemPrisma.role.findMany({
      where: { id: { in: roleIds } },
      select: {
        id: true,
        name: true,
        code: true
      }
    });

    // Map users with system data
    const usersWithDetails = branch.users.map(u => {
      const systemUser = systemUsers.find(s => s.id === u.systemUserId);
      const role = roles.find(r => r.id === u.roleId);
      return {
        id: u.id,
        systemUserId: u.systemUserId,
        name: systemUser?.name,
        email: systemUser?.email,
        phone: systemUser?.phone,
        avatar: systemUser?.avatar,
        role: role ? { id: role.id, name: role.name, code: role.code } : null,
        isActive: u.isActive,
        createdAt: u.createdAt
      };
    });

    return {
      id: branch.id,
      name: branch.name,
      code: branch.code,
      address: branch.address,
      phone: branch.phone,
      email: branch.email,
      isActive: branch.isActive,
      settings: branch.settings,
      users: usersWithDetails,
      stats: {
        orders: branch._count.orders,
        products: branch._count.products,
        categories: branch._count.categories,
        users: branch.users.length
      },
      createdAt: branch.createdAt,
      updatedAt: branch.updatedAt
    };
  }

  /**
   * Create new branch
   */
  async createBranch(tenantDb, data) {
    const tenantPrisma = getTenantPrisma(tenantDb);
    const { name, code, address, phone, email, isActive = true, settings } = data;

    // Check for duplicate code
    if (code) {
      const existing = await tenantPrisma.branch.findFirst({
        where: { code }
      });
      if (existing) {
        throw new ConflictError('Branch with this code already exists');
      }
    }

    // Check for duplicate name
    const existingName = await tenantPrisma.branch.findFirst({
      where: { name }
    });
    if (existingName) {
      throw new ConflictError('Branch with this name already exists');
    }

    const branch = await tenantPrisma.branch.create({
      data: {
        name,
        code: code || this.generateBranchCode(name),
        address,
        phone,
        email,
        isActive,
        settings: settings || {}
      }
    });

    return {
      id: branch.id,
      name: branch.name,
      code: branch.code,
      address: branch.address,
      phone: branch.phone,
      email: branch.email,
      isActive: branch.isActive,
      settings: branch.settings,
      createdAt: branch.createdAt
    };
  }

  /**
   * Update branch
   */
  async updateBranch(tenantDb, id, data) {
    const tenantPrisma = getTenantPrisma(tenantDb);
    const branchId = parseInt(id);

    const existing = await tenantPrisma.branch.findUnique({
      where: { id: branchId }
    });

    if (!existing) {
      throw new NotFoundError('Branch');
    }

    const { name, code, address, phone, email, isActive, settings } = data;

    // Check for duplicate code
    if (code && code !== existing.code) {
      const duplicate = await tenantPrisma.branch.findFirst({
        where: { code, id: { not: branchId } }
      });
      if (duplicate) {
        throw new ConflictError('Branch with this code already exists');
      }
    }

    // Check for duplicate name
    if (name && name !== existing.name) {
      const duplicate = await tenantPrisma.branch.findFirst({
        where: { name, id: { not: branchId } }
      });
      if (duplicate) {
        throw new ConflictError('Branch with this name already exists');
      }
    }

    const branch = await tenantPrisma.branch.update({
      where: { id: branchId },
      data: {
        ...(name && { name }),
        ...(code && { code }),
        ...(address !== undefined && { address }),
        ...(phone !== undefined && { phone }),
        ...(email !== undefined && { email }),
        ...(isActive !== undefined && { isActive }),
        ...(settings !== undefined && { settings })
      }
    });

    return {
      id: branch.id,
      name: branch.name,
      code: branch.code,
      address: branch.address,
      phone: branch.phone,
      email: branch.email,
      isActive: branch.isActive,
      settings: branch.settings,
      createdAt: branch.createdAt,
      updatedAt: branch.updatedAt
    };
  }

  /**
   * Delete branch
   */
  async deleteBranch(tenantDb, id) {
    const tenantPrisma = getTenantPrisma(tenantDb);
    const branchId = parseInt(id);

    const branch = await tenantPrisma.branch.findUnique({
      where: { id: branchId },
      include: {
        _count: {
          select: { orders: true, users: true }
        }
      }
    });

    if (!branch) {
      throw new NotFoundError('Branch');
    }

    // Prevent deletion if branch has orders
    if (branch._count.orders > 0) {
      throw new BadRequestError('Cannot delete branch with existing orders. Deactivate it instead.');
    }

    // Delete branch users first
    await tenantPrisma.branchUser.deleteMany({
      where: { branchId }
    });

    // Delete the branch
    await tenantPrisma.branch.delete({
      where: { id: branchId }
    });

    return { success: true };
  }

  /**
   * Add user to branch
   */
  async addUserToBranch(tenantDb, companyId, branchId, data) {
    const tenantPrisma = getTenantPrisma(tenantDb);
    const { systemUserId, roleId } = data;

    // Verify branch exists
    const branch = await tenantPrisma.branch.findUnique({
      where: { id: parseInt(branchId) }
    });

    if (!branch) {
      throw new NotFoundError('Branch');
    }

    // Verify system user exists and belongs to the company
    const systemUser = await systemPrisma.systemUser.findUnique({
      where: { id: systemUserId }
    });

    if (!systemUser || systemUser.companyId !== companyId) {
      throw new NotFoundError('User not found or does not belong to this company');
    }

    // Verify role exists and belongs to the company
    if (roleId) {
      const role = await systemPrisma.role.findUnique({
        where: { id: roleId }
      });

      if (!role || role.companyId !== companyId) {
        throw new NotFoundError('Role not found or does not belong to this company');
      }
    }

    // Check if user is already assigned to this branch
    const existing = await tenantPrisma.branchUser.findFirst({
      where: { systemUserId, branchId: parseInt(branchId) }
    });

    if (existing) {
      throw new ConflictError('User is already assigned to this branch');
    }

    // Create branch user
    const branchUser = await tenantPrisma.branchUser.create({
      data: {
        systemUserId,
        branchId: parseInt(branchId),
        roleId,
        isActive: true
      }
    });

    return {
      id: branchUser.id,
      systemUserId: branchUser.systemUserId,
      branchId: branchUser.branchId,
      roleId: branchUser.roleId,
      isActive: branchUser.isActive,
      createdAt: branchUser.createdAt
    };
  }

  /**
   * Remove user from branch
   */
  async removeUserFromBranch(tenantDb, branchId, branchUserId) {
    const tenantPrisma = getTenantPrisma(tenantDb);

    const branchUser = await tenantPrisma.branchUser.findUnique({
      where: { id: parseInt(branchUserId) }
    });

    if (!branchUser || branchUser.branchId !== parseInt(branchId)) {
      throw new NotFoundError('Branch user not found');
    }

    await tenantPrisma.branchUser.delete({
      where: { id: parseInt(branchUserId) }
    });

    return { success: true };
  }

  /**
   * Update user's role in branch
   */
  async updateBranchUserRole(tenantDb, companyId, branchId, branchUserId, roleId) {
    const tenantPrisma = getTenantPrisma(tenantDb);

    const branchUser = await tenantPrisma.branchUser.findUnique({
      where: { id: parseInt(branchUserId) }
    });

    if (!branchUser || branchUser.branchId !== parseInt(branchId)) {
      throw new NotFoundError('Branch user not found');
    }

    // Verify role exists and belongs to the company
    if (roleId) {
      const role = await systemPrisma.role.findUnique({
        where: { id: roleId }
      });

      if (!role || role.companyId !== companyId) {
        throw new NotFoundError('Role not found or does not belong to this company');
      }
    }

    const updated = await tenantPrisma.branchUser.update({
      where: { id: parseInt(branchUserId) },
      data: { roleId }
    });

    return {
      id: updated.id,
      systemUserId: updated.systemUserId,
      branchId: updated.branchId,
      roleId: updated.roleId,
      isActive: updated.isActive,
      updatedAt: updated.updatedAt
    };
  }

  /**
   * Get branch statistics
   */
  async getBranchStats(tenantDb, branchId) {
    const tenantPrisma = getTenantPrisma(tenantDb);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalOrders,
      todayOrders,
      totalProducts,
      activeUsers
    ] = await Promise.all([
      tenantPrisma.order.count({ where: { branchId: parseInt(branchId) } }),
      tenantPrisma.order.count({
        where: {
          branchId: parseInt(branchId),
          createdAt: { gte: today }
        }
      }),
      tenantPrisma.product.count({ where: { branchId: parseInt(branchId) } }),
      tenantPrisma.branchUser.count({
        where: {
          branchId: parseInt(branchId),
          isActive: true
        }
      })
    ]);

    // Calculate today's revenue
    const todayRevenue = await tenantPrisma.order.aggregate({
      where: {
        branchId: parseInt(branchId),
        createdAt: { gte: today },
        status: { in: ['completed', 'invoiced'] }
      },
      _sum: { grandTotal: true }
    });

    return {
      totalOrders,
      todayOrders,
      totalProducts,
      activeUsers,
      todayRevenue: todayRevenue._sum.grandTotal || 0
    };
  }

  /**
   * Generate branch code from name
   */
  generateBranchCode(name) {
    return name
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .substring(0, 6) + Math.random().toString(36).substring(2, 5).toUpperCase();
  }
}

module.exports = new BranchService();

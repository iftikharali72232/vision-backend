const bcrypt = require('bcryptjs');
const prisma = require('../config/database');
const { bcrypt: bcryptConfig, pagination: paginationConfig } = require('../config/constants');
const { NotFoundError, ConflictError } = require('../middlewares/errorHandler');

class UserService {
  /**
   * Get paginated list of users
   */
  async getUsers(query) {
    const {
      page = paginationConfig.defaultPage,
      per_page = paginationConfig.defaultPerPage,
      search,
      role,
      branch_id,
      status,
      sort_by = 'created_at',
      sort_order = 'desc'
    } = query;

    const skip = (page - 1) * per_page;
    const take = Math.min(per_page, paginationConfig.maxPerPage);

    // Build where clause
    const where = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } }
      ];
    }

    if (role) {
      where.branchAccess = {
        some: { role: role }
      };
    }

    if (status) {
      where.isActive = status === 'active';
    }

    if (branch_id) {
      where.branchAccess = {
        some: { branchId: parseInt(branch_id) }
      };
    }

    // Build order by
    const orderBy = {};
    const sortField = sort_by === 'name' ? 'name' : sort_by === 'email' ? 'email' : 'createdAt';
    orderBy[sortField] = sort_order;

    // Get users and count
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          branchAccess: {
            include: {
              branch: {
                select: { id: true, name: true }
              }
            }
          }
        }
      }),
      prisma.user.count({ where })
    ]);

    // Format response
    const items = users.map(user => {
      const primaryAccess = user.branchAccess[0];
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: primaryAccess?.role || 'cashier',
        role_name: this.getRoleName(primaryAccess?.role),
        phone: user.phone,
        avatar: user.avatar,
        is_active: user.isActive,
        branches: user.branchAccess.map(ub => ({
          id: ub.branch.id,
          name: ub.branch.name,
          role: ub.role
        })),
        last_login_at: user.lastLoginAt,
        created_at: user.createdAt
      };
    });

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
   * Get user by ID
   */
  async getUserById(id) {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(id) },
      include: {
        branchAccess: {
          include: {
            branch: { select: { id: true, name: true } }
          }
        }
      }
    });

    if (!user) {
      throw new NotFoundError('User');
    }

    // Get user stats
    const stats = await this.getUserStats(user.id);
    const primaryAccess = user.branchAccess[0];
    const role = primaryAccess?.role || 'cashier';

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: role,
      role_name: this.getRoleName(role),
      phone: user.phone,
      avatar: user.avatar,
      is_active: user.isActive,
      branches: user.branchAccess.map(ub => ({
        id: ub.branch.id,
        name: ub.branch.name,
        role: ub.role
      })),
      permissions: this.getPermissions(role),
      stats,
      last_login_at: user.lastLoginAt,
      created_at: user.createdAt,
      updated_at: user.updatedAt
    };
  }

  /**
   * Create new user
   */
  async createUser(data) {
    const { name, email, password, role = 'cashier', phone, branch_ids = [], is_active = true } = data;

    // Check if email exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      throw new ConflictError('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, bcryptConfig.saltRounds);

    // Create user with branch access
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        phone,
        isActive: is_active,
        isVerified: true, // Admin-created users are verified
        branchAccess: {
          create: branch_ids.map(branchId => ({
            branchId: parseInt(branchId),
            role: role,
            isActive: true
          }))
        }
      },
      include: {
        branchAccess: {
          include: {
            branch: { select: { id: true, name: true } }
          }
        }
      }
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: role,
      phone: user.phone,
      is_active: user.isActive,
      branches: user.branchAccess.map(ub => ({
        id: ub.branch.id,
        name: ub.branch.name,
        role: ub.role
      })),
      created_at: user.createdAt
    };
  }

  /**
   * Update user
   */
  async updateUser(id, data) {
    const userId = parseInt(id);
    const { name, email, role, phone, branch_ids, is_active } = data;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!existingUser) {
      throw new NotFoundError('User');
    }

    // Check if email is taken by another user
    if (email && email !== existingUser.email) {
      const emailTaken = await prisma.user.findUnique({
        where: { email }
      });
      if (emailTaken) {
        throw new ConflictError('Email is already taken');
      }
    }

    // Update user
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (is_active !== undefined) updateData.isActive = is_active;

    // Update branches if provided
    if (branch_ids !== undefined) {
      // Delete existing branch access
      await prisma.userBranchAccess.deleteMany({
        where: { userId }
      });

      // Create new branch access
      if (branch_ids.length > 0) {
        await prisma.userBranchAccess.createMany({
          data: branch_ids.map(branchId => ({
            userId,
            branchId: parseInt(branchId),
            role: role || 'cashier',
            isActive: true
          }))
        });
      }
    } else if (role) {
      // If only role is provided, update existing branch access roles
      await prisma.userBranchAccess.updateMany({
        where: { userId },
        data: { role: role }
      });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      include: {
        branchAccess: {
          include: {
            branch: { select: { id: true, name: true } }
          }
        }
      }
    });

    const primaryAccess = user.branchAccess[0];

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: primaryAccess?.role || 'cashier',
      phone: user.phone,
      is_active: user.isActive,
      branches: user.branchAccess.map(ub => ({
        id: ub.branch.id,
        name: ub.branch.name,
        role: ub.role
      })),
      updated_at: user.updatedAt
    };
  }

  /**
   * Delete user
   */
  async deleteUser(id) {
    const userId = parseInt(id);

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new NotFoundError('User');
    }

    await prisma.user.delete({
      where: { id: userId }
    });

    return { message: 'User deleted successfully' };
  }

  /**
   * Reset user password
   */
  async resetPassword(id, newPassword) {
    const userId = parseInt(id);

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new NotFoundError('User');
    }

    const hashedPassword = await bcrypt.hash(newPassword, bcryptConfig.saltRounds);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    // Revoke all tokens
    await prisma.token.updateMany({
      where: { userId },
      data: { isRevoked: true }
    });

    return { message: 'Password reset successfully' };
  }

  /**
   * Get user stats
   */
  async getUserStats(userId) {
    try {
      const [orderStats] = await prisma.$queryRaw`
        SELECT 
          COUNT(*) as total_orders,
          COALESCE(SUM(total), 0) as total_sales
        FROM orders
        WHERE user_id = ${userId} AND status = 'completed'
      `;

      const totalOrders = Number(orderStats?.total_orders || 0);
      const totalSales = Number(orderStats?.total_sales || 0);

      return {
        total_orders: totalOrders,
        total_sales: totalSales,
        avg_order_value: totalOrders > 0 ? totalSales / totalOrders : 0
      };
    } catch (e) {
      return {
        total_orders: 0,
        total_sales: 0,
        avg_order_value: 0
      };
    }
  }

  /**
   * Get permissions for role
   */
  getPermissions(role) {
    const { permissions } = require('../config/constants');
    return permissions[role] || [];
  }

  /**
   * Get role display name
   */
  getRoleName(role) {
    const roleNames = {
      super_admin: 'Super Admin',
      admin: 'Administrator',
      owner: 'Owner',
      manager: 'Manager',
      cashier: 'Cashier',
      receptionist: 'Receptionist',
      waiter: 'Waiter',
      kitchen: 'Kitchen Staff'
    };
    return roleNames[role] || role;
  }
}

module.exports = new UserService();

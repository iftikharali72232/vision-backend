const bcrypt = require('bcryptjs');
const { systemPrisma } = require('../config/database');
const { getCurrentPrisma } = require('../middlewares/requestContext');
const prisma = new Proxy({}, { get: (_, prop) => getCurrentPrisma()[prop] });
const { bcrypt: bcryptConfig, pagination: paginationConfig } = require('../config/constants');
const { NotFoundError, ConflictError, BadRequestError } = require('../middlewares/errorHandler');

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
      where.roleId = parseInt(role);
    }

    if (status) {
      where.isActive = status === 'active';
    }

    if (branch_id) {
      where.branchId = parseInt(branch_id);
    }

    // Build order by
    const orderBy = {};
    const sortField = sort_by === 'name' ? 'name' : sort_by === 'email' ? 'email' : 'createdAt';
    orderBy[sortField] = sort_order;

    // Get users and count
    const [users, total] = await Promise.all([
      prisma.branchUser.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          branch: {
            select: { id: true, name: true }
          }
        }
      }),
      prisma.branchUser.count({ where })
    ]);

    // Get role names from system database
    const roleIds = [...new Set(users.map(u => u.roleId))];
    const roles = await systemPrisma.role.findMany({
      where: { id: { in: roleIds } },
      select: { id: true, name: true, code: true }
    });
    const roleMap = Object.fromEntries(roles.map(r => [r.id, r]));

    // Format response
    const items = users.map(user => {
      const role = roleMap[user.roleId];
      return {
        id: user.id,
        system_user_id: user.systemUserId,
        name: user.name,
        email: user.email,
        role_id: user.roleId,
        role_code: role?.code || 'unknown',
        role_name: role?.name || 'Unknown',
        phone: user.phone,
        avatar: user.avatar,
        is_active: user.isActive,
        branch: {
          id: user.branch.id,
          name: user.branch.name
        },
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
   * Get user by ID (branch user ID or system user ID)
   */
  async getUserById(companyId, tenantDb, id) {
    // Try to find by branch user ID first
    let user = await prisma.branchUser.findUnique({
      where: { id: parseInt(id) },
      include: {
        branch: { select: { id: true, name: true } }
      }
    });

    // If not found, try finding by system user ID
    if (!user) {
      user = await prisma.branchUser.findFirst({
        where: { systemUserId: parseInt(id) },
        include: {
          branch: { select: { id: true, name: true } }
        }
      });
    }

    if (!user) {
      throw new NotFoundError('User');
    }

    // Get role from system database
    const role = await systemPrisma.role.findUnique({
      where: { id: user.roleId }
    });

    return {
      id: user.id,
      system_user_id: user.systemUserId,
      name: user.name,
      email: user.email,
      role_id: user.roleId,
      role_code: role?.code || 'unknown',
      role_name: role?.name || 'Unknown',
      phone: user.phone,
      avatar: user.avatar,
      is_active: user.isActive,
      branch: {
        id: user.branch.id,
        name: user.branch.name
      },
      created_at: user.createdAt,
      updated_at: user.updatedAt
    };
  }

  /**
   * Create new user
   */
  async createUser(companyId, tenantDb, data) {
    const { name, email, password, role_id, phone, branch_ids = [], is_active = true } = data;

    // Get role from system database
    const role = await systemPrisma.role.findUnique({
      where: { id: parseInt(role_id) }
    });

    if (!role) {
      throw new BadRequestError('Invalid role');
    }

    // Check if user exists in system database first
    let systemUser = await systemPrisma.systemUser.findUnique({
      where: { email }
    });

    // If no system user exists, create one
    if (!systemUser) {
      const hashedPassword = await bcrypt.hash(password, bcryptConfig.saltRounds);
      systemUser = await systemPrisma.systemUser.create({
        data: {
          companyId,
          email,
          password: hashedPassword,
          name,
          phone,
          status: 'active',
          isMaster: false
        }
      });
    }

    // Check if branch user already exists
    if (branch_ids.length > 0) {
      const existingBranchUser = await prisma.branchUser.findFirst({
        where: {
          systemUserId: systemUser.id,
          branchId: { in: branch_ids.map(id => parseInt(id)) }
        }
      });

      if (existingBranchUser) {
        throw new ConflictError('User is already assigned to one of the selected branches');
      }
    }

    // Create branch users for each branch
    const branchUsers = [];
    for (const branchId of branch_ids) {
      const branchUser = await prisma.branchUser.create({
        data: {
          branchId: parseInt(branchId),
          systemUserId: systemUser.id,
          roleId: role.id,
          name,
          email,
          phone,
          isActive: is_active
        },
        include: {
          branch: { select: { id: true, name: true } }
        }
      });
      branchUsers.push(branchUser);
    }

    const primaryBranchUser = branchUsers[0];

    return {
      id: primaryBranchUser.id,
      system_user_id: systemUser.id,
      name: primaryBranchUser.name,
      email: primaryBranchUser.email,
      role_id: role.id,
      role_code: role.code,
      role_name: role.name,
      phone: primaryBranchUser.phone,
      is_active: primaryBranchUser.isActive,
      branches: branchUsers.map(bu => ({
        id: bu.branch.id,
        name: bu.branch.name
      })),
      created_at: primaryBranchUser.createdAt
    };
  }

  /**
   * Update user
   */
  async updateUser(id, data) {
    const userId = parseInt(id);
    const { name, email, role_id, phone, branch_ids, is_active } = data;

    // Get role if role_id is provided
    let role = null;
    if (role_id) {
      role = await systemPrisma.role.findUnique({
        where: { id: parseInt(role_id) }
      });
      if (!role) {
        throw new BadRequestError('Invalid role');
      }
    }

    // Check if user exists
    const existingUser = await prisma.branchUser.findUnique({
      where: { id: userId }
    });

    if (!existingUser) {
      throw new NotFoundError('User');
    }

    // Check if email is taken by another user in the same branch
    if (email && email !== existingUser.email) {
      const emailTaken = await prisma.branchUser.findFirst({
        where: {
          email,
          branchId: existingUser.branchId,
          id: { not: userId }
        }
      });
      if (emailTaken) {
        throw new ConflictError('Email is already taken by another user in this branch');
      }
    }

    // Update branch user
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (is_active !== undefined) updateData.isActive = is_active;
    if (role_id !== undefined) updateData.roleId = parseInt(role_id);

    const user = await prisma.branchUser.update({
      where: { id: userId },
      data: updateData,
      include: {
        branch: { select: { id: true, name: true } }
      }
    });

    // Get updated role
    const updatedRole = role || await systemPrisma.role.findUnique({
      where: { id: user.roleId }
    });

    return {
      id: user.id,
      system_user_id: user.systemUserId,
      name: user.name,
      email: user.email,
      role_id: user.roleId,
      role_code: updatedRole?.code || 'unknown',
      role_name: updatedRole?.name || 'Unknown',
      phone: user.phone,
      is_active: user.isActive,
      branch: {
        id: user.branch.id,
        name: user.branch.name
      },
      updated_at: user.updatedAt
    };
  }

  /**
   * Delete user
   */
  async deleteUser(id) {
    const userId = parseInt(id);

    const user = await prisma.branchUser.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new NotFoundError('User');
    }

    await prisma.branchUser.delete({
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

/**
 * User Service
 * Handles all user-related business logic for multi-tenant system
 */

const bcrypt = require('bcryptjs');
const { systemPrisma, getTenantPrisma } = require('../config/database');
const { pagination: paginationConfig, bcrypt: bcryptConfig } = require('../config/constants');
const { NotFoundError, ConflictError, BadRequestError, AuthenticationError } = require('../middlewares/errorHandler');

class UserService {
  /**
   * Get paginated list of users for a company
   */
  async getUsers(companyId, tenantDb, query) {
    const {
      page = paginationConfig.defaultPage,
      per_page = paginationConfig.defaultPerPage,
      search,
      status,
      branchId
    } = query;

    const skip = (page - 1) * per_page;
    const take = Math.min(per_page, paginationConfig.maxPerPage);

    const where = { companyId };

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } }
      ];
    }

    if (status) {
      where.status = status.toUpperCase();
    }

    // Get system users
    const [users, total] = await Promise.all([
      systemPrisma.systemUser.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          avatar: true,
          status: true,
          isMaster: true,
          emailVerifiedAt: true,
          createdAt: true
        }
      }),
      systemPrisma.systemUser.count({ where })
    ]);

    // Get branch assignments from tenant database
    const tenantPrisma = getTenantPrisma(tenantDb);
    const userIds = users.map(u => u.id);
    
    const branchUsers = await tenantPrisma.branchUser.findMany({
      where: {
        systemUserId: { in: userIds },
        ...(branchId && { branchId: parseInt(branchId) })
      },
      include: {
        branch: {
          select: { id: true, name: true }
        }
      }
    });

    // Get role details
    const roleIds = [...new Set(branchUsers.map(bu => bu.roleId).filter(Boolean))];
    const roles = await systemPrisma.role.findMany({
      where: { id: { in: roleIds } },
      select: { id: true, name: true, code: true }
    });

    // Map users with branch and role data
    const items = users.map(user => {
      const userBranches = branchUsers.filter(bu => bu.systemUserId === user.id);
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        status: user.status,
        isMaster: user.isMaster,
        isVerified: user.isVerified,
        branches: userBranches.map(bu => ({
          branchId: bu.branch.id,
          branchName: bu.branch.name,
          role: roles.find(r => r.id === bu.roleId) || null,
          isActive: bu.isActive
        })),
        createdAt: user.createdAt
      };
    });

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
   * Get user by ID
   */
  async getUserById(companyId, tenantDb, userId) {
    const user = await systemPrisma.systemUser.findUnique({
      where: { id: parseInt(userId) },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatar: true,
        status: true,
        isMaster: true,
        isVerified: true,
        companyId: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user || user.companyId !== companyId) {
      throw new NotFoundError('User');
    }

    // Get branch assignments
    const tenantPrisma = getTenantPrisma(tenantDb);
    const branchUsers = await tenantPrisma.branchUser.findMany({
      where: { systemUserId: user.id },
      include: {
        branch: {
          select: { id: true, name: true, code: true }
        }
      }
    });

    // Get role details
    const roleIds = branchUsers.map(bu => bu.roleId).filter(Boolean);
    const roles = await systemPrisma.role.findMany({
      where: { id: { in: roleIds } },
      select: { id: true, name: true, code: true }
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      avatar: user.avatar,
      status: user.status,
      isMaster: user.isMaster,
      isVerified: user.isVerified,
      branches: branchUsers.map(bu => ({
        branchUserId: bu.id,
        branchId: bu.branch.id,
        branchName: bu.branch.name,
        branchCode: bu.branch.code,
        role: roles.find(r => r.id === bu.roleId) || null,
        isActive: bu.isActive,
        createdAt: bu.createdAt
      })),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  }

  /**
   * Create new user
   */
  async createUser(companyId, tenantDb, data) {
    const { name, email, phone, password, branchId, roleId, avatar } = data;

    // Check for duplicate email
    const existingEmail = await systemPrisma.systemUser.findFirst({
      where: { email }
    });
    if (existingEmail) {
      throw new ConflictError('User with this email already exists');
    }

    // Check for duplicate phone
    if (phone) {
      const existingPhone = await systemPrisma.systemUser.findFirst({
        where: { phone }
      });
      if (existingPhone) {
        throw new ConflictError('User with this phone already exists');
      }
    }

    // Verify role belongs to company
    if (roleId) {
      const role = await systemPrisma.role.findUnique({
        where: { id: roleId }
      });
      if (!role || role.companyId !== companyId) {
        throw new NotFoundError('Role not found or does not belong to this company');
      }
    }

    // Verify branch exists
    if (branchId) {
      const tenantPrisma = getTenantPrisma(tenantDb);
      const branch = await tenantPrisma.branch.findUnique({
        where: { id: parseInt(branchId) }
      });
      if (!branch) {
        throw new NotFoundError('Branch');
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, bcryptConfig.saltRounds);

    // Create system user
    const user = await systemPrisma.systemUser.create({
      data: {
        name,
        email,
        phone,
        password: hashedPassword,
        avatar,
        companyId,
        isMaster: false,
        isVerified: true, // Users created by admin are pre-verified
        status: 'ACTIVE'
      }
    });

    // Assign to branch if provided
    if (branchId) {
      const tenantPrisma = getTenantPrisma(tenantDb);
      await tenantPrisma.branchUser.create({
        data: {
          systemUserId: user.id,
          branchId: parseInt(branchId),
          roleId,
          isActive: true
        }
      });
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      avatar: user.avatar,
      status: user.status,
      isMaster: user.isMaster,
      createdAt: user.createdAt
    };
  }

  /**
   * Update user
   */
  async updateUser(companyId, tenantDb, userId, data) {
    const user = await systemPrisma.systemUser.findUnique({
      where: { id: parseInt(userId) }
    });

    if (!user || user.companyId !== companyId) {
      throw new NotFoundError('User');
    }

    const { name, email, phone, avatar, status } = data;

    // Check for duplicate email
    if (email && email !== user.email) {
      const existingEmail = await systemPrisma.systemUser.findFirst({
        where: { email, id: { not: user.id } }
      });
      if (existingEmail) {
        throw new ConflictError('User with this email already exists');
      }
    }

    // Check for duplicate phone
    if (phone && phone !== user.phone) {
      const existingPhone = await systemPrisma.systemUser.findFirst({
        where: { phone, id: { not: user.id } }
      });
      if (existingPhone) {
        throw new ConflictError('User with this phone already exists');
      }
    }

    const updated = await systemPrisma.systemUser.update({
      where: { id: parseInt(userId) },
      data: {
        ...(name && { name }),
        ...(email && { email }),
        ...(phone !== undefined && { phone }),
        ...(avatar !== undefined && { avatar }),
        ...(status && { status: status.toUpperCase() })
      }
    });

    return {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      phone: updated.phone,
      avatar: updated.avatar,
      status: updated.status,
      isMaster: updated.isMaster,
      updatedAt: updated.updatedAt
    };
  }

  /**
   * Delete user
   */
  async deleteUser(companyId, tenantDb, userId) {
    const user = await systemPrisma.systemUser.findUnique({
      where: { id: parseInt(userId) }
    });

    if (!user || user.companyId !== companyId) {
      throw new NotFoundError('User');
    }

    if (user.isMaster) {
      throw new BadRequestError('Cannot delete master user');
    }

    // Delete branch assignments
    const tenantPrisma = getTenantPrisma(tenantDb);
    await tenantPrisma.branchUser.deleteMany({
      where: { systemUserId: parseInt(userId) }
    });

    // Revoke all tokens
    await systemPrisma.token.updateMany({
      where: { userId: parseInt(userId) },
      data: { isRevoked: true }
    });

    // Delete user
    await systemPrisma.systemUser.delete({
      where: { id: parseInt(userId) }
    });

    return { success: true };
  }

  /**
   * Reset user password
   */
  async resetPassword(companyId, userId, newPassword) {
    const user = await systemPrisma.systemUser.findUnique({
      where: { id: parseInt(userId) }
    });

    if (!user || user.companyId !== companyId) {
      throw new NotFoundError('User');
    }

    const hashedPassword = await bcrypt.hash(newPassword, bcryptConfig.saltRounds);

    await systemPrisma.systemUser.update({
      where: { id: parseInt(userId) },
      data: { password: hashedPassword }
    });

    // Revoke all tokens to force re-login
    await systemPrisma.token.updateMany({
      where: { userId: parseInt(userId) },
      data: { isRevoked: true }
    });

    return { success: true };
  }

  /**
   * Toggle user status
   */
  async toggleUserStatus(companyId, userId) {
    const user = await systemPrisma.systemUser.findUnique({
      where: { id: parseInt(userId) }
    });

    if (!user || user.companyId !== companyId) {
      throw new NotFoundError('User');
    }

    if (user.isMaster) {
      throw new BadRequestError('Cannot deactivate master user');
    }

    const newStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

    const updated = await systemPrisma.systemUser.update({
      where: { id: parseInt(userId) },
      data: { status: newStatus }
    });

    // If deactivating, revoke all tokens
    if (newStatus === 'INACTIVE') {
      await systemPrisma.token.updateMany({
        where: { userId: parseInt(userId) },
        data: { isRevoked: true }
      });
    }

    return {
      id: updated.id,
      status: updated.status
    };
  }

  /**
   * Get user's permissions
   */
  async getUserPermissions(companyId, tenantDb, userId) {
    const user = await systemPrisma.systemUser.findUnique({
      where: { id: parseInt(userId) }
    });

    if (!user || user.companyId !== companyId) {
      throw new NotFoundError('User');
    }

    // Master users have all permissions
    if (user.isMaster) {
      const allMenus = await systemPrisma.systemMenu.findMany({
        where: { isActive: true }
      });
      
      const actions = ['VIEW', 'CREATE', 'UPDATE', 'DELETE', 'EXPORT'];
      return allMenus.flatMap(menu => 
        actions.map(action => ({
          menu: menu.code,
          action: action.toLowerCase(),
          permission: `${menu.code}.${action.toLowerCase()}`
        }))
      );
    }

    // Get branch user's role
    const tenantPrisma = getTenantPrisma(tenantDb);
    const branchUser = await tenantPrisma.branchUser.findFirst({
      where: { systemUserId: user.id, isActive: true }
    });

    if (!branchUser || !branchUser.roleId) {
      return [];
    }

    // Get role permissions
    const rolePermissions = await systemPrisma.rolePermission.findMany({
      where: { roleId: branchUser.roleId },
      include: { menu: true }
    });

    return rolePermissions.map(rp => ({
      menu: rp.menu.code,
      action: rp.action.toLowerCase(),
      permission: `${rp.menu.code}.${rp.action.toLowerCase()}`
    }));
  }
}

module.exports = new UserService();

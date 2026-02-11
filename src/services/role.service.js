/**
 * Role Service
 * Handles role management and permission assignment
 * Roles are stored in system database, per company
 */

const { systemPrisma } = require('../config/database');
const { NotFoundError, AppError } = require('../middlewares/errorHandler');

class RoleService {
  /**
   * Get all roles for a company
   * @param {number} companyId - Company ID
   * @param {object} options - Query options
   * @returns {object} Paginated roles list
   */
  async getRoles(companyId, options = {}) {
    const { page = 1, perPage = 20, includePermissions = false } = options;
    const skip = (page - 1) * perPage;

    const where = { companyId };

    const [roles, total] = await Promise.all([
      systemPrisma.role.findMany({
        where,
        include: includePermissions ? {
          permissions: {
            include: { menu: true }
          }
        } : undefined,
        skip,
        take: perPage,
        orderBy: { name: 'asc' }
      }),
      systemPrisma.role.count({ where })
    ]);

    return {
      items: roles.map(role => this.formatRole(role)),
      pagination: {
        page,
        per_page: perPage,
        total,
        total_pages: Math.ceil(total / perPage)
      }
    };
  }

  /**
   * Get single role by ID
   * @param {number} companyId - Company ID
   * @param {number} roleId - Role ID
   * @returns {object} Role with permissions
   */
  async getRoleById(companyId, roleId) {
    const role = await systemPrisma.role.findFirst({
      where: {
        id: parseInt(roleId),
        companyId
      },
      include: {
        permissions: {
          include: { menu: true }
        }
      }
    });

    if (!role) {
      throw new NotFoundError('Role');
    }

    return this.formatRoleWithPermissions(role);
  }

  /**
   * Create new role
   * @param {number} companyId - Company ID
   * @param {object} data - Role data
   * @returns {object} Created role
   */
  async createRole(companyId, data) {
    const { name, code, description, permissions = [] } = data;

    // Check if code already exists for this company
    const existing = await systemPrisma.role.findFirst({
      where: { companyId, code }
    });

    if (existing) {
      throw new AppError('Role code already exists', 409, 'ROLE_001');
    }

    // Create role with permissions in transaction
    const role = await systemPrisma.$transaction(async (tx) => {
      // Create role
      const newRole = await tx.role.create({
        data: {
          companyId,
          name,
          code,
          description,
          isSystem: false,
          isActive: true
        }
      });

      // Create permissions if provided
      if (permissions.length > 0) {
        const permissionsData = permissions.map(p => ({
          roleId: newRole.id,
          menuId: p.menu_id,
          canView: p.can_view || false,
          canCreate: p.can_create || false,
          canUpdate: p.can_update || false,
          canDelete: p.can_delete || false,
          canExport: p.can_export || false,
          canPrint: p.can_print || false
        }));

        await tx.rolePermission.createMany({ data: permissionsData });
      }

      return newRole;
    });

    // Return role with permissions
    return this.getRoleById(companyId, role.id);
  }

  /**
   * Update role
   * @param {number} companyId - Company ID
   * @param {number} roleId - Role ID
   * @param {object} data - Update data
   * @returns {object} Updated role
   */
  async updateRole(companyId, roleId, data) {
    const { name, description, is_active, permissions } = data;

    // Get existing role
    const role = await systemPrisma.role.findFirst({
      where: { id: parseInt(roleId), companyId }
    });

    if (!role) {
      throw new NotFoundError('Role');
    }

    // System roles can't be deleted but can be modified
    if (role.isSystem && is_active === false) {
      throw new AppError('System roles cannot be deactivated', 400, 'ROLE_002');
    }

    await systemPrisma.$transaction(async (tx) => {
      // Update role
      await tx.role.update({
        where: { id: role.id },
        data: {
          name: name || role.name,
          description: description !== undefined ? description : role.description,
          isActive: is_active !== undefined ? is_active : role.isActive
        }
      });

      // Update permissions if provided
      if (permissions) {
        // Delete existing permissions
        await tx.rolePermission.deleteMany({
          where: { roleId: role.id }
        });

        // Create new permissions
        if (permissions.length > 0) {
          const permissionsData = permissions.map(p => ({
            roleId: role.id,
            menuId: p.menu_id,
            canView: p.can_view || false,
            canCreate: p.can_create || false,
            canUpdate: p.can_update || false,
            canDelete: p.can_delete || false,
            canExport: p.can_export || false,
            canPrint: p.can_print || false
          }));

          await tx.rolePermission.createMany({ data: permissionsData });
        }
      }
    });

    return this.getRoleById(companyId, roleId);
  }

  /**
   * Delete role
   * @param {number} companyId - Company ID
   * @param {number} roleId - Role ID
   * @returns {object} Response
   */
  async deleteRole(companyId, roleId) {
    const role = await systemPrisma.role.findFirst({
      where: { id: parseInt(roleId), companyId }
    });

    if (!role) {
      throw new NotFoundError('Role');
    }

    if (role.isSystem) {
      throw new AppError('System roles cannot be deleted', 400, 'ROLE_003');
    }

    // TODO: Check if any users are using this role

    await systemPrisma.role.delete({
      where: { id: role.id }
    });

    return { message: 'Role deleted successfully' };
  }

  /**
   * Update permissions for a role
   * @param {number} companyId - Company ID
   * @param {number} roleId - Role ID
   * @param {array} permissions - Permissions array
   * @returns {object} Updated role
   */
  async updateRolePermissions(companyId, roleId, permissions) {
    const role = await systemPrisma.role.findFirst({
      where: { id: parseInt(roleId), companyId }
    });

    if (!role) {
      throw new NotFoundError('Role');
    }

    await systemPrisma.$transaction(async (tx) => {
      // Delete existing permissions
      await tx.rolePermission.deleteMany({
        where: { roleId: role.id }
      });

      // Create new permissions
      if (permissions.length > 0) {
        const permissionsData = permissions.map(p => ({
          roleId: role.id,
          menuId: p.menu_id,
          canView: p.can_view || false,
          canCreate: p.can_create || false,
          canUpdate: p.can_update || false,
          canDelete: p.can_delete || false,
          canExport: p.can_export || false,
          canPrint: p.can_print || false
        }));

        await tx.rolePermission.createMany({ data: permissionsData });
      }
    });

    return this.getRoleById(companyId, roleId);
  }

  /**
   * Clone a role
   * @param {number} companyId - Company ID
   * @param {number} roleId - Source role ID
   * @param {object} data - New role data
   * @returns {object} New role
   */
  async cloneRole(companyId, roleId, data) {
    const { name, code, description } = data;

    // Get source role with permissions
    const sourceRole = await systemPrisma.role.findFirst({
      where: { id: parseInt(roleId), companyId },
      include: { permissions: true }
    });

    if (!sourceRole) {
      throw new NotFoundError('Source role');
    }

    // Check if new code exists
    const existing = await systemPrisma.role.findFirst({
      where: { companyId, code }
    });

    if (existing) {
      throw new AppError('Role code already exists', 409, 'ROLE_001');
    }

    // Create new role with copied permissions
    const newRole = await systemPrisma.$transaction(async (tx) => {
      const role = await tx.role.create({
        data: {
          companyId,
          name,
          code,
          description: description || sourceRole.description,
          isSystem: false,
          isActive: true
        }
      });

      // Copy permissions
      if (sourceRole.permissions.length > 0) {
        const permissionsData = sourceRole.permissions.map(p => ({
          roleId: role.id,
          menuId: p.menuId,
          canView: p.canView,
          canCreate: p.canCreate,
          canUpdate: p.canUpdate,
          canDelete: p.canDelete,
          canExport: p.canExport,
          canPrint: p.canPrint
        }));

        await tx.rolePermission.createMany({ data: permissionsData });
      }

      return role;
    });

    return this.getRoleById(companyId, newRole.id);
  }

  // ================== HELPER METHODS ==================

  /**
   * Format role for response
   */
  formatRole(role) {
    return {
      id: role.id,
      name: role.name,
      code: role.code,
      description: role.description,
      is_system: role.isSystem,
      is_active: role.isActive,
      created_at: role.createdAt
    };
  }

  /**
   * Format role with permissions for response
   */
  formatRoleWithPermissions(role) {
    return {
      id: role.id,
      name: role.name,
      code: role.code,
      description: role.description,
      is_system: role.isSystem,
      is_active: role.isActive,
      created_at: role.createdAt,
      permissions: role.permissions.map(p => ({
        id: p.id,
        menu_id: p.menuId,
        menu_code: p.menu?.code,
        menu_name: p.menu?.name,
        can_view: p.canView,
        can_create: p.canCreate,
        can_update: p.canUpdate,
        can_delete: p.canDelete,
        can_export: p.canExport,
        can_print: p.canPrint
      }))
    };
  }
}

module.exports = new RoleService();

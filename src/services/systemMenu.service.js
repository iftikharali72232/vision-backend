/**
 * System Menu Service
 * Handles system menu management and user-accessible menu retrieval
 * Menus are stored in system database, shared across all companies
 */

const { systemPrisma } = require('../config/database');
const { NotFoundError, AppError } = require('../middlewares/errorHandler');

class SystemMenuService {
  /**
   * Get all system menus (hierarchical)
   * @param {object} options - Query options
   * @returns {array} Menu tree
   */
  async getAllMenus(options = {}) {
    const { includeInactive = false, type } = options;

    const where = {};
    if (!includeInactive) {
      where.isActive = true;
    }
    if (type) {
      where.type = type;
    }

    const menus = await systemPrisma.systemMenu.findMany({
      where,
      orderBy: [
        { displayOrder: 'asc' },
        { name: 'asc' }
      ]
    });

    // Build hierarchy
    return this.buildMenuTree(menus);
  }

  /**
   * Get menus accessible by a user based on their permissions
   * @param {array} permissions - User's permission strings (e.g., ['pos.view', 'orders.create'])
   * @returns {array} Accessible menu tree
   */
  async getUserAccessibleMenus(permissions) {
    // Extract menu codes from permissions
    const menuCodes = new Set();
    for (const permission of permissions) {
      const menuCode = permission.split('.')[0];
      menuCodes.add(menuCode);
    }

    // Get all menus
    const allMenus = await systemPrisma.systemMenu.findMany({
      where: { isActive: true },
      orderBy: [
        { displayOrder: 'asc' },
        { name: 'asc' }
      ]
    });

    // Filter menus based on permissions
    const accessibleMenus = allMenus.filter(menu => {
      // Check if user has permission for this menu or any parent
      const menuParts = menu.code.split('.');
      for (let i = menuParts.length; i > 0; i--) {
        const checkCode = menuParts.slice(0, i).join('.');
        if (menuCodes.has(checkCode)) {
          return true;
        }
      }
      return false;
    });

    // Build hierarchy
    return this.buildMenuTree(accessibleMenus);
  }

  /**
   * Get menu by ID
   * @param {number} menuId - Menu ID
   * @returns {object} Menu
   */
  async getMenuById(menuId) {
    const menu = await systemPrisma.systemMenu.findUnique({
      where: { id: parseInt(menuId) },
      include: {
        parent: true,
        children: {
          where: { isActive: true },
          orderBy: { displayOrder: 'asc' }
        }
      }
    });

    if (!menu) {
      throw new NotFoundError('Menu');
    }

    return this.formatMenu(menu);
  }

  /**
   * Get menu by code
   * @param {string} code - Menu code
   * @returns {object} Menu
   */
  async getMenuByCode(code) {
    const menu = await systemPrisma.systemMenu.findUnique({
      where: { code },
      include: {
        parent: true,
        children: {
          where: { isActive: true },
          orderBy: { displayOrder: 'asc' }
        }
      }
    });

    if (!menu) {
      throw new NotFoundError('Menu');
    }

    return this.formatMenu(menu);
  }

  /**
   * Create new menu (admin only)
   * @param {object} data - Menu data
   * @returns {object} Created menu
   */
  async createMenu(data) {
    const { parent_id, code, name, name_ar, name_ur, description, type, icon, route, display_order } = data;

    // Check if code exists
    const existing = await systemPrisma.systemMenu.findUnique({
      where: { code }
    });

    if (existing) {
      throw new AppError('Menu code already exists', 409, 'MENU_001');
    }

    const menu = await systemPrisma.systemMenu.create({
      data: {
        parentId: parent_id ? parseInt(parent_id) : null,
        code,
        name,
        nameAr: name_ar,
        nameUr: name_ur,
        description,
        type: type || 'menu',
        icon,
        route,
        displayOrder: display_order || 0,
        isActive: true,
        isSystem: false
      }
    });

    return this.formatMenu(menu);
  }

  /**
   * Update menu
   * @param {number} menuId - Menu ID
   * @param {object} data - Update data
   * @returns {object} Updated menu
   */
  async updateMenu(menuId, data) {
    const menu = await systemPrisma.systemMenu.findUnique({
      where: { id: parseInt(menuId) }
    });

    if (!menu) {
      throw new NotFoundError('Menu');
    }

    // System menus can only have limited updates
    if (menu.isSystem) {
      const allowedFields = ['name', 'name_ar', 'name_ur', 'description', 'icon', 'display_order', 'is_active'];
      const updateFields = Object.keys(data);
      const invalidFields = updateFields.filter(f => !allowedFields.includes(f));
      
      if (invalidFields.length > 0) {
        throw new AppError(`Cannot modify ${invalidFields.join(', ')} for system menus`, 400, 'MENU_002');
      }
    }

    const updated = await systemPrisma.systemMenu.update({
      where: { id: menu.id },
      data: {
        parentId: data.parent_id !== undefined ? (data.parent_id ? parseInt(data.parent_id) : null) : menu.parentId,
        name: data.name || menu.name,
        nameAr: data.name_ar !== undefined ? data.name_ar : menu.nameAr,
        nameUr: data.name_ur !== undefined ? data.name_ur : menu.nameUr,
        description: data.description !== undefined ? data.description : menu.description,
        type: data.type || menu.type,
        icon: data.icon !== undefined ? data.icon : menu.icon,
        route: data.route !== undefined ? data.route : menu.route,
        displayOrder: data.display_order !== undefined ? data.display_order : menu.displayOrder,
        isActive: data.is_active !== undefined ? data.is_active : menu.isActive
      }
    });

    return this.formatMenu(updated);
  }

  /**
   * Delete menu
   * @param {number} menuId - Menu ID
   * @returns {object} Response
   */
  async deleteMenu(menuId) {
    const menu = await systemPrisma.systemMenu.findUnique({
      where: { id: parseInt(menuId) }
    });

    if (!menu) {
      throw new NotFoundError('Menu');
    }

    if (menu.isSystem) {
      throw new AppError('System menus cannot be deleted', 400, 'MENU_003');
    }

    // Check if menu has children
    const childCount = await systemPrisma.systemMenu.count({
      where: { parentId: menu.id }
    });

    if (childCount > 0) {
      throw new AppError('Cannot delete menu with children. Delete children first.', 400, 'MENU_004');
    }

    await systemPrisma.systemMenu.delete({
      where: { id: menu.id }
    });

    return { message: 'Menu deleted successfully' };
  }

  /**
   * Get flat list of menus for permission assignment
   * @returns {array} Flat menu list
   */
  async getMenusForPermissions() {
    const menus = await systemPrisma.systemMenu.findMany({
      where: { isActive: true },
      select: {
        id: true,
        code: true,
        name: true,
        nameAr: true,
        nameUr: true,
        type: true,
        parentId: true
      },
      orderBy: [
        { type: 'asc' },
        { displayOrder: 'asc' }
      ]
    });

    return menus.map(menu => ({
      id: menu.id,
      code: menu.code,
      name: menu.name,
      name_ar: menu.nameAr,
      name_ur: menu.nameUr,
      type: menu.type,
      parent_id: menu.parentId
    }));
  }

  /**
   * Get modules only (top-level menus)
   * @returns {array} Module list
   */
  async getModules() {
    const modules = await systemPrisma.systemMenu.findMany({
      where: {
        isActive: true,
        type: 'module'
      },
      include: {
        children: {
          where: { isActive: true },
          orderBy: { displayOrder: 'asc' }
        }
      },
      orderBy: { displayOrder: 'asc' }
    });

    return modules.map(mod => ({
      id: mod.id,
      code: mod.code,
      name: mod.name,
      name_ar: mod.nameAr,
      name_ur: mod.nameUr,
      icon: mod.icon,
      route: mod.route,
      menus: mod.children.map(child => ({
        id: child.id,
        code: child.code,
        name: child.name,
        name_ar: child.nameAr,
        name_ur: child.nameUr,
        icon: child.icon,
        route: child.route,
        type: child.type
      }))
    }));
  }

  // ================== HELPER METHODS ==================

  /**
   * Build menu tree from flat list
   */
  buildMenuTree(menus) {
    const menuMap = new Map();
    const rootMenus = [];

    // First pass: create map
    for (const menu of menus) {
      menuMap.set(menu.id, {
        ...this.formatMenu(menu),
        children: []
      });
    }

    // Second pass: build tree
    for (const menu of menus) {
      const menuItem = menuMap.get(menu.id);
      
      if (menu.parentId && menuMap.has(menu.parentId)) {
        menuMap.get(menu.parentId).children.push(menuItem);
      } else {
        rootMenus.push(menuItem);
      }
    }

    return rootMenus;
  }

  /**
   * Format menu for response
   */
  formatMenu(menu) {
    return {
      id: menu.id,
      parent_id: menu.parentId,
      code: menu.code,
      name: menu.name,
      name_ar: menu.nameAr,
      name_ur: menu.nameUr,
      description: menu.description,
      type: menu.type,
      icon: menu.icon,
      route: menu.route,
      display_order: menu.displayOrder,
      is_active: menu.isActive,
      is_system: menu.isSystem,
      parent: menu.parent ? {
        id: menu.parent.id,
        code: menu.parent.code,
        name: menu.parent.name
      } : null,
      children: menu.children ? menu.children.map(c => ({
        id: c.id,
        code: c.code,
        name: c.name,
        name_ar: c.nameAr,
        name_ur: c.nameUr,
        icon: c.icon,
        route: c.route,
        type: c.type
      })) : undefined
    };
  }
}

module.exports = new SystemMenuService();

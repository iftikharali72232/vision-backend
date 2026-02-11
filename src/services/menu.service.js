const prisma = require('../config/database');
const { NotFoundError, AppError } = require('../middlewares/errorHandler');

class MenuService {
  /**
   * Get all menus for a branch
   */
  async getMenus(branchId) {
    const menus = await prisma.menu.findMany({
      where: { branchId },
      orderBy: { displayOrder: 'asc' },
      include: {
        _count: { select: { products: true } }
      }
    });

    return menus.map(menu => ({
      id: menu.id,
      name: menu.name,
      description: menu.description,
      type: menu.type,
      is_active: menu.isActive,
      is_default: menu.isDefault,
      available_from: menu.availableFrom,
      available_to: menu.availableTo,
      available_days: menu.availableDays,
      sort_order: menu.displayOrder,
      products_count: menu._count.products,
      created_at: menu.createdAt
    }));
  }

  /**
   * Get active menu for current time
   */
  async getActiveMenu(branchId) {
    const now = new Date();
    const currentDay = now.getDay(); // 0 = Sunday, 6 = Saturday
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM format

    // Try to find a scheduled menu for current time
    let menu = await prisma.menu.findFirst({
      where: {
        branchId,
        isActive: true,
        isDefault: false,
        OR: [
          { availableDays: null },
          { availableDays: { array_contains: currentDay } }
        ]
      },
      include: {
        products: {
          include: {
            product: {
              include: {
                category: { select: { id: true, name: true, color: true } },
                variations: { where: { isActive: true } },
                modifiers: {
                  where: { isActive: true },
                  include: { options: { where: { isActive: true } } }
                },
                stocks: { where: { branchId } }
              }
            }
          },
          orderBy: { displayOrder: 'asc' }
        }
      }
    });

    // If no scheduled menu, get default menu
    if (!menu) {
      menu = await prisma.menu.findFirst({
        where: {
          branchId,
          isActive: true,
          isDefault: true
        },
        include: {
          products: {
            include: {
              product: {
                include: {
                  category: { select: { id: true, name: true, color: true } },
                  variations: { where: { isActive: true } },
                  modifiers: {
                    where: { isActive: true },
                    include: { options: { where: { isActive: true } } }
                  },
                  stocks: { where: { branchId } }
                }
              }
            },
            orderBy: { displayOrder: 'asc' }
          }
        }
      });
    }

    if (!menu) {
      // Return all active products if no menu configured
      return this.getAllProductsAsMenu(branchId);
    }

    return this.formatMenuResponse(menu);
  }

  /**
   * Get all active products as a virtual menu
   */
  async getAllProductsAsMenu(branchId) {
    const products = await prisma.product.findMany({
      where: {
        branchId,
        isActive: true
      },
      include: {
        category: { select: { id: true, name: true, color: true } },
        variations: { where: { isActive: true } },
        modifiers: {
          where: { isActive: true },
          include: { options: { where: { isActive: true } } }
        },
        stocks: { where: { branchId } }
      },
      orderBy: [
        { category: { displayOrder: 'asc' } },
        { displayOrder: 'asc' }
      ]
    });

    // Group by category
    const categoryMap = new Map();
    for (const product of products) {
      const catId = product.categoryId || 0;
      if (!categoryMap.has(catId)) {
        categoryMap.set(catId, {
          category: product.category || { id: 0, name: 'Uncategorized' },
          products: []
        });
      }
      categoryMap.get(catId).products.push(this.formatProductForMenu(product));
    }

    return {
      id: null,
      name: 'All Products',
      description: 'Default menu with all active products',
      type: 'all_day',
      is_default: true,
      categories: Array.from(categoryMap.values())
    };
  }

  /**
   * Get menu by ID
   */
  async getMenuById(id, branchId) {
    const menu = await prisma.menu.findFirst({
      where: { id: parseInt(id), branchId },
      include: {
        products: {
          include: {
            product: {
              include: {
                category: { select: { id: true, name: true, color: true } },
                variations: { where: { isActive: true } },
                modifiers: {
                  where: { isActive: true },
                  include: { options: { where: { isActive: true } } }
                },
                stocks: { where: { branchId } }
              }
            }
          },
          orderBy: { displayOrder: 'asc' }
        }
      }
    });

    if (!menu) {
      throw new NotFoundError('Menu');
    }

    return this.formatMenuResponse(menu);
  }

  /**
   * Create new menu
   */
  async createMenu(data, branchId) {
    const {
      name,
      description,
      type = 'all_day',
      is_active = true,
      is_default = false,
      available_from,
      available_to,
      available_days,
      sort_order,
      products
    } = data;

    // Check for duplicate name
    const existing = await prisma.menu.findFirst({
      where: { branchId, name }
    });

    if (existing) {
      throw new AppError('Menu with this name already exists', 400, 'MENU_EXISTS');
    }

    // Get max sort order if not provided
    let displayOrder = sort_order;
    if (displayOrder === undefined) {
      const maxSort = await prisma.menu.aggregate({
        where: { branchId },
        _max: { displayOrder: true }
      });
      displayOrder = (maxSort._max.displayOrder || 0) + 1;
    }

    // If setting as default, unset other defaults
    if (is_default) {
      await prisma.menu.updateMany({
        where: { branchId, isDefault: true },
        data: { isDefault: false }
      });
    }

    // Create menu
    const menu = await prisma.menu.create({
      data: {
        branchId,
        name,
        description,
        type,
        isActive: is_active,
        isDefault: is_default,
        availableFrom: available_from,
        availableTo: available_to,
        availableDays: available_days,
        displayOrder,
        products: products ? {
          create: products.map((p, index) => ({
            productId: p.product_id,
            customPrice: p.custom_price,
            customName: p.custom_name,
            isActive: p.is_active !== false,
            displayOrder: p.sort_order || index + 1
          }))
        } : undefined
      },
      include: {
        _count: { select: { products: true } }
      }
    });

    return {
      id: menu.id,
      name: menu.name,
      description: menu.description,
      type: menu.type,
      is_active: menu.isActive,
      is_default: menu.isDefault,
      available_from: menu.availableFrom,
      available_to: menu.availableTo,
      available_days: menu.availableDays,
      sort_order: menu.displayOrder,
      products_count: menu._count.products,
      created_at: menu.createdAt
    };
  }

  /**
   * Update menu
   */
  async updateMenu(id, data, branchId) {
    const menu = await prisma.menu.findFirst({
      where: { id: parseInt(id), branchId }
    });

    if (!menu) {
      throw new NotFoundError('Menu');
    }

    const {
      name,
      description,
      type,
      is_active,
      is_default,
      available_from,
      available_to,
      available_days,
      sort_order
    } = data;

    // Check for duplicate name
    if (name && name !== menu.name) {
      const existing = await prisma.menu.findFirst({
        where: { branchId, name, id: { not: parseInt(id) } }
      });

      if (existing) {
        throw new AppError('Menu with this name already exists', 400, 'MENU_EXISTS');
      }
    }

    // If setting as default, unset other defaults
    if (is_default === true && !menu.isDefault) {
      await prisma.menu.updateMany({
        where: { branchId, isDefault: true },
        data: { isDefault: false }
      });
    }

    const updatedMenu = await prisma.menu.update({
      where: { id: parseInt(id) },
      data: {
        name,
        description,
        type,
        isActive: is_active,
        isDefault: is_default,
        availableFrom: available_from,
        availableTo: available_to,
        availableDays: available_days,
        displayOrder: sort_order
      },
      include: {
        _count: { select: { products: true } }
      }
    });

    return {
      id: updatedMenu.id,
      name: updatedMenu.name,
      description: updatedMenu.description,
      type: updatedMenu.type,
      is_active: updatedMenu.isActive,
      is_default: updatedMenu.isDefault,
      available_from: updatedMenu.availableFrom,
      available_to: updatedMenu.availableTo,
      available_days: updatedMenu.availableDays,
      sort_order: updatedMenu.displayOrder,
      products_count: updatedMenu._count.products,
      updated_at: updatedMenu.updatedAt
    };
  }

  /**
   * Delete menu
   */
  async deleteMenu(id, branchId) {
    const menu = await prisma.menu.findFirst({
      where: { id: parseInt(id), branchId }
    });

    if (!menu) {
      throw new NotFoundError('Menu');
    }

    if (menu.isDefault) {
      throw new AppError('Cannot delete default menu', 400, 'CANNOT_DELETE_DEFAULT');
    }

    await prisma.menu.delete({
      where: { id: parseInt(id) }
    });

    return { message: 'Menu deleted successfully' };
  }

  /**
   * Add products to menu
   */
  async addProducts(menuId, products, branchId) {
    const menu = await prisma.menu.findFirst({
      where: { id: parseInt(menuId), branchId }
    });

    if (!menu) {
      throw new NotFoundError('Menu');
    }

    // Get current max sort order
    const maxSort = await prisma.menuProduct.aggregate({
      where: { menuId: parseInt(menuId) },
      _max: { displayOrder: true }
    });
    let currentSort = maxSort._max.displayOrder || 0;

    // Add products
    const menuProducts = await prisma.$transaction(
      products.map(p => 
        prisma.menuProduct.upsert({
          where: {
            menuId_productId: {
              menuId: parseInt(menuId),
              productId: p.product_id
            }
          },
          update: {
            customPrice: p.custom_price,
            customName: p.custom_name,
            isActive: p.is_active !== false
          },
          create: {
            menuId: parseInt(menuId),
            productId: p.product_id,
            customPrice: p.custom_price,
            customName: p.custom_name,
            isActive: p.is_active !== false,
            displayOrder: p.sort_order || ++currentSort
          }
        })
      )
    );

    return {
      message: 'Products added to menu successfully',
      count: menuProducts.length
    };
  }

  /**
   * Remove product from menu
   */
  async removeProduct(menuId, productId, branchId) {
    const menu = await prisma.menu.findFirst({
      where: { id: parseInt(menuId), branchId }
    });

    if (!menu) {
      throw new NotFoundError('Menu');
    }

    const menuProduct = await prisma.menuProduct.findUnique({
      where: {
        menuId_productId: {
          menuId: parseInt(menuId),
          productId: parseInt(productId)
        }
      }
    });

    if (!menuProduct) {
      throw new NotFoundError('Menu product');
    }

    await prisma.menuProduct.delete({
      where: {
        menuId_productId: {
          menuId: parseInt(menuId),
          productId: parseInt(productId)
        }
      }
    });

    return { message: 'Product removed from menu successfully' };
  }

  /**
   * Update product in menu
   */
  async updateMenuProduct(menuId, productId, data, branchId) {
    const menu = await prisma.menu.findFirst({
      where: { id: parseInt(menuId), branchId }
    });

    if (!menu) {
      throw new NotFoundError('Menu');
    }

    const { custom_price, custom_name, is_active, sort_order } = data;

    const menuProduct = await prisma.menuProduct.update({
      where: {
        menuId_productId: {
          menuId: parseInt(menuId),
          productId: parseInt(productId)
        }
      },
      data: {
        customPrice: custom_price,
        customName: custom_name,
        isActive: is_active,
        displayOrder: sort_order
      }
    });

    return {
      id: menuProduct.id,
      product_id: menuProduct.productId,
      custom_price: menuProduct.customPrice ? Number(menuProduct.customPrice) : null,
      custom_name: menuProduct.customName,
      is_active: menuProduct.isActive,
      sort_order: menuProduct.displayOrder
    };
  }

  /**
   * Reorder products in menu
   */
  async reorderProducts(menuId, productOrders, branchId) {
    const menu = await prisma.menu.findFirst({
      where: { id: parseInt(menuId), branchId }
    });

    if (!menu) {
      throw new NotFoundError('Menu');
    }

    // productOrders: [{ product_id: 1, sort_order: 1 }, ...]
    await prisma.$transaction(
      productOrders.map(item =>
        prisma.menuProduct.update({
          where: {
            menuId_productId: {
              menuId: parseInt(menuId),
              productId: item.product_id
            }
          },
          data: { displayOrder: item.sort_order }
        })
      )
    );

    return { message: 'Products reordered successfully' };
  }

  /**
   * Clone menu
   */
  async cloneMenu(id, newName, branchId) {
    const menu = await prisma.menu.findFirst({
      where: { id: parseInt(id), branchId },
      include: { products: true }
    });

    if (!menu) {
      throw new NotFoundError('Menu');
    }

    // Check for duplicate name
    const existing = await prisma.menu.findFirst({
      where: { branchId, name: newName }
    });

    if (existing) {
      throw new AppError('Menu with this name already exists', 400, 'MENU_EXISTS');
    }

    // Get max sort order
    const maxSort = await prisma.menu.aggregate({
      where: { branchId },
      _max: { displayOrder: true }
    });

    const newMenu = await prisma.menu.create({
      data: {
        branchId,
        name: newName,
        description: menu.description,
        type: menu.type,
        isActive: false, // Start inactive
        isDefault: false,
        availableFrom: menu.availableFrom,
        availableTo: menu.availableTo,
        availableDays: menu.availableDays,
        displayOrder: (maxSort._max.displayOrder || 0) + 1,
        products: {
          create: menu.products.map(p => ({
            productId: p.productId,
            customPrice: p.customPrice,
            customName: p.customName,
            isActive: p.isActive,
            displayOrder: p.displayOrder
          }))
        }
      },
      include: {
        _count: { select: { products: true } }
      }
    });

    return {
      id: newMenu.id,
      name: newMenu.name,
      description: newMenu.description,
      products_count: newMenu._count.products,
      message: 'Menu cloned successfully'
    };
  }

  /**
   * Format menu response with products grouped by category
   */
  formatMenuResponse(menu) {
    // Group products by category
    const categoryMap = new Map();
    
    for (const mp of menu.products) {
      const product = mp.product;
      const catId = product.categoryId || 0;
      
      if (!categoryMap.has(catId)) {
        categoryMap.set(catId, {
          category: product.category || { id: 0, name: 'Uncategorized' },
          products: []
        });
      }
      
      categoryMap.get(catId).products.push(this.formatProductForMenu(product, mp));
    }

    return {
      id: menu.id,
      name: menu.name,
      description: menu.description,
      type: menu.type,
      is_active: menu.isActive,
      is_default: menu.isDefault,
      available_from: menu.availableFrom,
      available_to: menu.availableTo,
      available_days: menu.availableDays,
      categories: Array.from(categoryMap.values())
    };
  }

  /**
   * Format product for menu display
   */
  formatProductForMenu(product, menuProduct = null) {
    const stock = product.stocks?.[0];
    const stockQty = stock?.stockQuantity || 0;

    return {
      id: product.id,
      name: menuProduct?.customName || product.name,
      description: product.description,
      price: menuProduct?.customPrice ? Number(menuProduct.customPrice) : Number(product.price),
      original_price: Number(product.price),
      image: product.image,
      sku: product.sku,
      barcode: product.barcode,
      is_taxable: product.isTaxable,
      track_inventory: product.trackInventory,
      stock_quantity: stockQty,
      in_stock: !product.trackInventory || stockQty > 0,
      variations: product.variations?.map(v => ({
        id: v.id,
        name: v.name,
        sku: v.sku,
        price: Number(v.price),
        is_active: v.isActive
      })) || [],
      modifiers: product.modifiers?.map(m => ({
        id: m.id,
        name: m.name,
        is_required: m.isRequired,
        min_selections: m.minSelections,
        max_selections: m.maxSelections,
        options: m.options?.map(o => ({
          id: o.id,
          name: o.name,
          price: Number(o.price)
        })) || []
      })) || [],
      sort_order: menuProduct?.displayOrder || product.displayOrder
    };
  }
}

module.exports = new MenuService();

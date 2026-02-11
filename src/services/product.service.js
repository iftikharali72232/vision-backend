const { Prisma } = require('@prisma/client');
const prisma = require('../config/database');
const { pagination: paginationConfig } = require('../config/constants');
const { NotFoundError, ConflictError } = require('../middlewares/errorHandler');

class ProductService {
  /**
   * Get paginated list of products
   */
  async getProducts(query, branchId) {
    const {
      page = paginationConfig.defaultPage,
      per_page = paginationConfig.defaultPerPage,
      search,
      category_id,
      is_active,
      is_featured,
      has_variations,
      min_price,
      max_price,
      sort_by = 'created_at',
      sort_order = 'desc'
    } = query;

    const skip = (page - 1) * per_page;
    const take = Math.min(parseInt(per_page), paginationConfig.maxPerPage);

    const where = { branchId: parseInt(branchId) };

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { sku: { contains: search } },
        { barcode: { contains: search } }
      ];
    }

    if (category_id) {
      where.categoryId = parseInt(category_id);
    }

    if (is_active !== undefined) {
      where.isActive = is_active === 'true' || is_active === true;
    }

    if (is_featured !== undefined) {
      where.isFeatured = is_featured === 'true' || is_featured === true;
    }

    if (has_variations !== undefined) {
      where.hasVariations = has_variations === 'true' || has_variations === true;
    }

    if (min_price) {
      where.sellingPrice = { ...where.sellingPrice, gte: parseFloat(min_price) };
    }

    if (max_price) {
      where.sellingPrice = { ...where.sellingPrice, lte: parseFloat(max_price) };
    }

    // Build order by
    const orderBy = {};
    switch (sort_by) {
      case 'name':
        orderBy.name = sort_order;
        break;
      case 'price':
        orderBy.sellingPrice = sort_order;
        break;
      case 'display_order':
        orderBy.displayOrder = sort_order;
        break;
      default:
        orderBy.createdAt = sort_order;
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          category: { select: { id: true, name: true, color: true, icon: true } },
          variations: {
            where: { isActive: true },
            orderBy: { displayOrder: 'asc' }
          },
          modifiers: {
            include: {
              options: true
            }
          }
        }
      }),
      prisma.product.count({ where })
    ]);

    const items = products.map(product => this.formatProduct(product));

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
   * Get products optimized for POS
   */
  async getProductsForPOS(query, branchId) {
    const {
      page = 1,
      per_page = 50,
      search,
      category_id
    } = query;

    const skip = (page - 1) * per_page;
    const take = Math.min(parseInt(per_page), 100);

    const where = {
      branchId: parseInt(branchId),
      isActive: true
    };

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { sku: { contains: search } },
        { barcode: { contains: search } }
      ];
    }

    if (category_id) {
      where.categoryId = parseInt(category_id);
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take,
        orderBy: { displayOrder: 'asc' },
        include: {
          category: { select: { id: true, name: true, color: true, icon: true } },
          variations: {
            where: { isActive: true },
            orderBy: { displayOrder: 'asc' }
          },
          modifiers: {
            include: {
              options: true
            }
          }
        }
      }),
      prisma.product.count({ where })
    ]);

    const items = products.map(product => this.formatProductForPOS(product));

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
   * Get single product by ID
   */
  async getProductById(id, branchId) {
    const product = await prisma.product.findFirst({
      where: { 
        id: parseInt(id),
        branchId: parseInt(branchId)
      },
      include: {
        category: { select: { id: true, name: true, color: true, icon: true } },
        variations: {
          orderBy: { displayOrder: 'asc' }
        },
        modifiers: {
          include: {
            options: {
              orderBy: { id: 'asc' }
            }
          }
        }
      }
    });

    if (!product) {
      throw new NotFoundError('Product');
    }

    return this.formatProduct(product);
  }

  /**
   * Get product by barcode
   */
  async getProductByBarcode(barcode, branchId) {
    const product = await prisma.product.findFirst({
      where: { 
        barcode,
        branchId: parseInt(branchId),
        isActive: true
      },
      include: {
        category: { select: { id: true, name: true, color: true, icon: true } },
        variations: {
          where: { isActive: true },
          orderBy: { displayOrder: 'asc' }
        },
        modifiers: {
          include: {
            options: true
          }
        }
      }
    });

    if (!product) {
      // Check variations for barcode
      const variation = await prisma.productVariation.findFirst({
        where: {
          barcode,
          isActive: true,
          product: {
            branchId: parseInt(branchId),
            isActive: true
          }
        },
        include: {
          product: {
            include: {
              category: { select: { id: true, name: true, color: true, icon: true } },
              variations: {
                where: { isActive: true },
                orderBy: { displayOrder: 'asc' }
              },
              modifiers: {
                include: {
                  options: true
                }
              }
            }
          }
        }
      });

      if (!variation) {
        throw new NotFoundError('Product');
      }

      return {
        ...this.formatProductForPOS(variation.product),
        selected_variation_id: variation.id
      };
    }

    return this.formatProductForPOS(product);
  }

  /**
   * Get low stock products
   */
  async getLowStockProducts(branchId, limit = 10) {
    const products = await prisma.product.findMany({
      where: {
        branchId: parseInt(branchId),
        isActive: true,
        trackStock: true,
        OR: [
          { stockQuantity: { lte: prisma.product.fields.lowStockThreshold } },
          { stockQuantity: { lte: 0 } }
        ]
      },
      include: {
        category: { select: { id: true, name: true } },
        stocks: true
      },
      orderBy: { stockQuantity: 'asc' },
      take: limit
    });

    return products.map(product => ({
      id: product.id,
      name: product.name,
      sku: product.sku,
      image: product.image,
      category: product.category,
      stock_quantity: product.stockQuantity,
      low_stock_threshold: product.lowStockThreshold,
      stock_status: product.stockQuantity <= 0 ? 'out_of_stock' : 'low_stock'
    }));
  }

  /**
   * Create new product
   */
  async createProduct(data, branchId) {
    // Check for duplicate SKU in branch
    const existingProduct = await prisma.product.findFirst({
      where: { 
        branchId: parseInt(branchId),
        sku: data.sku 
      }
    });

    if (existingProduct) {
      throw new ConflictError('Product with this SKU already exists in this branch');
    }

    const product = await prisma.product.create({
      data: {
        branchId: parseInt(branchId),
        categoryId: data.category_id ? parseInt(data.category_id) : null,
        name: data.name,
        slug: data.slug || data.name.toLowerCase().replace(/\s+/g, '-'),
        sku: data.sku,
        barcode: data.barcode || null,
        description: data.description || null,
        basePrice: data.base_price || data.selling_price,
        sellingPrice: data.selling_price,
        costPrice: data.cost_price || 0,
        taxRate: data.tax_rate || 0,
        hasVariations: data.has_variations || false,
        trackStock: data.track_stock !== false,
        stockQuantity: data.stock_quantity || 0,
        lowStockThreshold: data.low_stock_threshold || 10,
        image: data.image || null,
        images: data.images || null,
        isActive: data.is_active !== false,
        isFeatured: data.is_featured || false,
        displayOrder: data.display_order || 0
      },
      include: {
        category: { select: { id: true, name: true, color: true, icon: true } },
        variations: true,
        modifiers: {
          include: { options: true }
        }
      }
    });

    // Create variations if provided
    if (data.variations && data.variations.length > 0) {
      for (let i = 0; i < data.variations.length; i++) {
        const v = data.variations[i];
        await prisma.productVariation.create({
          data: {
            productId: product.id,
            name: v.name,
            sku: v.sku || `${data.sku}-V${i + 1}`,
            barcode: v.barcode || null,
            price: v.price,
            costPrice: v.cost_price || 0,
            stockQuantity: v.stock_quantity || 0,
            image: v.image || null,
            isActive: v.is_active !== false,
            displayOrder: v.display_order || i + 1
          }
        });
      }

      // Update hasVariations
      await prisma.product.update({
        where: { id: product.id },
        data: { hasVariations: true }
      });
    }

    // Create modifiers if provided
    if (data.modifiers && data.modifiers.length > 0) {
      for (const mod of data.modifiers) {
        const modifier = await prisma.productModifier.create({
          data: {
            productId: product.id,
            name: mod.name,
            price: mod.price || 0,
            isRequired: mod.is_required || false,
            maxSelections: mod.max_selections || 1
          }
        });

        if (mod.options && mod.options.length > 0) {
          for (const opt of mod.options) {
            await prisma.modifierOption.create({
              data: {
                modifierId: modifier.id,
                name: opt.name,
                price: opt.price || 0,
                isDefault: opt.is_default || false
              }
            });
          }
        }
      }
    }

    // Return fresh product with all relations
    return this.getProductById(product.id, branchId);
  }

  /**
   * Update product
   */
  async updateProduct(id, data, branchId) {
    const product = await prisma.product.findFirst({
      where: { 
        id: parseInt(id),
        branchId: parseInt(branchId)
      }
    });

    if (!product) {
      throw new NotFoundError('Product');
    }

    // Check for duplicate SKU if SKU is being updated
    if (data.sku && data.sku !== product.sku) {
      const existingProduct = await prisma.product.findFirst({
        where: { 
          branchId: parseInt(branchId),
          sku: data.sku,
          NOT: { id: parseInt(id) }
        }
      });

      if (existingProduct) {
        throw new ConflictError('Product with this SKU already exists in this branch');
      }
    }

    const updateData = {};
    
    if (data.category_id !== undefined) updateData.categoryId = data.category_id ? parseInt(data.category_id) : null;
    if (data.name !== undefined) updateData.name = data.name;
    if (data.slug !== undefined) updateData.slug = data.slug;
    if (data.sku !== undefined) updateData.sku = data.sku;
    if (data.barcode !== undefined) updateData.barcode = data.barcode;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.base_price !== undefined) updateData.basePrice = data.base_price;
    if (data.selling_price !== undefined) updateData.sellingPrice = data.selling_price;
    if (data.cost_price !== undefined) updateData.costPrice = data.cost_price;
    if (data.tax_rate !== undefined) updateData.taxRate = data.tax_rate;
    if (data.has_variations !== undefined) updateData.hasVariations = data.has_variations;
    if (data.track_stock !== undefined) updateData.trackStock = data.track_stock;
    if (data.stock_quantity !== undefined) updateData.stockQuantity = data.stock_quantity;
    if (data.low_stock_threshold !== undefined) updateData.lowStockThreshold = data.low_stock_threshold;
    if (data.image !== undefined) updateData.image = data.image;
    if (data.images !== undefined) updateData.images = data.images;
    if (data.is_active !== undefined) updateData.isActive = data.is_active;
    if (data.is_featured !== undefined) updateData.isFeatured = data.is_featured;
    if (data.display_order !== undefined) updateData.displayOrder = data.display_order;

    await prisma.product.update({
      where: { id: parseInt(id) },
      data: updateData
    });

    return this.getProductById(id, branchId);
  }

  /**
   * Delete product
   */
  async deleteProduct(id, branchId) {
    const product = await prisma.product.findFirst({
      where: { 
        id: parseInt(id),
        branchId: parseInt(branchId)
      }
    });

    if (!product) {
      throw new NotFoundError('Product');
    }

    // Check if product has orders
    const orderCount = await prisma.orderItem.count({
      where: { productId: parseInt(id) }
    });

    if (orderCount > 0) {
      // Soft delete by deactivating
      await prisma.product.update({
        where: { id: parseInt(id) },
        data: { isActive: false }
      });
      return { message: 'Product has been deactivated (has order history)' };
    }

    // Hard delete if no orders
    await prisma.product.delete({
      where: { id: parseInt(id) }
    });

    return { message: 'Product deleted successfully' };
  }

  /**
   * Add variation to product
   */
  async addVariation(productId, data, branchId) {
    const product = await prisma.product.findFirst({
      where: { 
        id: parseInt(productId),
        branchId: parseInt(branchId)
      }
    });

    if (!product) {
      throw new NotFoundError('Product');
    }

    const variation = await prisma.productVariation.create({
      data: {
        productId: parseInt(productId),
        name: data.name,
        sku: data.sku || null,
        barcode: data.barcode || null,
        price: data.price,
        costPrice: data.cost_price || 0,
        stockQuantity: data.stock_quantity || 0,
        image: data.image || null,
        isActive: data.is_active !== false,
        displayOrder: data.display_order || 0
      }
    });

    // Ensure hasVariations is true
    await prisma.product.update({
      where: { id: parseInt(productId) },
      data: { hasVariations: true }
    });

    return this.formatVariation(variation);
  }

  /**
   * Update variation
   */
  async updateVariation(productId, variationId, data, branchId) {
    const product = await prisma.product.findFirst({
      where: { 
        id: parseInt(productId),
        branchId: parseInt(branchId)
      }
    });

    if (!product) {
      throw new NotFoundError('Product');
    }

    const variation = await prisma.productVariation.findFirst({
      where: {
        id: parseInt(variationId),
        productId: parseInt(productId)
      }
    });

    if (!variation) {
      throw new NotFoundError('Variation');
    }

    const updateData = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.sku !== undefined) updateData.sku = data.sku;
    if (data.barcode !== undefined) updateData.barcode = data.barcode;
    if (data.price !== undefined) updateData.price = data.price;
    if (data.cost_price !== undefined) updateData.costPrice = data.cost_price;
    if (data.stock_quantity !== undefined) updateData.stockQuantity = data.stock_quantity;
    if (data.image !== undefined) updateData.image = data.image;
    if (data.is_active !== undefined) updateData.isActive = data.is_active;
    if (data.display_order !== undefined) updateData.displayOrder = data.display_order;

    const updated = await prisma.productVariation.update({
      where: { id: parseInt(variationId) },
      data: updateData
    });

    return this.formatVariation(updated);
  }

  /**
   * Delete variation
   */
  async deleteVariation(productId, variationId, branchId) {
    const product = await prisma.product.findFirst({
      where: { 
        id: parseInt(productId),
        branchId: parseInt(branchId)
      }
    });

    if (!product) {
      throw new NotFoundError('Product');
    }

    const variation = await prisma.productVariation.findFirst({
      where: {
        id: parseInt(variationId),
        productId: parseInt(productId)
      }
    });

    if (!variation) {
      throw new NotFoundError('Variation');
    }

    // Check if variation has orders
    const orderCount = await prisma.orderItem.count({
      where: { variationId: parseInt(variationId) }
    });

    if (orderCount > 0) {
      await prisma.productVariation.update({
        where: { id: parseInt(variationId) },
        data: { isActive: false }
      });
      return { message: 'Variation has been deactivated (has order history)' };
    }

    await prisma.productVariation.delete({
      where: { id: parseInt(variationId) }
    });

    // Check if any variations left
    const remainingVariations = await prisma.productVariation.count({
      where: { productId: parseInt(productId) }
    });

    if (remainingVariations === 0) {
      await prisma.product.update({
        where: { id: parseInt(productId) },
        data: { hasVariations: false }
      });
    }

    return { message: 'Variation deleted successfully' };
  }

  /**
   * Add modifier to product
   */
  async addModifier(productId, data, branchId) {
    const product = await prisma.product.findFirst({
      where: { 
        id: parseInt(productId),
        branchId: parseInt(branchId)
      }
    });

    if (!product) {
      throw new NotFoundError('Product');
    }

    const modifier = await prisma.productModifier.create({
      data: {
        productId: parseInt(productId),
        name: data.name,
        price: data.price || 0,
        isRequired: data.is_required || false,
        maxSelections: data.max_selections || 1
      }
    });

    // Create options if provided
    if (data.options && data.options.length > 0) {
      for (const opt of data.options) {
        await prisma.modifierOption.create({
          data: {
            modifierId: modifier.id,
            name: opt.name,
            price: opt.price || 0,
            isDefault: opt.is_default || false
          }
        });
      }
    }

    // Return modifier with options
    const fullModifier = await prisma.productModifier.findUnique({
      where: { id: modifier.id },
      include: { options: true }
    });

    return this.formatModifier(fullModifier);
  }

  /**
   * Update modifier
   */
  async updateModifier(productId, modifierId, data, branchId) {
    const product = await prisma.product.findFirst({
      where: { 
        id: parseInt(productId),
        branchId: parseInt(branchId)
      }
    });

    if (!product) {
      throw new NotFoundError('Product');
    }

    const modifier = await prisma.productModifier.findFirst({
      where: {
        id: parseInt(modifierId),
        productId: parseInt(productId)
      }
    });

    if (!modifier) {
      throw new NotFoundError('Modifier');
    }

    const updateData = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.price !== undefined) updateData.price = data.price;
    if (data.is_required !== undefined) updateData.isRequired = data.is_required;
    if (data.max_selections !== undefined) updateData.maxSelections = data.max_selections;

    await prisma.productModifier.update({
      where: { id: parseInt(modifierId) },
      data: updateData
    });

    const fullModifier = await prisma.productModifier.findUnique({
      where: { id: parseInt(modifierId) },
      include: { options: true }
    });

    return this.formatModifier(fullModifier);
  }

  /**
   * Delete modifier
   */
  async deleteModifier(productId, modifierId, branchId) {
    const product = await prisma.product.findFirst({
      where: { 
        id: parseInt(productId),
        branchId: parseInt(branchId)
      }
    });

    if (!product) {
      throw new NotFoundError('Product');
    }

    const modifier = await prisma.productModifier.findFirst({
      where: {
        id: parseInt(modifierId),
        productId: parseInt(productId)
      }
    });

    if (!modifier) {
      throw new NotFoundError('Modifier');
    }

    await prisma.productModifier.delete({
      where: { id: parseInt(modifierId) }
    });

    return { message: 'Modifier deleted successfully' };
  }

  /**
   * Update stock quantity
   */
  async updateStock(productId, data, branchId, userId) {
    const product = await prisma.product.findFirst({
      where: { 
        id: parseInt(productId),
        branchId: parseInt(branchId)
      }
    });

    if (!product) {
      throw new NotFoundError('Product');
    }

    const currentStock = data.variation_id 
      ? (await prisma.productVariation.findUnique({ where: { id: parseInt(data.variation_id) } }))?.stockQuantity || 0
      : product.stockQuantity;

    let newStock = currentStock;
    
    switch (data.adjustment_type) {
      case 'set':
        newStock = data.quantity;
        break;
      case 'add':
        newStock = currentStock + data.quantity;
        break;
      case 'subtract':
        newStock = Math.max(0, currentStock - data.quantity);
        break;
    }

    // Record inventory movement
    await prisma.inventoryMovement.create({
      data: {
        branchId: parseInt(branchId),
        productId: parseInt(productId),
        variationId: data.variation_id ? parseInt(data.variation_id) : null,
        userId: parseInt(userId),
        type: data.adjustment_type === 'add' ? 'in' : (data.adjustment_type === 'subtract' ? 'out' : 'adjustment'),
        reason: data.reason || 'correction',
        quantity: Math.abs(newStock - currentStock),
        quantityBefore: currentStock,
        quantityAfter: newStock,
        unitCost: data.unit_cost || null,
        reference: data.reference || null,
        notes: data.notes || null
      }
    });

    // Update stock
    if (data.variation_id) {
      await prisma.productVariation.update({
        where: { id: parseInt(data.variation_id) },
        data: { stockQuantity: newStock }
      });
    } else {
      await prisma.product.update({
        where: { id: parseInt(productId) },
        data: { stockQuantity: newStock }
      });
    }

    return {
      product_id: parseInt(productId),
      variation_id: data.variation_id ? parseInt(data.variation_id) : null,
      previous_quantity: currentStock,
      new_quantity: newStock,
      adjustment_type: data.adjustment_type
    };
  }

  /**
   * Format product for API response
   */
  formatProduct(product) {
    // Calculate stock status
    let stockStatus = 'in_stock';
    if (product.stockQuantity === 0) {
      stockStatus = 'out_of_stock';
    } else if (product.stockQuantity <= product.lowStockThreshold) {
      stockStatus = 'low_stock';
    }

    return {
      id: product.id,
      branch_id: product.branchId,
      category_id: product.categoryId,
      category: product.category,
      name: product.name,
      slug: product.slug,
      sku: product.sku,
      barcode: product.barcode,
      description: product.description,
      base_price: Number(product.basePrice),
      selling_price: Number(product.sellingPrice),
      cost_price: Number(product.costPrice),
      tax_rate: Number(product.taxRate),
      has_variations: product.hasVariations,
      track_stock: product.trackStock,
      stock_quantity: product.stockQuantity,
      low_stock_threshold: product.lowStockThreshold,
      stock_status: stockStatus,
      image: product.image,
      images: product.images,
      is_active: product.isActive,
      is_featured: product.isFeatured,
      display_order: product.displayOrder,
      variations: product.variations ? product.variations.map(v => this.formatVariation(v)) : [],
      modifiers: product.modifiers ? product.modifiers.map(m => this.formatModifier(m)) : [],
      created_at: product.createdAt,
      updated_at: product.updatedAt
    };
  }

  /**
   * Format product for POS (lighter response)
   */
  formatProductForPOS(product) {
    return {
      id: product.id,
      name: product.name,
      sku: product.sku,
      barcode: product.barcode,
      category: product.category,
      selling_price: Number(product.sellingPrice),
      tax_rate: Number(product.taxRate),
      has_variations: product.hasVariations,
      stock_quantity: product.stockQuantity,
      image: product.image,
      variations: product.variations ? product.variations.map(v => ({
        id: v.id,
        name: v.name,
        price: Number(v.price),
        stock_quantity: v.stockQuantity
      })) : [],
      modifiers: product.modifiers ? product.modifiers.map(m => ({
        id: m.id,
        name: m.name,
        is_required: m.isRequired,
        max_selections: m.maxSelections,
        options: m.options.map(o => ({
          id: o.id,
          name: o.name,
          price: Number(o.price),
          is_default: o.isDefault
        }))
      })) : []
    };
  }

  /**
   * Format variation
   */
  formatVariation(variation) {
    return {
      id: variation.id,
      product_id: variation.productId,
      name: variation.name,
      sku: variation.sku,
      barcode: variation.barcode,
      price: Number(variation.price),
      cost_price: Number(variation.costPrice),
      stock_quantity: variation.stockQuantity,
      image: variation.image,
      is_active: variation.isActive,
      display_order: variation.displayOrder,
      created_at: variation.createdAt
    };
  }

  /**
   * Format modifier
   */
  formatModifier(modifier) {
    return {
      id: modifier.id,
      product_id: modifier.productId,
      name: modifier.name,
      price: Number(modifier.price),
      is_required: modifier.isRequired,
      max_selections: modifier.maxSelections,
      options: modifier.options ? modifier.options.map(o => ({
        id: o.id,
        name: o.name,
        price: Number(o.price),
        is_default: o.isDefault
      })) : [],
      created_at: modifier.createdAt
    };
  }
}

module.exports = new ProductService();

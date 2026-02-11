const prisma = require('../config/database');
const slugify = require('slugify');
const { pagination: paginationConfig } = require('../config/constants');
const { NotFoundError, ConflictError } = require('../middlewares/errorHandler');

class CategoryService {
  /**
   * Get paginated list of categories
   */
  async getCategories(query, branchId) {
    const {
      page = paginationConfig.defaultPage,
      per_page = 50,
      search,
      parent_id,
      is_active
    } = query;

    const skip = (page - 1) * per_page;
    const take = Math.min(parseInt(per_page), paginationConfig.maxPerPage);

    const where = { branchId: parseInt(branchId) };

    if (search) {
      where.name = { contains: search };
    }

    if (parent_id !== undefined) {
      where.parentId = parent_id === 'null' ? null : parseInt(parent_id);
    }

    if (is_active !== undefined) {
      where.isActive = is_active === 'true' || is_active === true;
    }

    const [categories, total] = await Promise.all([
      prisma.category.findMany({
        where,
        skip,
        take,
        orderBy: { displayOrder: 'asc' },
        include: {
          children: {
            where: { isActive: true },
            orderBy: { displayOrder: 'asc' },
            select: {
              id: true,
              name: true,
              slug: true,
              color: true,
              icon: true,
              displayOrder: true,
              isActive: true,
              _count: { select: { products: true } }
            }
          },
          _count: { select: { products: true } }
        }
      }),
      prisma.category.count({ where })
    ]);

    const items = categories.map(cat => this.formatCategory(cat));

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
   * Get categories for POS (flat list, active only)
   */
  async getCategoriesForPOS(branchId) {
    const categories = await prisma.category.findMany({
      where: {
        branchId: parseInt(branchId),
        isActive: true
      },
      orderBy: { displayOrder: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        color: true,
        icon: true,
        _count: { select: { products: { where: { isActive: true } } } }
      }
    });

    return {
      items: categories.map(cat => ({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        color: cat.color,
        icon: cat.icon,
        products_count: cat._count.products
      }))
    };
  }

  /**
   * Get category by ID
   */
  async getCategoryById(id, branchId) {
    const category = await prisma.category.findFirst({
      where: { 
        id: parseInt(id),
        branchId: parseInt(branchId)
      },
      include: {
        parent: { select: { id: true, name: true, slug: true } },
        children: {
          where: { isActive: true },
          orderBy: { displayOrder: 'asc' },
          select: {
            id: true,
            name: true,
            slug: true,
            color: true,
            icon: true,
            displayOrder: true,
            isActive: true,
            _count: { select: { products: true } }
          }
        },
        _count: { select: { products: true } }
      }
    });

    if (!category) {
      throw new NotFoundError('Category');
    }

    return this.formatCategory(category);
  }

  /**
   * Create new category
   */
  async createCategory(data, branchId) {
    // Generate slug
    const slug = data.slug || slugify(data.name, { lower: true, strict: true });

    // Check for duplicate slug in branch
    const existingCategory = await prisma.category.findFirst({
      where: { 
        branchId: parseInt(branchId),
        slug 
      }
    });

    if (existingCategory) {
      throw new ConflictError('Category with this slug already exists in this branch');
    }

    const category = await prisma.category.create({
      data: {
        branchId: parseInt(branchId),
        parentId: data.parent_id ? parseInt(data.parent_id) : null,
        name: data.name,
        slug,
        description: data.description || null,
        image: data.image || null,
        color: data.color || null,
        icon: data.icon || null,
        kitchen: data.kitchen || null,
        displayOrder: data.display_order || 0,
        isActive: data.is_active !== false
      },
      include: {
        parent: { select: { id: true, name: true, slug: true } },
        _count: { select: { products: true } }
      }
    });

    return this.formatCategory(category);
  }

  /**
   * Update category
   */
  async updateCategory(id, data, branchId) {
    const category = await prisma.category.findFirst({
      where: { 
        id: parseInt(id),
        branchId: parseInt(branchId)
      }
    });

    if (!category) {
      throw new NotFoundError('Category');
    }

    // Check for duplicate slug if slug is being updated
    if (data.slug && data.slug !== category.slug) {
      const existingCategory = await prisma.category.findFirst({
        where: {
          branchId: parseInt(branchId),
          slug: data.slug,
          NOT: { id: parseInt(id) }
        }
      });

      if (existingCategory) {
        throw new ConflictError('Category with this slug already exists in this branch');
      }
    }

    const updateData = {};
    if (data.parent_id !== undefined) updateData.parentId = data.parent_id ? parseInt(data.parent_id) : null;
    if (data.name !== undefined) updateData.name = data.name;
    if (data.slug !== undefined) updateData.slug = data.slug;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.image !== undefined) updateData.image = data.image;
    if (data.color !== undefined) updateData.color = data.color;
    if (data.icon !== undefined) updateData.icon = data.icon;
    if (data.kitchen !== undefined) updateData.kitchen = data.kitchen;
    if (data.display_order !== undefined) updateData.displayOrder = data.display_order;
    if (data.is_active !== undefined) updateData.isActive = data.is_active;

    const updated = await prisma.category.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        parent: { select: { id: true, name: true, slug: true } },
        children: {
          where: { isActive: true },
          orderBy: { displayOrder: 'asc' },
          select: {
            id: true,
            name: true,
            slug: true,
            color: true,
            icon: true,
            displayOrder: true,
            isActive: true,
            _count: { select: { products: true } }
          }
        },
        _count: { select: { products: true } }
      }
    });

    return this.formatCategory(updated);
  }

  /**
   * Delete category
   */
  async deleteCategory(id, branchId) {
    const category = await prisma.category.findFirst({
      where: { 
        id: parseInt(id),
        branchId: parseInt(branchId)
      },
      include: {
        _count: { select: { products: true, children: true } }
      }
    });

    if (!category) {
      throw new NotFoundError('Category');
    }

    // Check if category has products
    if (category._count.products > 0) {
      throw new ConflictError('Cannot delete category with products. Remove products first or deactivate the category.');
    }

    // Check if category has children
    if (category._count.children > 0) {
      throw new ConflictError('Cannot delete category with subcategories. Remove subcategories first.');
    }

    await prisma.category.delete({
      where: { id: parseInt(id) }
    });

    return { message: 'Category deleted successfully' };
  }

  /**
   * Format category for API response
   */
  formatCategory(category) {
    return {
      id: category.id,
      branch_id: category.branchId,
      parent_id: category.parentId,
      parent: category.parent || null,
      name: category.name,
      slug: category.slug,
      description: category.description,
      image: category.image,
      color: category.color,
      icon: category.icon,
      kitchen: category.kitchen,
      display_order: category.displayOrder,
      is_active: category.isActive,
      products_count: category._count?.products || 0,
      children: category.children ? category.children.map(child => ({
        id: child.id,
        name: child.name,
        slug: child.slug,
        color: child.color,
        icon: child.icon,
        display_order: child.displayOrder,
        is_active: child.isActive,
        products_count: child._count?.products || 0
      })) : [],
      created_at: category.createdAt,
      updated_at: category.updatedAt
    };
  }
}

module.exports = new CategoryService();

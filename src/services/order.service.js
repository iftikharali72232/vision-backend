const { getCurrentPrisma } = require('../middlewares/requestContext');
const prisma = new Proxy({}, { get: (_, prop) => getCurrentPrisma()[prop] });
const { pagination: paginationConfig } = require('../config/constants');
const { NotFoundError, AppError, InsufficientStockError, BadRequestError } = require('../middlewares/errorHandler');

/**
 * ORDER STATE MACHINE
 * 
 * Valid States: draft, hold, pending, confirmed, kitchen, preparing, ready, served, completed, invoiced, cancelled, refunded
 * 
 * Transitions:
 *   draft     → hold, pending, cancelled
 *   hold      → pending, cancelled
 *   pending   → confirmed, preparing, kitchen, cancelled
 *   confirmed → preparing, kitchen, cancelled
 *   kitchen   → preparing, cancelled
 *   preparing → ready, cancelled
 *   ready     → served, completed, cancelled
 *   served    → completed, cancelled
 *   completed → invoiced, refunded
 *   invoiced  → refunded
 *   cancelled → (terminal)
 *   refunded  → (terminal)
 * 
 * CRITICAL RULES:
 * 1. Invoice MUST be generated FROM order via /orders/:id/complete
 * 2. Manual invoice creation is FORBIDDEN
 * 3. Dashboard data comes from INVOICES only
 * 4. Inventory deduction happens at INVOICED state
 * 5. Accounting entries created at INVOICED state
 */

const ORDER_TRANSITIONS = {
  draft:     ['hold', 'pending', 'cancelled'],
  hold:      ['pending', 'cancelled'],
  pending:   ['confirmed', 'preparing', 'kitchen', 'completed', 'cancelled'],
  confirmed: ['preparing', 'kitchen', 'completed', 'cancelled'],
  kitchen:   ['preparing', 'completed', 'cancelled'],
  preparing: ['ready', 'completed', 'cancelled'],
  ready:     ['served', 'completed', 'cancelled'],
  served:    ['completed', 'cancelled'],
  completed: ['invoiced', 'refunded'],
  invoiced:  ['refunded'],
  cancelled: [],
  refunded:  []
};

class OrderService {
  /**
   * Validate state transition
   */
  canTransition(currentStatus, newStatus) {
    const allowed = ORDER_TRANSITIONS[currentStatus] || [];
    return allowed.includes(newStatus);
  }

  /**
   * Generate order number
   */
  generateOrderNumber(prefix = 'ORD') {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${prefix}${year}${month}${day}${random}`;
  }

  /**
   * Generate invoice number
   */
  generateInvoiceNumber(prefix = 'INV') {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${prefix}${year}${month}${day}${random}`;
  }

  /**
   * Get paginated list of orders
   */
  async getOrders(query, branchId) {
    const {
      page = paginationConfig.defaultPage,
      per_page = paginationConfig.defaultPerPage,
      limit,
      search,
      status,
      payment_status,
      order_type,
      customer_id,
      user_id,
      table_id,
      date_from,
      date_to,
      sort_by = 'created_at',
      sort_order = 'desc'
    } = query;

    const pageNum = parseInt(page) || paginationConfig.defaultPage;
    const perPageNum = parseInt(limit || per_page) || paginationConfig.defaultPerPage;

    const skip = (pageNum - 1) * perPageNum;
    const take = Math.min(perPageNum, paginationConfig.maxPerPage);

    const where = { branchId };

    if (search) {
      where.OR = [
        { orderNumber: { contains: search } },
        { customer: { name: { contains: search } } }
      ];
    }

    if (status) {
      where.status = status;
    }

    if (payment_status) {
      where.paymentStatus = payment_status;
    }

    if (order_type) {
      where.orderType = order_type;
    }

    if (customer_id) {
      where.customerId = parseInt(customer_id);
    }

    if (user_id) {
      where.userId = parseInt(user_id);
    }

    if (table_id) {
      where.tableId = parseInt(table_id);
    }

    if (date_from || date_to) {
      where.createdAt = {};
      if (date_from) {
        where.createdAt.gte = new Date(date_from);
      }
      if (date_to) {
        const endDate = new Date(date_to);
        endDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = endDate;
      }
    }

    const orderBy = {};
    switch (sort_by) {
      case 'total':
        orderBy.total = sort_order;
        break;
      case 'order_number':
        orderBy.orderNumber = sort_order;
        break;
      default:
        orderBy.createdAt = sort_order;
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          user: { select: { id: true, name: true } },
          table: { select: { id: true, name: true } },
          invoice: { select: { id: true, invoiceNumber: true, status: true } },
          _count: { select: { items: true } }
        }
      }),
      prisma.order.count({ where })
    ]);

    const items = orders.map(order => ({
      id: order.id,
      order_number: order.orderNumber,
      invoice_no: order.invoice?.invoiceNumber || null,
      order_type: order.orderType,
      order_source: order.orderSource,
      customer: order.customer,
      user: order.user,
      table: order.table,
      invoice: order.invoice,
      subtotal: Number(order.subtotal),
      discount_amount: Number(order.discountAmount),
      tax_amount: Number(order.taxAmount),
      total: Number(order.total),
      payment_status: order.paymentStatus,
      payment_method: order.paymentMethod,
      paid_amount: Number(order.paidAmount),
      status: order.status,
      items_count: order._count.items,
      created_at: order.createdAt
    }));

    const totalPages = Math.ceil(total / take);

    return {
      items,
      pagination: {
        // Frontend guide keys
        page: pageNum,
        limit: take,
        total,
        total_pages: totalPages,

        // Backwards-compatible keys
        current_page: pageNum,
        per_page: take,
        total_items: total
      }
    };
  }

  /**
   * Get orders for kitchen display
   */
  async getKitchenOrders(branchId) {
    const orders = await prisma.order.findMany({
      where: {
        branchId,
        status: { in: ['pending', 'confirmed', 'kitchen', 'preparing', 'ready'] }
      },
      orderBy: { createdAt: 'asc' },
      include: {
        table: { select: { id: true, name: true } },
        items: {
          where: { status: { in: ['pending', 'preparing'] } },
          include: {
            product: { select: { id: true, name: true } },
            variation: { select: { id: true, name: true } }
          }
        }
      }
    });

    return orders.map(order => ({
      id: order.id,
      order_number: order.orderNumber,
      order_type: order.orderType,
      table: order.table,
      status: order.status,
      kitchen_notes: order.kitchenNotes,
      items: order.items.map(item => ({
        id: item.id,
        product_name: item.productName,
        variation_name: item.variationName,
        quantity: item.quantity,
        modifiers: item.modifiers,
        notes: item.notes,
        status: item.status
      })),
      created_at: order.createdAt
    }));
  }

  /**
   * Get order by ID
   */
  async getOrderById(id, branchId = null) {
    const where = { id: parseInt(id) };
    if (branchId) where.branchId = branchId;

    const order = await prisma.order.findFirst({
      where,
      include: {
        customer: true,
        user: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true, address: true, phone: true, settings: true } },
        table: { 
          include: { hall: true }
        },
        items: {
          include: {
            product: { select: { id: true, name: true, image: true } },
            variation: { select: { id: true, name: true } }
          }
        },
        payments: true,
        invoice: true
      }
    });

    if (!order) {
      throw new NotFoundError('Order');
    }

    return this.formatOrderResponse(order);
  }

  /**
   * Get order by invoice number
   */
  async getOrderByInvoiceNumber(invoiceNumber, branchId = null) {
    const invoice = await prisma.invoice.findFirst({
      where: {
        invoiceNumber,
        ...(branchId && { branchId })
      },
      include: {
        order: {
          include: {
            customer: true,
            user: { select: { id: true, name: true } },
            branch: { select: { id: true, name: true, address: true, phone: true, settings: true } },
            table: { 
              include: { hall: true }
            },
            items: {
              include: {
                product: { select: { id: true, name: true, image: true } },
                variation: { select: { id: true, name: true } }
              }
            },
            payments: true,
            invoice: true
          }
        }
      }
    });

    if (!invoice || !invoice.order) {
      throw new NotFoundError('Order not found for this invoice number');
    }

    return this.formatOrderResponse(invoice.order);
  }

  /**
   * Format order response
   */
  formatOrderResponse(order) {
    return {
      id: order.id,
      order_number: order.orderNumber,
      order_type: order.orderType,
      order_source: order.orderSource,
      customer: order.customer ? {
        id: order.customer.id,
        name: order.customer.name,
        email: order.customer.email,
        phone: order.customer.phone,
        address: order.customer.address
      } : null,
      user: order.user,
      branch: order.branch,
      table: order.table,
      invoice: order.invoice ? {
        id: order.invoice.id,
        invoice_number: order.invoice.invoiceNumber,
        status: order.invoice.status
      } : null,
      subtotal: Number(order.subtotal),
      discount: {
        type: order.discountType,
        value: Number(order.discountValue),
        amount: Number(order.discountAmount)
      },
      tax: {
        rate: Number(order.taxRate),
        amount: Number(order.taxAmount)
      },
      total: Number(order.total),
      payment: {
        status: order.paymentStatus,
        method: order.paymentMethod,
        paid_amount: Number(order.paidAmount),
        change_amount: Number(order.changeAmount)
      },
      status: order.status,
      notes: order.notes,
      kitchen_notes: order.kitchenNotes,
      delivery_address: order.deliveryAddress,
      delivery_phone: order.deliveryPhone,
      items: order.items?.map(item => ({
        id: item.id,
        product_id: item.productId,
        product_name: item.productName,
        product_image: item.product?.image,
        variation_id: item.variationId,
        variation_name: item.variationName,
        sku: item.sku,
        quantity: item.quantity,
        unit_price: Number(item.unitPrice),
        discount_amount: Number(item.discountAmount),
        tax_amount: Number(item.taxAmount),
        total: Number(item.total),
        modifiers: item.modifiers,
        notes: item.notes,
        status: item.status
      })) || [],
      payments: order.payments?.map(p => ({
        id: p.id,
        method: p.paymentMethod,
        amount: Number(p.amount),
        reference: p.reference,
        created_at: p.createdAt
      })) || [],
      completed_at: order.completedAt,
      cancelled_at: order.cancelledAt,
      created_at: order.createdAt,
      updated_at: order.updatedAt
    };
  }

  /**
   * Get held orders
   */
  async getHeldOrders(query = {}, branchId) {
    // Backwards compatibility: older callers used (branchId)
    if (typeof query === 'number') {
      branchId = query;
      query = {};
    }

    const {
      page = paginationConfig.defaultPage,
      per_page = paginationConfig.defaultPerPage,
      limit
    } = query;

    const pageNum = parseInt(page) || paginationConfig.defaultPage;
    const perPageNum = parseInt(limit || per_page) || paginationConfig.defaultPerPage;
    const skip = (pageNum - 1) * perPageNum;
    const take = Math.min(perPageNum, paginationConfig.maxPerPage);

    const normalizeItems = (value) => {
      if (Array.isArray(value)) return value;
      if (value && typeof value === 'object' && Array.isArray(value.items)) return value.items;
      return [];
    };

    const where = { branchId };

    const [heldOrders, total] = await Promise.all([
      prisma.heldOrder.findMany({
        where,
        skip,
        take,
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          table: {
            include: {
              hall: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.heldOrder.count({ where })
    ]);

    const items = heldOrders.map(h => {
      const meta = (h.items && typeof h.items === 'object' && !Array.isArray(h.items)) ? h.items : {};
      const orderLevelDiscount = meta.discount ?? (h.discountType ? { type: h.discountType, value: Number(h.discountValue) || 0 } : null);

      return {
      id: h.id,
      order_type: h.orderType,
      customer: h.customer,
      table: h.table,
      subtotal: Number(h.subtotal),
      tax_rate: Number(h.taxRate),
      tax_amount: Number(h.taxAmount),
      discount: orderLevelDiscount,
      total: meta.total !== undefined ? Number(meta.total) : Number(h.subtotal),
      notes: h.notes,
      items: normalizeItems(h.items),
      held_at: h.createdAt
      };
    });

    const totalPages = Math.ceil(total / take);

    return {
      items,
      pagination: {
        page: pageNum,
        limit: take,
        total,
        total_pages: totalPages,
        current_page: pageNum,
        per_page: take,
        total_items: total
      }
    };
  }

  /**
   * Get held order by ID
   */
  async getHeldOrderById(id, branchId) {
    const held = await prisma.heldOrder.findFirst({
      where: { id: parseInt(id), branchId },
      include: {
        customer: true,
        table: {
          include: {
            hall: true
          }
        }
      }
    });

    if (!held) {
      throw new NotFoundError('Held order');
    }

    const normalizeItems = (value) => {
      if (Array.isArray(value)) return value;
      if (value && typeof value === 'object' && Array.isArray(value.items)) return value.items;
      return [];
    };

    return {
      id: held.id,
      order_type: held.orderType,
      customer: held.customer,
      table: held.table,
      subtotal: Number(held.subtotal),
      tax_rate: Number(held.taxRate),
      tax_amount: Number(held.taxAmount),
      discount: (held.items && typeof held.items === 'object' && !Array.isArray(held.items))
        ? (held.items.discount ?? (held.discountType ? { type: held.discountType, value: Number(held.discountValue) || 0 } : null))
        : (held.discountType ? { type: held.discountType, value: Number(held.discountValue) || 0 } : null),
      total: (held.items && typeof held.items === 'object' && !Array.isArray(held.items)) ? Number(held.items.total ?? held.subtotal) : Number(held.subtotal),
      notes: held.notes,
      items: normalizeItems(held.items),
      held_at: held.createdAt
    };
  }

  /**
   * Delete held order
   */
  async deleteHeldOrder(id, branchId) {
    const held = await prisma.heldOrder.findFirst({
      where: { id: parseInt(id), branchId }
    });

    if (!held) {
      throw new NotFoundError('Held order');
    }

    // Release table if occupied
    if (held.tableId) {
      await prisma.table.update({
        where: { id: held.tableId },
        data: { status: 'available', currentOrderId: null }
      });
    }

    await prisma.heldOrder.delete({ where: { id: parseInt(id) } });
    return { message: 'Held order deleted successfully' };
  }

  /**
   * Create order (initial state: pending)
   * Stock is NOT deducted here - only at invoice generation
   */
  async createOrder(data, userId, branchId) {
    const {
      customer_id,
      table_id,
      table,
      order_type = 'dine_in',
      order_source = 'pos',
      items,
      discount,
      notes,
      kitchen_notes,
      delivery_address,
      delivery_phone,
      payment,  // singular for backward compatibility
      payments, // plural for multiple payments
      heldOrderId,
      hold_id  // Alternative field name
    } = data;

    // Handle payments - support both single payment and payments array
    let paymentArray = [];
    if (payments && Array.isArray(payments)) {
      paymentArray = payments;
    } else if (payment) {
      // Convert single payment object to array
      paymentArray = [{
        method: payment.method,
        amount: payment.amount || payment.cash_amount || payment.card_amount,
        reference: payment.reference
      }];
    }

    // Handle table - can be table_id, table object, or table number
    const finalTableId = table_id || (table && table.id) || (typeof table === 'number' ? table : null);

    // Handle held order ID - can be heldOrderId or hold_id
    let finalHeldOrderId = heldOrderId || hold_id;

    // Validate held order exists if provided — if not found, ignore and proceed
    if (finalHeldOrderId) {
      const heldOrder = await prisma.heldOrder.findFirst({
        where: { id: finalHeldOrderId, branchId }
      });
      if (!heldOrder) {
        // Previously this threw NotFoundError; change: ignore missing held order
        // so order creation proceeds normally even if hold reference is stale.
        finalHeldOrderId = null;
      }
    }

    // Normalize order type to match enum
    const normalizeOrderType = (type) => {
      switch (type) {
        case 'dinein':
        case 'dine-in':
          return 'dine_in';
        case 'takeaway':
        case 'take-away':
          return 'take_away';
        case 'delivery':
          return 'delivery';
        case 'selfpickup':
        case 'self-pickup':
          return 'self_pickup';
        default:
          return type;
      }
    };

    const normalizedOrderType = normalizeOrderType(order_type);

    if (!items || items.length === 0) {
      throw new BadRequestError('Order must have at least one item');
    }

    // Get branch settings for tax
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      select: { settings: true }
    });
    const branchSettings = branch?.settings || {};
    const defaultTaxRate = branchSettings.tax_rate || 0;
    const finalTaxRate = data.tax_rate !== undefined ? data.tax_rate : defaultTaxRate;

    // Validate and prepare items
    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await prisma.product.findFirst({
        where: { id: item.product_id, branchId },
        include: {
          variations: item.variation_id ? { where: { id: item.variation_id } } : false
        }
      });

      if (!product) {
        throw new NotFoundError(`Product #${item.product_id}`);
      }

      if (!product.isActive) {
        throw new BadRequestError(`Product ${product.name} is not available`);
      }

      // Get variation if specified
      let variation = null;
      let unitPrice = item.price || item.unit_price || Number(product.sellingPrice);
      let variationName = null;
      let sku = product.sku;

      if (item.variation_id && product.variations) {
        variation = product.variations[0];
        if (!variation) {
          throw new NotFoundError(`Variation #${item.variation_id}`);
        }
        unitPrice = item.unit_price || item.price || Number(variation.price);
        variationName = variation.name;
        sku = variation.sku || sku;
      }

      // Validate stock availability (soft check - actual deduction at invoice)
      // Keep it consistent with product responses (stockQuantity on Product/Variation).
      if (product.trackStock) {
        const availableStock = variation ? variation.stockQuantity : product.stockQuantity;
        if (availableStock < item.quantity) {
          throw new InsufficientStockError(product.name);
        }
      }

      // Calculate item total
      let itemTotal = item.quantity * unitPrice;
      let modifiersTotal = 0;

      // Calculate modifiers total
      if (item.modifiers && item.modifiers.length > 0) {
        for (const mod of item.modifiers) {
          modifiersTotal += Number(mod.price || 0) * (mod.quantity || 1);
        }
        itemTotal += modifiersTotal * item.quantity;
      }

      // Apply item discount
      let discountAmount = 0;
      if (item.discount_type && item.discount_value) {
        if (item.discount_type === 'percentage') {
          discountAmount = (itemTotal * item.discount_value) / 100;
        } else {
          discountAmount = Math.min(item.discount_value, itemTotal);
        }
      }

      const itemSubtotal = itemTotal - discountAmount;
      const taxAmount = (itemSubtotal * finalTaxRate) / 100;
      const total = itemSubtotal + taxAmount;

      subtotal += itemSubtotal;

      orderItems.push({
        productId: product.id,
        variationId: item.variation_id || null,
        productName: product.name,
        variationName,
        sku,
        quantity: item.quantity,
        unitPrice,
        costPrice: Number(product.costPrice),
        discountAmount,
        taxAmount,
        total,
        modifiers: item.modifiers || null,
        notes: item.notes || null,
        status: 'pending'
      });
    }

    // Calculate order discount
    let orderDiscountAmount = 0;
    if (discount && discount.value) {
      if (discount.type === 'percentage') {
        orderDiscountAmount = (subtotal * discount.value) / 100;
      } else {
        orderDiscountAmount = Math.min(discount.value, subtotal);
      }
    }

    // Calculate order tax
    const taxableAmount = subtotal - orderDiscountAmount;
    const orderTaxAmount = (taxableAmount * finalTaxRate) / 100;

    // Calculate total
    const orderTotal = taxableAmount + orderTaxAmount;

    // Validate payments
    let totalPaid = 0;
    const orderPayments = [];

    if (paymentArray && paymentArray.length > 0) {
      for (const payment of paymentArray) {
        totalPaid += Number(payment.amount);
        orderPayments.push({
          paymentMethod: payment.method,
          amount: payment.amount,
          reference: payment.reference || null
        });
      }
    }

    // Determine payment status
    let paymentStatus = 'pending';
    let changeAmount = 0;

    if (totalPaid >= orderTotal) {
      paymentStatus = 'paid';
      changeAmount = totalPaid - orderTotal;
    } else if (totalPaid > 0) {
      paymentStatus = 'partial';
    }

    // Determine primary payment method
    let primaryPaymentMethod = 'cash';
    if (orderPayments.length > 0) {
      primaryPaymentMethod = orderPayments[0].paymentMethod;
    }

    // Create order in transaction (NO stock deduction yet)
    const order = await prisma.$transaction(async (tx) => {
      // Create order
      const orderCreateData = {
        branchId,
        customerId: customer_id || null,
        userId,
        tableId: finalTableId,
        orderNumber: this.generateOrderNumber(),
        orderType: normalizedOrderType,
        orderSource: order_source,
        subtotal,
        discountType: discount?.type || null,
        discountValue: discount?.value || 0,
        discountAmount: orderDiscountAmount,
        taxRate: finalTaxRate,
        taxAmount: orderTaxAmount,
        total: orderTotal,
        paymentStatus,
        paymentMethod: primaryPaymentMethod,
        paidAmount: totalPaid,
        changeAmount,
        status: paymentStatus === 'paid' ? 'completed' : 'pending', // Auto-complete if fully paid
        completedAt: paymentStatus === 'paid' ? new Date() : null,
        notes,
        kitchenNotes: kitchen_notes || null,
        deliveryAddress: delivery_address || null,
        deliveryPhone: delivery_phone || null,
        heldOrderId: finalHeldOrderId || null,
        items: { create: orderItems },
        payments: { create: orderPayments }
      };

      // Remove undefined values
      Object.keys(orderCreateData).forEach(key => {
        if (orderCreateData[key] === undefined) {
          delete orderCreateData[key];
        }
      });

      const newOrder = await tx.order.create({
        data: orderCreateData,
        include: {
          customer: true,
          user: { select: { id: true, name: true } },
          branch: { select: { id: true, name: true, address: true, phone: true, settings: true } },
          table: { 
            include: { hall: true }
          },
          items: true,
          payments: true,
          invoice: true
        }
      });

      // Update table status if dine-in
      if (finalTableId && normalizedOrderType === 'dine_in') {
        const updatedTable = await tx.table.update({
          where: { id: finalTableId },
          data: { status: 'occupied', currentOrderId: newOrder.id },
          include: { hall: true }
        });

        // Ensure API response contains the updated table state
        newOrder.table = updatedTable;
      }

      // If this order came from a held order, delete the held order NOW (regardless of payment status)
      // so it disappears from the held list immediately (previously it only got deleted when paid).
      if (finalHeldOrderId) {
        const heldOrderExists = await tx.heldOrder.findUnique({
          where: { id: finalHeldOrderId }
        });
        if (heldOrderExists) {
          await tx.heldOrder.delete({
            where: { id: finalHeldOrderId }
          });
        }
      }

      // Auto-generate invoice if order is completed (fully paid)
      let invoice = null;
      if (paymentStatus === 'paid') {
        invoice = await tx.invoice.create({
          data: {
            branchId,
            orderId: newOrder.id,
            customerId: newOrder.customerId,
            invoiceNumber: this.generateInvoiceNumber(),
            orderNumber: newOrder.orderNumber,
            subtotal: newOrder.subtotal,
            discountAmount: newOrder.discountAmount,
            taxAmount: newOrder.taxAmount,
            total: newOrder.total,
            paidAmount: totalPaid,
            status: 'paid'
          }
        });

        // Deduct inventory for completed orders
        for (const item of orderItems) {
          if (item.productId) {
            await tx.product.update({
              where: { id: item.productId },
              data: {
                stockQuantity: {
                  decrement: item.quantity
                }
              }
            });
          }
        }

        // Note: Invoice is already connected to order via orderId in invoice creation
      }

      return { order: newOrder, invoice };
    });

    return { order: this.formatOrderResponse(order.order), invoice: order.invoice };
  }

  /**
   * Hold order (save for later)
   */
  async holdOrder(data, userId, branchId) {
    const {
      customer_id,
      customer,
      table_id,
      table,
      order_type = 'dine_in',
      items,
      discount: discountObj,
      discount_type,
      discount_value,
      tax_rate,
      tax_amount,
      total_tax,
      notes
    } = data;

    // Build discount object: support both { type, value } object and flat discount_type/discount_value fields
    const discount = discountObj || (
      discount_type && discount_value
        ? { type: discount_type, value: Number(discount_value) }
        : null
    );

    // Handle customer - can be customer_id or customer object
    const finalCustomerId = customer_id || (customer && customer.id) || null;

    // Handle table - can be table_id, table object, or table number
    const finalTableId = table_id || (table && table.id) || (typeof table === 'number' ? table : null);

    // Normalize order type to match enum
    const normalizeOrderType = (type) => {
      switch (type) {
        case 'dinein':
        case 'dine-in':
          return 'dine_in';
        case 'takeaway':
        case 'take-away':
          return 'take_away';
        case 'delivery':
          return 'delivery';
        case 'selfpickup':
        case 'self-pickup':
          return 'self_pickup';
        default:
          return type;
      }
    };

    const normalizedOrderType = normalizeOrderType(order_type);

    if (!items || items.length === 0) {
      throw new BadRequestError('Order must have at least one item');
    }

    // Get branch settings
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      select: { settings: true }
    });
    const branchSettings = branch?.settings || {};
    const defaultTaxRate = branchSettings.tax_rate || 0;

    // Prepare items
    let subtotal = 0;
    const heldItems = [];

    for (const item of items) {
      const product = await prisma.product.findFirst({
        where: { id: item.product_id, branchId }
      });

      if (!product) {
        throw new NotFoundError(`Product #${item.product_id}`);
      }

      const unitPrice = item.unit_price || item.price || Number(product.sellingPrice);
      const total = item.quantity * unitPrice;

      // Calculate item discount
      let itemDiscount = 0;
      if (item.discount_type === 'percentage' && item.discount_value > 0) {
        itemDiscount = (total * item.discount_value) / 100;
      } else if (item.discount_type === 'fixed' && item.discount_value > 0) {
        itemDiscount = Math.min(item.discount_value, total);
      }

      subtotal += total - itemDiscount;

      // Store in JSON using frontend-friendly keys
      heldItems.push({
        product_id: product.id,
        product_name: product.name,
        variation_id: item.variation_id || null,
        variation_name: item.variation_name || null,
        quantity: item.quantity,
        unit_price: unitPrice,
        total: total - itemDiscount,
        discount_type: item.discount_type || null,
        discount_value: item.discount_value || 0,
        tax_rate: item.tax_rate ?? 0,
        modifiers: item.modifiers || null,
        notes: item.notes || null
      });
    }

    // Calculate discount
    let discountAmount = 0;
    if (discount && discount.value) {
      if (discount.type === 'percentage') {
        discountAmount = (subtotal * discount.value) / 100;
      } else {
        discountAmount = Math.min(discount.value, subtotal);
      }
    }

    const taxableAmount = subtotal - discountAmount;
    
    // Use provided tax values or calculate from branch settings
    const finalTaxRate = tax_rate !== undefined ? Number(tax_rate) : defaultTaxRate;
    const finalTaxAmount = tax_amount !== undefined ? Number(tax_amount) : (total_tax !== undefined ? Number(total_tax) : (taxableAmount * finalTaxRate) / 100);
    const total = taxableAmount + finalTaxAmount;

    // Create held order
    const held = await prisma.$transaction(async (tx) => {
      const newHeld = await tx.heldOrder.create({
        data: {
          branchId,
          userId,
          customerId: finalCustomerId,
          tableId: finalTableId,
          orderType: normalizedOrderType,
          subtotal,
          discountType: discount?.type || null,
          discountValue: discount?.value || 0,
          taxRate: finalTaxRate,
          taxAmount: finalTaxAmount,
          notes,
          // Prisma schema: HeldOrder.items is Json
          items: {
            items: heldItems,
            discount: discount || null,
            tax_amount: finalTaxAmount,
            total,
            subtotal
          }
        },
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          table: {
            include: {
              hall: { select: { id: true, name: true } }
            }
          }
        }
      });

      // Update table status if dine-in
      let tableForResponse = newHeld.table;
      if (finalTableId && normalizedOrderType === 'dine_in') {
        tableForResponse = await tx.table.update({
          where: { id: finalTableId },
          // When holding an order, keep table occupied but clear any stale currentOrderId.
          data: { status: 'occupied', currentOrderId: null },
          include: {
            hall: { select: { id: true, name: true } }
          }
        });
      }

      return { ...newHeld, table: tableForResponse };
    });

    return {
      id: held.id,
      order_type: held.orderType,
      customer: held.customer,
      table: held.table,
      subtotal: Number(held.subtotal),
      tax_rate: Number(held.taxRate),
      tax_amount: Number(held.taxAmount),
      total: Number(held.items?.total ?? held.subtotal),
      items_count: Array.isArray(held.items?.items) ? held.items.items.length : 0,
      held_at: held.createdAt
    };
  }

  /**
   * Resume held order (convert to pending order)
   */
  async resumeHeldOrder(heldOrderId, userId, branchId) {
    const held = await prisma.heldOrder.findFirst({
      where: { id: parseInt(heldOrderId), branchId },
      include: {
        table: {
          include: {
            hall: true
          }
        }
      }
    });

    if (!held) {
      throw new NotFoundError('Held order');
    }

    const normalizeItems = (value) => {
      if (Array.isArray(value)) return value;
      if (value && typeof value === 'object' && Array.isArray(value.items)) return value.items;
      return [];
    };

    const heldItems = normalizeItems(held.items);

    // Calculate tax_rate from held order if available
    let tax_rate;
    if (held.items?.tax_amount && held.subtotal) {
      tax_rate = (Number(held.items.tax_amount) / Number(held.subtotal)) * 100;
    }

    // Convert to regular order
    const heldOrderDiscount =
      held.items?.discount ||
      (held.discountType
        ? { type: held.discountType, value: Number(held.discountValue) || 0 }
        : null);

    const orderData = {
      customer_id: held.customerId,
      table_id: held.tableId,
      order_type: held.orderType,
      items: heldItems.map((item) => {
        const discountType = item.discount_type ?? item.discountType ?? null;
        const discountValueRaw = item.discount_value ?? item.discountValue ?? 0;

        return {
          product_id: item.product_id ?? item.productId,
          variation_id: item.variation_id ?? item.variationId,
          quantity: item.quantity,
          unit_price: item.unit_price ?? item.unitPrice,
          discount_type: discountType,
          discount_value: Number(discountValueRaw) || 0,
          modifiers: item.modifiers,
          notes: item.notes,
        };
      }),
      discount: heldOrderDiscount,
      tax_rate,
      notes: held.notes,
      heldOrderId: held.id  // Track which held order this came from
    };

    const result = await this.createOrder(orderData, userId, branchId);

    // Enrich response with discount_type/discount_value from held JSON.
    // Order items table stores only discount_amount, but frontend needs the original discount info.
    const heldByProductVariation = new Map();
    for (const hi of heldItems) {
      const productId = Number(hi.product_id ?? hi.productId);
      const variationId = hi.variation_id ?? hi.variationId ?? null;
      const key = `${productId}:${variationId ?? ''}`;
      const list = heldByProductVariation.get(key) || [];
      list.push(hi);
      heldByProductVariation.set(key, list);
    }

    const enrichedItems = (result?.order?.items || []).map((oi) => {
      const key = `${Number(oi.product_id)}:${(oi.variation_id ?? '')}`;
      const candidates = heldByProductVariation.get(key) || [];
      if (candidates.length === 0) return oi;

      // Prefer match by unit_price/quantity if possible (avoids wrong match when duplicates exist)
      const exact = candidates.find((c) =>
        Number(c.unit_price ?? c.unitPrice ?? 0) === Number(oi.unit_price) &&
        Number(c.quantity ?? 0) === Number(oi.quantity)
      );

      const src = exact || candidates[0];
      return {
        ...oi,
        discount_type: src.discount_type ?? src.discountType ?? null,
        discount_value: Number(src.discount_value ?? src.discountValue ?? 0) || 0,
      };
    });

    // `createOrder` already returns a formatted order response.
    // Do NOT call `formatOrderResponse` again (it expects raw Prisma model fields).
    return {
      ...result.order,
      items: enrichedItems,
      table: result.order.table || held.table || null
    };
  }

  /**
   * Update order status (state machine validation)
   */
  async updateOrderStatus(id, status, userId, branchId) {
    const order = await prisma.order.findFirst({
      where: { id: parseInt(id), branchId },
      include: { table: true }
    });

    if (!order) {
      throw new NotFoundError('Order');
    }

    if (!this.canTransition(order.status, status)) {
      throw new AppError(`Cannot transition from ${order.status} to ${status}`, 400, 'ORD_STATUS');
    }

    const updateData = { status };

    // Handle completed state
    if (status === 'completed') {
      updateData.completedAt = new Date();
    }

    // Handle cancelled state
    if (status === 'cancelled') {
      updateData.cancelledAt = new Date();
      updateData.cancelledById = userId;

      // Free table if dine-in
      if (order.tableId && order.orderType === 'dine_in') {
        await prisma.table.update({
          where: { id: order.tableId },
          data: { status: 'available', currentOrderId: null }
        });
      }
    }

    const updatedOrder = await prisma.order.update({
      where: { id: parseInt(id) },
      data: updateData
    });

    return {
      id: updatedOrder.id,
      order_number: updatedOrder.orderNumber,
      status: updatedOrder.status,
      previous_status: order.status
    };
  }

  /**
   * Reopen an order (move back to confirmed).
   * Frontend uses POST /orders/:id/reopen.
   */
  async reopenOrder(id, userId, branchId) {
    const order = await prisma.order.findFirst({
      where: { id: parseInt(id), branchId },
      include: { table: true, invoice: true }
    });

    if (!order) {
      throw new NotFoundError('Order');
    }

    // Reopening an invoiced order would require reversing inventory/accounting.
    if (order.status === 'invoiced') {
      throw new AppError('Cannot reopen an invoiced order. Use refund instead.', 422, 'ORD_REOPEN');
    }

    if (order.status !== 'completed' && order.status !== 'cancelled') {
      throw new AppError(`Cannot reopen an order in status ${order.status}`, 422, 'ORD_REOPEN');
    }

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'confirmed',
        cancelledAt: null,
        cancelledById: null
      }
    });

    if (updated.tableId && order.orderType === 'dine_in') {
      await prisma.table.update({
        where: { id: updated.tableId },
        data: { status: 'occupied', currentOrderId: updated.id }
      });
    }

    return { id: updated.id, status: updated.status };
  }

  /**
   * COMPLETE ORDER - Critical endpoint
   * This is the ONLY way to generate invoice
   * 
   * Flow:
   * 1. Validate order can be completed
   * 2. Lock order (set status to completed)
   * 3. Generate invoice from order
   * 4. Deduct inventory
   * 5. Create accounting journal entries
   * 6. Update order status to invoiced
   * 7. Update customer stats
   * 8. Free table if dine-in
   */
  async completeOrder(id, userId, branchId, paymentData = {}) {
    const order = await prisma.order.findFirst({
      where: { id: parseInt(id), branchId },
      include: {
        items: { include: { product: true } },
        customer: true,
        table: true,
        payments: true
      }
    });

    if (!order) {
      throw new NotFoundError('Order');
    }

    // Check if already invoiced
    if (order.status === 'invoiced') {
      throw new BadRequestError('Order already invoiced');
    }

    // Validate transition to completed (if not already)
    if (order.status !== 'completed') {
      if (!this.canTransition(order.status, 'completed')) {
        throw new AppError(`Cannot complete order from ${order.status} state`, 400, 'ORD_STATUS');
      }
    }

    // Handle additional payment if provided
    let totalPaid = Number(order.paidAmount);
    let newPayments = [];

    if (paymentData.payments && paymentData.payments.length > 0) {
      for (const payment of paymentData.payments) {
        totalPaid += Number(payment.amount);
        newPayments.push({
          orderId: order.id,
          paymentMethod: payment.method,
          amount: payment.amount,
          reference: payment.reference || null
        });
      }
    }

    const orderTotal = Number(order.total);
    
    // Validate payment
    if (totalPaid < orderTotal) {
      throw new BadRequestError(`Insufficient payment. Required: ${orderTotal}, Paid: ${totalPaid}`);
    }

    const changeAmount = totalPaid - orderTotal;

    // Execute complete flow in transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Add new payments if any
      if (newPayments.length > 0) {
        await tx.orderPayment.createMany({ data: newPayments });
      }

      // 2. Update order to completed
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: 'completed',
          completedAt: new Date(),
          paymentStatus: 'paid',
          paidAmount: totalPaid,
          changeAmount,
          paymentMethod: paymentData.payments?.[0]?.method || order.paymentMethod
        }
      });

      // 3. Generate Invoice
      const invoice = await tx.invoice.create({
        data: {
          branchId,
          orderId: order.id,
          customerId: order.customerId,
          invoiceNumber: this.generateInvoiceNumber(),
          orderNumber: order.orderNumber,
          subtotal: order.subtotal,
          discountAmount: order.discountAmount,
          taxAmount: order.taxAmount,
          total: order.total,
          paidAmount: totalPaid,
          status: 'paid'
        }
      });

      // 4. Deduct Inventory
      for (const item of order.items) {
        if (item.product && item.product.trackStock) {
          const stock = await tx.productStock.findUnique({
            where: {
              productId_branchId: {
                productId: item.productId,
                branchId
              }
            }
          });

          if (stock) {
            const beforeQty = stock.stockQuantity;
            const afterQty = Math.max(0, beforeQty - item.quantity);

            await tx.productStock.update({
              where: {
                productId_branchId: {
                  productId: item.productId,
                  branchId
                }
              },
              data: { stockQuantity: afterQty }
            });

            // Create inventory movement
            await tx.inventoryMovement.create({
              data: {
                branchId,
                productId: item.productId,
                variationId: item.variationId,
                userId,
                type: 'out',
                reason: 'sale',
                quantity: item.quantity,
                quantityBefore: beforeQty,
                quantityAfter: afterQty,
                unitCost: item.costPrice,
                reference: invoice.invoiceNumber,
                notes: `Sale - Invoice ${invoice.invoiceNumber}`
              }
            });
          }
        }
      }

      // 5. Create Accounting Journal Entry
      await this.createSaleJournalEntry(tx, order, invoice, branchId);

      // 6. Update order status to invoiced
      await tx.order.update({
        where: { id: order.id },
        data: { status: 'invoiced' }
      });

      // 6.5. Delete associated held order if it exists
      if (order.heldOrderId) {
        const heldOrderExists = await tx.heldOrder.findUnique({
          where: { id: order.heldOrderId }
        });
        if (heldOrderExists) {
          await tx.heldOrder.delete({
            where: { id: order.heldOrderId }
          });
        }
      }

      // 7. Update customer stats
      if (order.customerId) {
        await tx.customer.update({
          where: { id: order.customerId },
          data: {
            totalOrders: { increment: 1 },
            totalSpent: { increment: Number(order.total) },
            lastOrderAt: new Date()
          }
        });
      }

      // 8. Free table if dine-in
      if (order.tableId && order.orderType === 'dine_in') {
        await tx.table.update({
          where: { id: order.tableId },
          data: { status: 'available', currentOrderId: null }
        });
      }

      return { order, invoice };
    });

    // Return complete response
    const completedOrder = await this.getOrderById(result.order.id, branchId);
    
    return {
      order: completedOrder,
      invoice: {
        id: result.invoice.id,
        invoice_number: result.invoice.invoiceNumber,
        order_number: result.invoice.orderNumber,
        subtotal: Number(result.invoice.subtotal),
        discount_amount: Number(result.invoice.discountAmount),
        tax_amount: Number(result.invoice.taxAmount),
        total: Number(result.invoice.total),
        paid_amount: Number(result.invoice.paidAmount),
        status: result.invoice.status,
        created_at: result.invoice.createdAt
      }
    };
  }

  /**
   * Create sale journal entry (double-entry accounting)
   */
  async createSaleJournalEntry(tx, order, invoice, branchId) {
    // Find required accounts
    const cashAccount = await tx.account.findFirst({
      where: { 
        branchId, 
        OR: [
          { code: '111111' }, // Counter 1 Cash
          { code: '1111' },   // Cash on Hand
          { code: '111' },    // Cash & Bank
          { name: { contains: 'Cash' }, type: 'asset' }
        ]
      }
    });

    const salesAccount = await tx.account.findFirst({
      where: { 
        branchId, 
        OR: [
          { code: '41' },     // Sales Revenue
          { code: '4' },      // Revenue
          { name: { contains: 'Sales' }, type: 'revenue' }
        ]
      }
    });

    if (!cashAccount || !salesAccount) {
      // Skip journal entry if accounts not set up
      console.warn('Accounting accounts not found - skipping journal entry');
      return null;
    }

    const total = Number(order.total);
    const taxAmount = Number(order.taxAmount);
    const salesAmount = total - taxAmount;

    // Generate entry number
    const lastEntry = await tx.journalEntry.findFirst({
      where: { branchId },
      orderBy: { createdAt: 'desc' }
    });
    const entryCount = lastEntry ? parseInt(lastEntry.entryNumber.slice(2)) + 1 : 1;
    const entryNumber = `JE${entryCount.toString().padStart(6, '0')}`;

    // Create journal entry
    const journalEntry = await tx.journalEntry.create({
      data: {
        branchId,
        entryNumber,
        entryDate: new Date(),
        entryType: 'general',
        description: `Sale - Invoice ${invoice.invoiceNumber}`,
        reference: invoice.invoiceNumber,
        totalDebit: total,
        totalCredit: total,
        status: 'posted'
      }
    });

    // Debit Cash
    await tx.journalEntryLine.create({
      data: {
        entryId: journalEntry.id,
        accountId: cashAccount.id,
        description: 'Cash received from sale',
        debit: total,
        credit: 0
      }
    });

    // Credit Sales
    await tx.journalEntryLine.create({
      data: {
        entryId: journalEntry.id,
        accountId: salesAccount.id,
        description: 'Sales revenue',
        debit: 0,
        credit: salesAmount
      }
    });

    // Credit Tax if applicable
    if (taxAmount > 0) {
      const taxAccount = await tx.account.findFirst({
        where: { 
          branchId,
          OR: [
            { code: '2102' },
            { name: { contains: 'Tax Payable' }, type: 'liability' }
          ]
        }
      });

      if (taxAccount) {
        await tx.journalEntryLine.create({
          data: {
            entryId: journalEntry.id,
            accountId: taxAccount.id,
            description: 'Tax collected',
            debit: 0,
            credit: taxAmount
          }
        });
      }
    }

    // Update account balances
    await tx.account.update({
      where: { id: cashAccount.id },
      data: { balance: { increment: total } }
    });

    await tx.account.update({
      where: { id: salesAccount.id },
      data: { balance: { increment: salesAmount } }
    });

    return journalEntry;
  }

  /**
   * Cancel order
   */
  async cancelOrder(id, userId, reason, branchId) {
    const order = await prisma.order.findFirst({
      where: { id: parseInt(id), branchId },
      include: { table: true }
    });

    if (!order) {
      throw new NotFoundError('Order');
    }

    if (!this.canTransition(order.status, 'cancelled')) {
      throw new AppError(`Cannot cancel order from ${order.status} state`, 400, 'ORD_STATUS');
    }

    const updated = await prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          status: 'cancelled',
          cancelledAt: new Date(),
          cancelledById: userId,
          cancelReason: reason
        }
      });

      // Free table if dine-in
      if (order.tableId && order.orderType === 'dine_in') {
        await tx.table.update({
          where: { id: order.tableId },
          data: { status: 'available', currentOrderId: null }
        });
      }

      return updatedOrder;
    });

    return {
      id: updated.id,
      order_number: updated.orderNumber,
      status: updated.status,
      cancel_reason: reason,
      cancelled_at: updated.cancelledAt
    };
  }

  /**
   * Refund order (only for invoiced orders)
   */
  async refundOrder(id, userId, refundData, branchId) {
    const order = await prisma.order.findFirst({
      where: { id: parseInt(id), branchId },
      include: { 
        items: { include: { product: true } },
        invoice: true 
      }
    });

    if (!order) {
      throw new NotFoundError('Order');
    }

    if (order.status !== 'invoiced' && order.status !== 'completed') {
      throw new BadRequestError('Only completed/invoiced orders can be refunded');
    }

    const { amount, reason, items: refundItems } = refundData;
    const refundAmount = amount || Number(order.total);

    const result = await prisma.$transaction(async (tx) => {
      // Update order
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: 'refunded',
          refundedAt: new Date(),
          refundedById: userId,
          refundReason: reason,
          refundAmount
        }
      });

      // Update invoice if exists
      if (order.invoice) {
        await tx.invoice.update({
          where: { id: order.invoice.id },
          data: { status: 'cancelled' }
        });
      }

      // Restore inventory for full refund or specified items
      const itemsToRestore = refundItems || order.items;
      
      for (const item of itemsToRestore) {
        const productId = item.productId || item.product_id;
        const quantity = item.quantity;

        const product = order.items.find(i => i.productId === productId)?.product;
        
        if (product && product.trackStock) {
          const stock = await tx.productStock.findUnique({
            where: {
              productId_branchId: { productId, branchId }
            }
          });

          if (stock) {
            const beforeQty = stock.stockQuantity;
            const afterQty = beforeQty + quantity;

            await tx.productStock.update({
              where: {
                productId_branchId: { productId, branchId }
              },
              data: { stockQuantity: afterQty }
            });

            // Create inventory movement
            await tx.inventoryMovement.create({
              data: {
                branchId,
                productId,
                userId,
                type: 'in',
                reason: 'return_stock',
                quantity,
                quantityBefore: beforeQty,
                quantityAfter: afterQty,
                reference: order.orderNumber,
                notes: `Refund - Order ${order.orderNumber}`
              }
            });
          }
        }
      }

      // Create refund journal entry
      await this.createRefundJournalEntry(tx, order, refundAmount, branchId);

      return order;
    });

    return {
      id: result.id,
      order_number: result.orderNumber,
      status: 'refunded',
      refund_amount: refundAmount,
      refund_reason: reason
    };
  }

  /**
   * Create refund journal entry
   */
  async createRefundJournalEntry(tx, order, refundAmount, branchId) {
    const cashAccount = await tx.account.findFirst({
      where: { branchId, type: 'asset', name: { contains: 'Cash' } }
    });

    const salesAccount = await tx.account.findFirst({
      where: { branchId, type: 'revenue' }
    });

    if (!cashAccount || !salesAccount) return null;

    const lastEntry = await tx.journalEntry.findFirst({
      where: { branchId },
      orderBy: { createdAt: 'desc' }
    });
    const entryCount = lastEntry ? parseInt(lastEntry.entryNumber.slice(2)) + 1 : 1;
    const entryNumber = `JE${entryCount.toString().padStart(6, '0')}`;

    const journalEntry = await tx.journalEntry.create({
      data: {
        branchId,
        entryNumber,
        entryDate: new Date(),
        entryType: 'general',
        description: `Refund - Order ${order.orderNumber}`,
        reference: order.orderNumber,
        totalDebit: refundAmount,
        totalCredit: refundAmount,
        status: 'posted'
      }
    });

    // Debit Sales (reduce revenue)
    await tx.journalEntryLine.create({
      data: {
        entryId: journalEntry.id,
        accountId: salesAccount.id,
        description: 'Sales refund',
        debit: refundAmount,
        credit: 0
      }
    });

    // Credit Cash (money out)
    await tx.journalEntryLine.create({
      data: {
        entryId: journalEntry.id,
        accountId: cashAccount.id,
        description: 'Cash refund',
        debit: 0,
        credit: refundAmount
      }
    });

    // Update balances
    await tx.account.update({
      where: { id: cashAccount.id },
      data: { balance: { decrement: refundAmount } }
    });

    await tx.account.update({
      where: { id: salesAccount.id },
      data: { balance: { decrement: refundAmount } }
    });

    return journalEntry;
  }

  /**
   * Update order item status (for kitchen)
   */
  async updateItemStatus(orderId, itemId, status, branchId) {
    const order = await prisma.order.findFirst({
      where: { id: parseInt(orderId), branchId }
    });

    if (!order) {
      throw new NotFoundError('Order');
    }

    const item = await prisma.orderItem.findFirst({
      where: { id: parseInt(itemId), orderId: parseInt(orderId) }
    });

    if (!item) {
      throw new NotFoundError('Order item');
    }

    const updatedItem = await prisma.orderItem.update({
      where: { id: parseInt(itemId) },
      data: { status }
    });

    // Check if all items are ready
    const allItems = await prisma.orderItem.findMany({
      where: { orderId: parseInt(orderId) }
    });

    const allReady = allItems.every(i => 
      i.status === 'ready' || i.status === 'served' || i.status === 'cancelled'
    );

    if (allReady && ['preparing', 'kitchen'].includes(order.status)) {
      await prisma.order.update({
        where: { id: parseInt(orderId) },
        data: { status: 'ready' }
      });
    }

    return {
      id: updatedItem.id,
      status: updatedItem.status
    };
  }

  /**
   * Add payment to order
   */
  async addPayment(orderId, paymentData, branchId) {
    const order = await prisma.order.findFirst({
      where: { id: parseInt(orderId), branchId }
    });

    if (!order) {
      throw new NotFoundError('Order');
    }

    if (order.paymentStatus === 'paid') {
      throw new AppError('Order is already fully paid', 400, 'ORD_PAID');
    }

    const { method, amount, reference } = paymentData;
    const newPaidAmount = Number(order.paidAmount) + Number(amount);
    const orderTotal = Number(order.total);

    let paymentStatus = 'partial';
    let changeAmount = 0;

    if (newPaidAmount >= orderTotal) {
      paymentStatus = 'paid';
      changeAmount = newPaidAmount - orderTotal;
    }

    const [payment] = await prisma.$transaction([
      prisma.orderPayment.create({
        data: {
          orderId: parseInt(orderId),
          paymentMethod: method,
          amount,
          reference
        }
      }),
      prisma.order.update({
        where: { id: parseInt(orderId) },
        data: {
          paidAmount: newPaidAmount,
          changeAmount,
          paymentStatus
        }
      })
    ]);

    return {
      id: payment.id,
      payment_method: payment.paymentMethod,
      amount: Number(payment.amount),
      reference: payment.reference,
      order_paid_amount: newPaidAmount,
      order_payment_status: paymentStatus,
      change_amount: changeAmount
    };
  }

  /**
   * Get order receipt
   */
  async getOrderReceipt(id) {
    const order = await this.getOrderById(id);
    
    return {
      ...order,
      receipt_generated_at: new Date().toISOString()
    };
  }

  /**
   * Get valid transitions for a status
   */
  getValidTransitions(status) {
    return ORDER_TRANSITIONS[status] || [];
  }
}

module.exports = new OrderService();

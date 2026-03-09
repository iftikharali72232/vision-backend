/**
 * Payment Service
 * Handles Stripe payment integration for SaaS subscription billing
 * Supports: Stripe (international), manual/cash (local)
 */

const { systemPrisma } = require('../config/database');
const { AppError } = require('../middlewares/errorHandler');

// Conditionally load Stripe if configured
let stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
  const Stripe = require('stripe');
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
}

class PaymentService {
  /**
   * Create a Stripe checkout session for subscription payment
   */
  async createCheckoutSession(companyId, planId, period = 'monthly') {
    if (!stripe) {
      throw new AppError('Stripe is not configured', 500, 'PAYMENT_001');
    }

    const plan = await systemPrisma.subscriptionPlan.findUnique({
      where: { id: parseInt(planId) }
    });
    if (!plan) throw new AppError('Plan not found', 404, 'PAYMENT_002');

    const company = await systemPrisma.company.findUnique({
      where: { id: parseInt(companyId) },
      include: { users: { where: { isMaster: true }, take: 1 } }
    });
    if (!company) throw new AppError('Company not found', 404, 'PAYMENT_003');

    const amount = period === 'yearly'
      ? Number(plan.yearlyPrice) * 100  // Stripe uses cents
      : Number(plan.monthlyPrice) * 100;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'pkr',
          product_data: {
            name: `${plan.name} Plan - ${period === 'yearly' ? 'Yearly' : 'Monthly'}`,
            description: plan.description || `${plan.name} subscription plan`,
          },
          unit_amount: Math.round(amount),
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/subscription-payment?status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/subscription-payment?status=cancelled`,
      metadata: {
        company_id: String(companyId),
        plan_id: String(planId),
        period: period,
      },
      customer_email: company.email || company.users[0]?.email,
    });

    // Create pending subscription invoice
    const invoiceNumber = await this.generateInvoiceNumber();
    const now = new Date();
    const periodEnd = new Date(now);
    if (period === 'yearly') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setDate(periodEnd.getDate() + 30);
    }

    await systemPrisma.subscriptionInvoice.create({
      data: {
        companyId: company.id,
        planId: plan.id,
        invoiceNumber,
        amount: period === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice,
        tax: 0,
        total: period === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice,
        currency: 'PKR',
        period,
        paymentMethod: 'stripe',
        stripePaymentId: session.id,
        status: 'pending',
        billingName: company.name,
        billingEmail: company.email,
        periodStart: now,
        periodEnd,
      }
    });

    return {
      session_id: session.id,
      checkout_url: session.url,
      invoice_number: invoiceNumber,
    };
  }

  /**
   * Handle Stripe webhook events
   */
  async handleWebhook(event) {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        await this.handleSuccessfulPayment(session);
        break;
      }
      case 'checkout.session.expired': {
        const session = event.data.object;
        await this.handleFailedPayment(session);
        break;
      }
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;
        console.log('Payment failed:', paymentIntent.id);
        break;
      }
    }
  }

  /**
   * Handle successful Stripe payment
   */
  async handleSuccessfulPayment(session) {
    const { company_id, plan_id, period } = session.metadata;

    // Update subscription invoice
    const invoice = await systemPrisma.subscriptionInvoice.findFirst({
      where: { stripePaymentId: session.id }
    });

    if (invoice) {
      await systemPrisma.subscriptionInvoice.update({
        where: { id: invoice.id },
        data: {
          status: 'paid',
          paymentRef: session.payment_intent,
          paidAt: new Date(),
        }
      });
    }

    // Activate subscription
    await this.activateSubscription(
      parseInt(company_id),
      parseInt(plan_id),
      period,
      'stripe',
      session.payment_intent
    );
  }

  /**
   * Handle failed Stripe payment
   */
  async handleFailedPayment(session) {
    const invoice = await systemPrisma.subscriptionInvoice.findFirst({
      where: { stripePaymentId: session.id }
    });

    if (invoice) {
      await systemPrisma.subscriptionInvoice.update({
        where: { id: invoice.id },
        data: { status: 'failed' }
      });
    }
  }

  /**
   * Process manual/cash payment (verified by admin or self-reported)
   */
  async processManualPayment(companyId, planId, period = 'monthly', paymentMethod = 'cash', reference = null) {
    const plan = await systemPrisma.subscriptionPlan.findUnique({
      where: { id: parseInt(planId) }
    });
    if (!plan) throw new AppError('Plan not found', 404, 'PAYMENT_002');

    const company = await systemPrisma.company.findUnique({
      where: { id: parseInt(companyId) }
    });
    if (!company) throw new AppError('Company not found', 404, 'PAYMENT_003');

    const amount = period === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
    const now = new Date();
    const periodEnd = new Date(now);
    if (period === 'yearly') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setDate(periodEnd.getDate() + 30);
    }

    // Create paid invoice
    const invoiceNumber = await this.generateInvoiceNumber();
    await systemPrisma.subscriptionInvoice.create({
      data: {
        companyId: company.id,
        planId: plan.id,
        invoiceNumber,
        amount,
        tax: 0,
        total: amount,
        currency: 'PKR',
        period,
        paymentMethod,
        paymentRef: reference,
        status: 'paid',
        billingName: company.name,
        billingEmail: company.email,
        periodStart: now,
        periodEnd,
        paidAt: now,
      }
    });

    // Activate subscription
    await this.activateSubscription(
      company.id,
      plan.id,
      period,
      paymentMethod,
      reference
    );

    return {
      invoice_number: invoiceNumber,
      amount,
      period,
      expires_at: periodEnd,
    };
  }

  /**
   * Activate subscription - shared between Stripe and manual payments
   */
  async activateSubscription(companyId, planId, period, paymentMethod, reference) {
    const plan = await systemPrisma.subscriptionPlan.findUnique({
      where: { id: planId }
    });

    const now = new Date();
    const expiryDate = new Date(now);
    if (period === 'yearly') {
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    } else {
      expiryDate.setDate(expiryDate.getDate() + 30);
    }

    // Update company
    await systemPrisma.company.update({
      where: { id: companyId },
      data: {
        planId,
        subscriptionEndsAt: expiryDate,
        status: 'active',
      }
    });

    // Record subscription history
    await systemPrisma.subscriptionHistory.create({
      data: {
        companyId,
        planId,
        amount: period === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice,
        period,
        paymentMethod,
        status: 'completed',
        expiresAt: expiryDate,
        notes: reference ? `Payment ref: ${reference}` : null,
      }
    });
  }

  /**
   * Get subscription plans (public)
   */
  async getPlans() {
    const plans = await systemPrisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' }
    });

    return plans.map(p => ({
      id: p.id,
      name: p.name,
      code: p.code,
      description: p.description,
      features: p.features,
      monthly_price: p.monthlyPrice,
      yearly_price: p.yearlyPrice,
      max_products: p.maxProducts,
      max_branches: p.maxBranches,
      max_users: p.maxUsers,
      max_orders_per_month: p.maxOrdersPerMonth,
      storage_limit: p.storageLimit,
      trial_days: p.trialDays,
    }));
  }

  /**
   * Get subscription status for a company
   */
  async getSubscriptionStatus(companyId) {
    const company = await systemPrisma.company.findUnique({
      where: { id: parseInt(companyId) },
      include: { plan: true }
    });

    if (!company) throw new AppError('Company not found', 404);

    const now = new Date();
    const isExpired = company.subscriptionEndsAt && now > company.subscriptionEndsAt;
    const daysRemaining = company.subscriptionEndsAt
      ? Math.max(0, Math.ceil((company.subscriptionEndsAt - now) / (1000 * 60 * 60 * 24)))
      : 0;

    // Get billing history
    const invoices = await systemPrisma.subscriptionInvoice.findMany({
      where: { companyId: company.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { plan: true }
    });

    return {
      company: {
        id: company.id,
        name: company.name,
        status: company.status,
      },
      subscription: {
        plan: company.plan ? {
          id: company.plan.id,
          name: company.plan.name,
          code: company.plan.code,
          monthly_price: company.plan.monthlyPrice,
          yearly_price: company.plan.yearlyPrice,
          features: company.plan.features,
          limits: {
            max_products: company.plan.maxProducts,
            max_branches: company.plan.maxBranches,
            max_users: company.plan.maxUsers,
            max_orders_per_month: company.plan.maxOrdersPerMonth,
            storage_limit: company.plan.storageLimit,
          }
        } : null,
        ends_at: company.subscriptionEndsAt,
        is_expired: isExpired,
        days_remaining: daysRemaining,
        status: isExpired ? 'expired' : company.status,
      },
      invoices: invoices.map(inv => ({
        id: inv.id,
        invoice_number: inv.invoiceNumber,
        amount: inv.total,
        currency: inv.currency,
        period: inv.period,
        payment_method: inv.paymentMethod,
        status: inv.status,
        period_start: inv.periodStart,
        period_end: inv.periodEnd,
        paid_at: inv.paidAt,
        plan_name: inv.plan?.name,
      })),
    };
  }

  /**
   * Get usage stats to check against plan limits
   */
  async getUsageStats(companyId, tenantPrisma) {
    const company = await systemPrisma.company.findUnique({
      where: { id: parseInt(companyId) },
      include: { plan: true, users: { where: { isDeveloper: false } } }
    });

    if (!company) throw new AppError('Company not found', 404);

    // Count products across all branches
    const productCount = await tenantPrisma.product.count();
    const branchCount = await tenantPrisma.branch.count();
    const userCount = company.users.length;

    // Count orders this month
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const orderCount = await tenantPrisma.order.count({
      where: { createdAt: { gte: monthStart } }
    });

    const plan = company.plan;
    return {
      products: { used: productCount, limit: plan?.maxProducts || 999999, percentage: plan ? Math.round((productCount / plan.maxProducts) * 100) : 0 },
      branches: { used: branchCount, limit: plan?.maxBranches || 999999, percentage: plan ? Math.round((branchCount / plan.maxBranches) * 100) : 0 },
      users: { used: userCount, limit: plan?.maxUsers || 999999, percentage: plan ? Math.round((userCount / plan.maxUsers) * 100) : 0 },
      orders_this_month: { used: orderCount, limit: plan?.maxOrdersPerMonth || 999999, percentage: plan ? Math.round((orderCount / plan.maxOrdersPerMonth) * 100) : 0 },
    };
  }

  /**
   * Upgrade or downgrade plan
   */
  async changePlan(companyId, newPlanId, period = 'monthly', paymentMethod = 'stripe') {
    const newPlan = await systemPrisma.subscriptionPlan.findUnique({
      where: { id: parseInt(newPlanId) }
    });
    if (!newPlan) throw new AppError('Plan not found', 404);

    // For Stripe, create a checkout session
    if (paymentMethod === 'stripe' && stripe) {
      return this.createCheckoutSession(companyId, newPlanId, period);
    }

    // For manual, process immediately
    return this.processManualPayment(companyId, newPlanId, period, paymentMethod);
  }

  /**
   * Generate unique invoice number
   */
  async generateInvoiceNumber() {
    const date = new Date();
    const prefix = `INV-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    const lastInvoice = await systemPrisma.subscriptionInvoice.findFirst({
      where: { invoiceNumber: { startsWith: prefix } },
      orderBy: { invoiceNumber: 'desc' }
    });

    let seq = 1;
    if (lastInvoice) {
      const lastSeq = parseInt(lastInvoice.invoiceNumber.split('-').pop());
      if (!isNaN(lastSeq)) seq = lastSeq + 1;
    }

    return `${prefix}-${String(seq).padStart(4, '0')}`;
  }
}

module.exports = new PaymentService();

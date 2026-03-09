/**
 * Subscription Routes
 * Handles subscription management, plan browsing, payment processing
 * 
 * Routes:
 *   GET  /api/subscription/plans           — List available plans (public)
 *   GET  /api/subscription/status           — Get current subscription status
 *   POST /api/subscription/checkout         — Create Stripe checkout session
 *   POST /api/subscription/webhook          — Stripe webhook handler
 *   POST /api/subscription/renew            — Renew with manual payment
 *   POST /api/subscription/change-plan      — Upgrade/downgrade plan
 *   GET  /api/subscription/usage            — Get usage stats vs plan limits
 *   GET  /api/subscription/invoices         — Get billing invoices
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth');
const paymentService = require('../services/payment.service');

/**
 * GET /api/subscription/plans
 * List all active subscription plans (public)
 */
router.get('/plans', async (req, res, next) => {
  try {
    const plans = await paymentService.getPlans();
    res.json({ success: true, data: plans });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/subscription/status
 * Get current company's subscription status
 */
router.get('/status', authenticate, async (req, res, next) => {
  try {
    const status = await paymentService.getSubscriptionStatus(req.user.companyId);
    res.json({ success: true, data: status });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/subscription/checkout
 * Create a Stripe checkout session
 * Body: { plan_id, period: 'monthly'|'yearly' }
 */
router.post('/checkout', authenticate, async (req, res, next) => {
  try {
    const { plan_id, period } = req.body;
    if (!plan_id) {
      return res.status(400).json({ success: false, message: 'plan_id is required' });
    }
    const result = await paymentService.createCheckoutSession(
      req.user.companyId,
      plan_id,
      period || 'monthly'
    );
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/subscription/webhook
 * Stripe webhook handler (no auth - verified by signature)
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  try {
    let event;
    if (endpointSecret && sig) {
      const Stripe = require('stripe');
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } else {
      // In development without webhook secret, parse body directly
      event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    }

    await paymentService.handleWebhook(event);
    res.json({ received: true });
  } catch (error) {
    console.error('[Webhook] Error:', error.message);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/subscription/renew
 * Renew subscription with manual payment
 * Body: { plan_id?, period?, payment_method: 'cash'|'bank_transfer', reference? }
 */
router.post('/renew', authenticate, async (req, res, next) => {
  try {
    const { plan_id, period, payment_method, reference } = req.body;

    const company = req.user.company;
    const planId = plan_id || company.planId;

    if (!planId) {
      return res.status(400).json({ success: false, message: 'No plan specified' });
    }

    const result = await paymentService.processManualPayment(
      req.user.companyId,
      planId,
      period || 'monthly',
      payment_method || 'cash',
      reference
    );

    // Send payment receipt email
    try {
      const emailService = require('../services/email.service');
      await emailService.sendPaymentReceipt(
        req.user.email,
        req.user.name,
        {
          invoiceNumber: result.invoice_number,
          planName: company.plan?.name || 'Subscription',
          amount: result.amount,
          currency: 'PKR',
          period: result.period,
          expiresAt: result.expires_at,
        }
      );
    } catch (emailErr) {
      console.warn('[Subscription] Email sending failed:', emailErr.message);
    }

    res.json({
      success: true,
      message: 'Subscription renewed successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/subscription/change-plan
 * Upgrade or downgrade plan
 * Body: { plan_id, period?, payment_method? }
 */
router.post('/change-plan', authenticate, async (req, res, next) => {
  try {
    const { plan_id, period, payment_method } = req.body;
    if (!plan_id) {
      return res.status(400).json({ success: false, message: 'plan_id is required' });
    }

    const result = await paymentService.changePlan(
      req.user.companyId,
      plan_id,
      period || 'monthly',
      payment_method || 'cash'
    );

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/subscription/usage
 * Get usage stats against plan limits
 */
router.get('/usage', authenticate, async (req, res, next) => {
  try {
    const usage = await paymentService.getUsageStats(
      req.user.companyId,
      req.tenantPrisma
    );
    res.json({ success: true, data: usage });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/subscription/invoices
 * Get billing history/invoices
 */
router.get('/invoices', authenticate, async (req, res, next) => {
  try {
    const status = await paymentService.getSubscriptionStatus(req.user.companyId);
    res.json({ success: true, data: status.invoices });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

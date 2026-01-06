const billingService = require('../services/billingService');
const { User, Plan, Subscription, Invoice, PaymentMethod, Transaction, sequelize } = require('../models');
const { Op } = require('sequelize');

/**
 * Create checkout session for subscription
 * POST /api/billing/checkout
 */
exports.createCheckoutSession = async (req, res) => {
  try {
    const { planId, successUrl, cancelUrl } = req.body;

    if (!planId || !successUrl || !cancelUrl) {
      return res.status(400).json({
        success: false,
        message: 'planId, successUrl, and cancelUrl are required'
      });
    }

    // Try to find by ID first, then by slug
    let plan = await Plan.findByPk(planId);
    if (!plan) {
      plan = await Plan.findOne({ where: { slug: planId } });
    }
    
    if (!plan || plan.status !== 'active') {
      return res.status(404).json({
        success: false,
        message: 'Plan not found or inactive'
      });
    }

    const session = await billingService.createCheckoutSession(
      req.user,
      plan,
      successUrl,
      cancelUrl
    );

    res.json({
      success: true,
      data: {
        sessionId: session.id,
        url: session.url
      }
    });
  } catch (error) {
    console.error('Create checkout error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create checkout session',
      error: error.message
    });
  }
};

/**
 * Create customer portal session
 * POST /api/billing/portal
 */
exports.createPortalSession = async (req, res) => {
  try {
    const { returnUrl } = req.body;

    if (!returnUrl) {
      return res.status(400).json({
        success: false,
        message: 'returnUrl is required'
      });
    }

    if (!req.user.stripeCustomerId) {
      return res.status(400).json({
        success: false,
        message: 'No billing account found. Please subscribe to a plan first.'
      });
    }

    const session = await billingService.createPortalSession(req.user, returnUrl);

    res.json({
      success: true,
      data: {
        url: session.url
      }
    });
  } catch (error) {
    console.error('Create portal error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create portal session',
      error: error.message
    });
  }
};

/**
 * Get current subscription
 * GET /api/billing/subscription
 */
exports.getSubscription = async (req, res) => {
  try {
    const subscription = await Subscription.findOne({
      where: {
        user_id: req.user.id,
        status: {
          [Op.in]: ['active', 'trial', 'trialing', 'past_due']
        }
      },
      include: [{
        model: Plan,
        as: 'plan'
      }],
      order: [['created_at', 'DESC']]
    });

    if (!subscription) {
      return res.json({
        success: true,
        data: null,
        message: 'No active subscription'
      });
    }

    let stripeData = null;
    if (subscription.stripeSubscriptionId) {
      try {
        stripeData = await billingService.getSubscription(subscription.stripeSubscriptionId);
      } catch (error) {
        console.log('Could not fetch Stripe subscription:', error.message);
      }
    }

    res.json({
      success: true,
      data: {
        ...subscription.toJSON(),
        stripeData: stripeData ? {
          status: stripeData.status,
          currentPeriodEnd: new Date(stripeData.current_period_end * 1000),
          cancelAtPeriodEnd: stripeData.cancel_at_period_end
        } : null
      }
    });
  } catch (error) {
    console.error('Get subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get subscription',
      error: error.message
    });
  }
};

/**
 * Cancel subscription
 * POST /api/billing/subscription/cancel
 */
exports.cancelSubscription = async (req, res) => {
  try {
    const { immediate = false } = req.body;

    const subscription = await Subscription.findOne({
      where: {
        user_id: req.user.id,
        status: ['active', 'trialing']
      }
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'No active subscription found'
      });
    }

    if (subscription.stripeSubscriptionId) {
      await billingService.cancelSubscription(subscription.stripeSubscriptionId, !immediate);
    }

    if (immediate) {
      await subscription.update({ status: 'cancelled' });
    } else {
      await subscription.update({ cancelAtPeriodEnd: true });
    }

    res.json({
      success: true,
      message: immediate 
        ? 'Subscription cancelled immediately' 
        : 'Subscription will be cancelled at the end of the billing period'
    });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel subscription',
      error: error.message
    });
  }
};

/**
 * Resume cancelled subscription
 * POST /api/billing/subscription/resume
 */
exports.resumeSubscription = async (req, res) => {
  try {
    const subscription = await Subscription.findOne({
      where: {
        user_id: req.user.id,
        cancelAtPeriodEnd: true
      }
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'No subscription scheduled for cancellation'
      });
    }

    if (subscription.stripeSubscriptionId) {
      await billingService.resumeSubscription(subscription.stripeSubscriptionId);
    }

    await subscription.update({ cancelAtPeriodEnd: false });

    res.json({
      success: true,
      message: 'Subscription resumed successfully'
    });
  } catch (error) {
    console.error('Resume subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resume subscription',
      error: error.message
    });
  }
};

/**
 * Change subscription plan
 * POST /api/billing/subscription/change
 */
exports.changeSubscriptionPlan = async (req, res) => {
  try {
    const { newPlanId } = req.body;

    if (!newPlanId) {
      return res.status(400).json({
        success: false,
        message: 'newPlanId is required'
      });
    }

    const subscription = await Subscription.findOne({
      where: {
        user_id: req.user.id,
        status: ['active', 'trialing']
      }
    });

    if (!subscription || !subscription.stripeSubscriptionId) {
      return res.status(404).json({
        success: false,
        message: 'No active Stripe subscription found'
      });
    }

    const newPlan = await Plan.findByPk(newPlanId);
    if (!newPlan || !newPlan.isActive) {
      return res.status(404).json({
        success: false,
        message: 'New plan not found or inactive'
      });
    }

    if (!newPlan.stripePriceId) {
      await billingService.syncPlanToStripe(newPlan);
      await newPlan.reload();
    }

    await billingService.changeSubscriptionPlan(
      subscription.stripeSubscriptionId,
      newPlan.stripePriceId
    );

    await subscription.update({ planId: newPlanId });

    res.json({
      success: true,
      message: 'Subscription plan changed successfully'
    });
  } catch (error) {
    console.error('Change plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change subscription plan',
      error: error.message
    });
  }
};

/**
 * Get invoices
 * GET /api/billing/invoices
 */
exports.getInvoices = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    // Get local invoices
    const { count, rows: invoices } = await Invoice.findAndCountAll({
      where: { user_id: req.user.id },
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // Get Stripe invoices if customer exists
    let stripeInvoices = [];
    if (req.user.stripeCustomerId) {
      try {
        const result = await billingService.listInvoices(req.user.stripeCustomerId, limit);
        stripeInvoices = result.data.map(inv => ({
          id: inv.id,
          number: inv.number,
          amount: inv.amount_paid / 100,
          currency: inv.currency,
          status: inv.status,
          paidAt: inv.status_transitions?.paid_at ? new Date(inv.status_transitions.paid_at * 1000) : null,
          invoicePdf: inv.invoice_pdf,
          hostedInvoiceUrl: inv.hosted_invoice_url
        }));
      } catch (error) {
        console.log('Could not fetch Stripe invoices:', error.message);
      }
    }

    res.json({
      success: true,
      data: {
        localInvoices: invoices,
        stripeInvoices,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get invoices',
      error: error.message
    });
  }
};

/**
 * Get upcoming invoice
 * GET /api/billing/invoices/upcoming
 */
exports.getUpcomingInvoice = async (req, res) => {
  try {
    if (!req.user.stripeCustomerId) {
      return res.json({
        success: true,
        data: null,
        message: 'No billing account'
      });
    }

    const invoice = await billingService.getUpcomingInvoice(req.user.stripeCustomerId);

    if (!invoice) {
      return res.json({
        success: true,
        data: null,
        message: 'No upcoming invoice'
      });
    }

    res.json({
      success: true,
      data: {
        amount: invoice.amount_due / 100,
        currency: invoice.currency,
        periodStart: new Date(invoice.period_start * 1000),
        periodEnd: new Date(invoice.period_end * 1000),
        lines: invoice.lines.data.map(line => ({
          description: line.description,
          amount: line.amount / 100
        }))
      }
    });
  } catch (error) {
    console.error('Get upcoming invoice error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get upcoming invoice',
      error: error.message
    });
  }
};

/**
 * Get payment methods
 * GET /api/billing/payment-methods
 */
exports.getPaymentMethods = async (req, res) => {
  try {
    // Get local payment methods
    const localMethods = await PaymentMethod.findAll({
      where: { user_id: req.user.id },
      order: [['isDefault', 'DESC'], ['createdAt', 'DESC']]
    });

    // Get Stripe payment methods
    let stripeMethods = [];
    if (req.user.stripeCustomerId) {
      try {
        const result = await billingService.listPaymentMethods(req.user.stripeCustomerId);
        stripeMethods = result.data.map(pm => ({
          id: pm.id,
          type: pm.type,
          card: pm.card ? {
            brand: pm.card.brand,
            last4: pm.card.last4,
            expMonth: pm.card.exp_month,
            expYear: pm.card.exp_year
          } : null
        }));
      } catch (error) {
        console.log('Could not fetch Stripe payment methods:', error.message);
      }
    }

    res.json({
      success: true,
      data: {
        localMethods,
        stripeMethods
      }
    });
  } catch (error) {
    console.error('Get payment methods error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get payment methods',
      error: error.message
    });
  }
};

/**
 * Set default payment method
 * PUT /api/billing/payment-methods/:id/default
 */
exports.setDefaultPaymentMethod = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.user.stripeCustomerId) {
      return res.status(400).json({
        success: false,
        message: 'No billing account found'
      });
    }

    await billingService.setDefaultPaymentMethod(req.user.stripeCustomerId, id);

    // Update local records
    await PaymentMethod.update(
      { isDefault: false },
      { where: { user_id: req.user.id } }
    );

    await PaymentMethod.update(
      { isDefault: true },
      { where: { user_id: req.user.id, stripePaymentMethodId: id } }
    );

    res.json({
      success: true,
      message: 'Default payment method updated'
    });
  } catch (error) {
    console.error('Set default payment method error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to set default payment method',
      error: error.message
    });
  }
};

/**
 * Delete payment method
 * DELETE /api/billing/payment-methods/:id
 */
exports.deletePaymentMethod = async (req, res) => {
  try {
    const { id } = req.params;

    await billingService.detachPaymentMethod(id);

    await PaymentMethod.destroy({
      where: { stripePaymentMethodId: id, user_id: req.user.id }
    });

    res.json({
      success: true,
      message: 'Payment method deleted'
    });
  } catch (error) {
    console.error('Delete payment method error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete payment method',
      error: error.message
    });
  }
};

/**
 * Get transactions
 * GET /api/billing/transactions
 */
exports.getTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const { count, rows: transactions } = await Transaction.findAndCountAll({
      where: { user_id: req.user.id },
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      include: [{
        model: Invoice,
        as: 'invoice'
      }]
    });

    res.json({
      success: true,
      data: {
        transactions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get transactions',
      error: error.message
    });
  }
};

/**
 * Stripe webhook handler
 * POST /api/billing/webhook
 */
exports.handleWebhook = async (req, res) => {
  // Check if this is Midtrans notification
  const isMidtrans = req.body.order_id && req.body.transaction_status;
  
  if (isMidtrans) {
    // Handle Midtrans notification
    try {
      await handleMidtransNotification(req.body);
      return res.json({ status: 'success' });
    } catch (error) {
      console.error('Midtrans webhook error:', error);
      return res.status(500).json({ status: 'error', message: error.message });
    }
  }

  // Handle Stripe webhook
  const signature = req.headers['stripe-signature'];
  let event;

  try {
    event = billingService.verifyWebhookSignature(req.rawBody, signature);
  } catch (error) {
    console.error('Webhook signature verification failed:', error.message);
    return res.status(400).json({
      success: false,
      message: 'Webhook signature verification failed'
    });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(event.data.object);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;

      case 'invoice.paid':
        await handleInvoicePaid(event.data.object);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object);
        break;

      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    res.status(500).json({
      success: false,
      message: 'Webhook handler failed'
    });
  }
};

// Webhook helper functions
async function handleCheckoutCompleted(session) {
  const userId = session.metadata?.userId;
  const planId = session.metadata?.planId;

  if (!userId || !planId) return;

  const user = await User.findByPk(userId);
  const plan = await Plan.findByPk(planId);

  if (!user || !plan) return;

  // Create or update subscription
  const [subscription, created] = await Subscription.findOrCreate({
    where: { userId },
    defaults: {
      planId,
      status: 'active',
      stripeSubscriptionId: session.subscription,
      startDate: new Date()
    }
  });

  if (!created) {
    await subscription.update({
      planId,
      status: 'active',
      stripeSubscriptionId: session.subscription
    });
  }

  console.log(`Checkout completed for user ${userId}, plan ${planId}`);
}

async function handleSubscriptionUpdate(stripeSubscription) {
  const subscription = await Subscription.findOne({
    where: { stripeSubscriptionId: stripeSubscription.id }
  });

  if (!subscription) return;

  await subscription.update({
    status: stripeSubscription.status === 'active' ? 'active' :
            stripeSubscription.status === 'trialing' ? 'trialing' :
            stripeSubscription.status === 'past_due' ? 'past_due' :
            stripeSubscription.status === 'canceled' ? 'cancelled' : 'inactive',
    currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
    currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
    cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end
  });
}

async function handleSubscriptionDeleted(stripeSubscription) {
  await Subscription.update(
    { status: 'cancelled' },
    { where: { stripeSubscriptionId: stripeSubscription.id } }
  );
}

async function handleInvoicePaid(stripeInvoice) {
  const user = await User.findOne({
    where: { stripeCustomerId: stripeInvoice.customer }
  });

  if (!user) return;

  const invoiceNumber = await Invoice.generateInvoiceNumber();

  await Invoice.create({
    userId: user.id,
    invoiceNumber,
    stripeInvoiceId: stripeInvoice.id,
    amount: stripeInvoice.amount_paid / 100,
    currency: stripeInvoice.currency,
    status: 'paid',
    paidAt: new Date(),
    billingPeriodStart: stripeInvoice.period_start ? new Date(stripeInvoice.period_start * 1000) : null,
    billingPeriodEnd: stripeInvoice.period_end ? new Date(stripeInvoice.period_end * 1000) : null
  });
}

async function handleInvoicePaymentFailed(stripeInvoice) {
  const user = await User.findOne({
    where: { stripeCustomerId: stripeInvoice.customer }
  });

  if (!user) return;

  // Update subscription status
  await Subscription.update(
    { status: 'past_due' },
    { where: { userId: user.id, status: 'active' } }
  );

  // TODO: Send notification email
}

async function handlePaymentSucceeded(paymentIntent) {
  const user = await User.findOne({
    where: { stripeCustomerId: paymentIntent.customer }
  });

  if (!user) return;

  await Transaction.create({
    userId: user.id,
    stripePaymentIntentId: paymentIntent.id,
    stripeChargeId: paymentIntent.latest_charge,
    type: 'payment',
    amount: paymentIntent.amount / 100,
    currency: paymentIntent.currency,
    status: 'succeeded',
    description: paymentIntent.description
  });
}

async function handlePaymentFailed(paymentIntent) {
  const user = await User.findOne({
    where: { stripeCustomerId: paymentIntent.customer }
  });

  if (!user) return;

  await Transaction.create({
    userId: user.id,
    stripePaymentIntentId: paymentIntent.id,
    type: 'payment',
    amount: paymentIntent.amount / 100,
    currency: paymentIntent.currency,
    status: 'failed',
    description: paymentIntent.description,
    metadata: {
      error: paymentIntent.last_payment_error?.message
    }
  });
}

/**
 * Admin: Sync plans to Stripe
 * POST /api/billing/admin/sync-plans
 */
exports.syncPlansToStripe = async (req, res) => {
  try {
    const plans = await Plan.findAll({ where: { isActive: true } });
    const results = [];

    for (const plan of plans) {
      try {
        const result = await billingService.syncPlanToStripe(plan);
        results.push({
          planId: plan.id,
          planName: plan.name,
          success: true,
          stripeProductId: plan.stripeProductId,
          stripePriceId: plan.stripePriceId
        });
      } catch (error) {
        results.push({
          planId: plan.id,
          planName: plan.name,
          success: false,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Sync plans error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sync plans',
      error: error.message
    });
  }
};

/**
 * Admin: Get billing overview
 * GET /api/billing/admin/overview
 */
exports.getBillingOverview = async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Revenue this month
    const revenueThisMonth = await Transaction.sum('amount', {
      where: {
        status: 'succeeded',
        createdAt: { [Op.gte]: startOfMonth }
      }
    }) || 0;

    // Revenue last month
    const revenueLastMonth = await Transaction.sum('amount', {
      where: {
        status: 'succeeded',
        createdAt: {
          [Op.gte]: startOfLastMonth,
          [Op.lte]: endOfLastMonth
        }
      }
    }) || 0;

    // Active subscriptions
    const activeSubscriptions = await Subscription.count({
      where: { status: ['active', 'trialing'] }
    });

    // Churned subscriptions this month
    const churnedThisMonth = await Subscription.count({
      where: {
        status: 'cancelled',
        updatedAt: { [Op.gte]: startOfMonth }
      }
    });

    // MRR calculation
    const mrr = await Subscription.findAll({
      where: { status: 'active' },
      include: [{ model: Plan, as: 'plan' }]
    });

    const totalMrr = mrr.reduce((sum, sub) => {
      if (sub.plan) {
        const monthlyPrice = sub.plan.billingInterval === 'year' 
          ? sub.plan.price / 12 
          : sub.plan.price;
        return sum + parseFloat(monthlyPrice);
      }
      return sum;
    }, 0);

    // Get Stripe balance
    let stripeBalance = null;
    try {
      stripeBalance = await billingService.getBalance();
    } catch (error) {
      console.log('Could not fetch Stripe balance:', error.message);
    }

    res.json({
      success: true,
      data: {
        revenueThisMonth,
        revenueLastMonth,
        revenueGrowth: revenueLastMonth > 0 
          ? ((revenueThisMonth - revenueLastMonth) / revenueLastMonth * 100).toFixed(2)
          : 0,
        activeSubscriptions,
        churnedThisMonth,
        mrr: totalMrr.toFixed(2),
        stripeBalance: stripeBalance ? {
          available: stripeBalance.available.map(b => ({
            amount: b.amount / 100,
            currency: b.currency
          })),
          pending: stripeBalance.pending.map(b => ({
            amount: b.amount / 100,
            currency: b.currency
          }))
        } : null
      }
    });
  } catch (error) {
    console.error('Get billing overview error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get billing overview',
      error: error.message
    });
  }
};

/**
 * Get all available plans
 * GET /api/billing/plans
 */
exports.getPlans = async (req, res) => {
  try {
    const plans = await Plan.findAll({
      where: { status: 'active' },
      order: [['sort_order', 'ASC'], ['price', 'ASC']],
      attributes: {
        exclude: ['stripe_price_id', 'paypal_plan_id']
      }
    });

    res.json({
      success: true,
      data: plans
    });
  } catch (error) {
    console.error('Get plans error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get plans',
      error: error.message
    });
  }
};

/**
 * Handle Midtrans payment notification
 */
async function handleMidtransNotification(notification) {
  const {
    order_id,
    transaction_status,
    fraud_status,
    gross_amount,
    custom_field1, // planId
    custom_field2  // userId
  } = notification;

  console.log('[MIDTRANS] Webhook received:', {
    order_id,
    transaction_status,
    fraud_status,
    planId: custom_field1,
    userId: custom_field2
  });

  // Get user and plan from custom fields or extract from order_id
  let userId = custom_field2;
  let planId = custom_field1;

  // Fallback: Extract from order ID (format: ORDER-{userId}-{planId}-{timestamp})
  if (!userId || !planId) {
    const orderParts = order_id.split('-');
    if (orderParts.length >= 4) {
      userId = orderParts[1];
      planId = orderParts[2];
    }
  }

  if (!userId) {
    console.error('[MIDTRANS] Cannot determine user ID from order:', order_id);
    return;
  }

  // Find user
  const user = await User.findOne({
    where: sequelize.where(
      sequelize.fn('LEFT', sequelize.col('id'), userId.length),
      userId
    )
  });

  if (!user) {
    console.error('[MIDTRANS] User not found for order:', order_id);
    return;
  }

  // Determine subscription status based on transaction status
  let subscriptionStatus = 'pending';
  
  if (transaction_status === 'capture' || transaction_status === 'settlement') {
    if (fraud_status === 'accept' || !fraud_status) {
      subscriptionStatus = 'active';
    }
  } else if (transaction_status === 'pending') {
    subscriptionStatus = 'pending';
  } else if (transaction_status === 'deny' || transaction_status === 'cancel' || transaction_status === 'expire') {
    subscriptionStatus = 'cancelled';
  }

  // Only activate subscription if payment successful
  if (subscriptionStatus === 'active') {
    // Get the plan
    const plan = await Plan.findByPk(planId || 1);

    if (plan) {
      // Create or update subscription
      const [subscription, created] = await Subscription.findOrCreate({
        where: { userId: user.id },
        defaults: {
          planId: plan.id,
          status: 'active',
          paymentMethod: 'midtrans',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
        }
      });

      if (!created) {
        await subscription.update({
          planId: plan.id,
          status: 'active',
          paymentMethod: 'midtrans',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        });
      }

      // Update user's subscription_id
      await user.update({ subscriptionId: subscription.id });

      // Create invoice record
      await Invoice.create({
        userId: user.id,
        subscriptionId: subscription.id,
        invoiceNumber: order_id,
        amount: parseFloat(gross_amount),
        currency: 'IDR',
        status: 'paid',
        description: `${plan.name} Subscription`,
        paidAt: new Date(),
        paymentMethod: 'midtrans',
        metadata: { midtrans_notification: notification }
      });

      console.log('[MIDTRANS] ✅ Subscription activated for user:', user.email, 'Plan:', plan.name);
    }
  } else {
    console.log('[MIDTRANS] ⏳ Payment status:', subscriptionStatus, 'for order:', order_id);
  }
}

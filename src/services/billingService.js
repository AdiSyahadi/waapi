const Stripe = require('stripe');
const axios = require('axios');

class BillingService {
  constructor() {
    const stripeKey = process.env.STRIPE_SECRET_KEY || 'sk_test_xxx';
    this.isDevelopmentMode = stripeKey.includes('dummy') || stripeKey === 'sk_test_xxx';
    
    // Midtrans configuration
    this.midtransServerKey = process.env.MIDTRANS_SERVER_KEY;
    this.midtransClientKey = process.env.MIDTRANS_CLIENT_KEY;
    this.midtransIsProduction = process.env.MIDTRANS_IS_PRODUCTION === 'true';
    this.midtransApiUrl = this.midtransIsProduction 
      ? 'https://app.midtrans.com/snap/v1/transactions'
      : 'https://app.sandbox.midtrans.com/snap/v1/transactions';
    
    // Use Midtrans if configured, otherwise Stripe
    this.useMidtrans = !!this.midtransServerKey && this.midtransServerKey !== 'your_midtrans_server_key';
    
    if (!this.isDevelopmentMode && !this.useMidtrans) {
      this.stripe = new Stripe(stripeKey);
    }
    this.webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_xxx';
  }

  /**
   * Create Midtrans transaction
   */
  async createMidtransTransaction(user, plan, successUrl, cancelUrl) {
    const orderId = `ORDER-${user.id.substring(0, 8)}-${plan.id}-${Date.now()}`;
    
    const requestBody = {
      transaction_details: {
        order_id: orderId,
        gross_amount: Math.round(plan.price)
      },
      customer_details: {
        first_name: user.name,
        email: user.email,
        phone: user.phone || '08123456789'
      },
      item_details: [{
        id: plan.id,
        price: Math.round(plan.price),
        quantity: 1,
        name: `${plan.name} Subscription`
      }],
      custom_field1: plan.id.toString(), // Store plan ID for webhook
      custom_field2: user.id, // Store user ID for webhook
      callbacks: {
        finish: successUrl,
        error: cancelUrl,
        pending: cancelUrl
      }
    };

    try {
      const response = await axios.post(this.midtransApiUrl, requestBody, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': 'Basic ' + Buffer.from(this.midtransServerKey + ':').toString('base64')
        }
      });

      return {
        id: orderId,
        url: response.data.redirect_url,
        token: response.data.token,
        customer: user.id,
        mode: 'payment',
        status: 'pending'
      };
    } catch (error) {
      console.error('[MIDTRANS] Error creating transaction:', error.response?.data || error.message);
      throw new Error('Failed to create Midtrans transaction');
    }
  }

  /**
   * Create or get Stripe customer
   */
  async getOrCreateCustomer(user) {
    // Development mode: return mock customer
    if (this.isDevelopmentMode) {
      console.log('[BILLING] Development mode - returning mock customer');
      return {
        id: 'cus_dev_' + user.id.substring(0, 8),
        email: user.email,
        name: user.name
      };
    }

    if (user.stripeCustomerId) {
      try {
        return await this.stripe.customers.retrieve(user.stripeCustomerId);
      } catch (error) {
        // Customer might have been deleted
        console.log('Customer not found, creating new one');
      }
    }

    const customer = await this.stripe.customers.create({
      email: user.email,
      name: user.name,
      metadata: {
        userId: user.id
      }
    });

    // Update user with Stripe customer ID
    await user.update({ stripeCustomerId: customer.id });

    return customer;
  }

  /**
   * Create checkout session for subscription
   */
  async createCheckoutSession(user, plan, successUrl, cancelUrl) {
    // Use Midtrans if configured
    if (this.useMidtrans) {
      console.log('[BILLING] Using Midtrans payment gateway');
      return await this.createMidtransTransaction(user, plan, successUrl, cancelUrl);
    }

    // Development mode: return mock session
    if (this.isDevelopmentMode) {
      console.log('[BILLING] Development mode - returning mock checkout session');
      return {
        id: 'cs_dev_' + Date.now(),
        url: successUrl + '?session_id=cs_dev_mock&development=true',
        customer: 'cus_dev_mock',
        mode: 'subscription',
        status: 'complete'
      };
    }

    const customer = await this.getOrCreateCustomer(user);

    const sessionParams = {
      customer: customer.id,
      payment_method_types: ['card'],
      mode: 'subscription',
      success_url: successUrl + '?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: cancelUrl,
      metadata: {
        userId: user.id,
        planId: plan.id
      },
      subscription_data: {
        metadata: {
          userId: user.id,
          planId: plan.id
        }
      }
    };

    // If plan has Stripe price ID, use it
    if (plan.stripePriceId) {
      sessionParams.line_items = [{
        price: plan.stripePriceId,
        quantity: 1
      }];
    } else {
      // Create price on the fly
      sessionParams.line_items = [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: plan.name,
            description: plan.description || `${plan.name} Subscription`
          },
          unit_amount: Math.round(plan.price * 100), // Convert to cents
          recurring: {
            interval: plan.billingInterval || 'month'
          }
        },
        quantity: 1
      }];
    }

    return await this.stripe.checkout.sessions.create(sessionParams);
  }

  /**
   * Create customer portal session
   */
  async createPortalSession(user, returnUrl) {
    // Development mode: return mock portal session
    if (this.isDevelopmentMode) {
      console.log('[BILLING] Development mode - returning mock portal session');
      return {
        id: 'bps_dev_' + Date.now(),
        url: returnUrl + '?development=true&portal=mock'
      };
    }

    if (!user.stripeCustomerId) {
      throw new Error('User does not have a Stripe customer ID');
    }

    return await this.stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: returnUrl
    });
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(stripeSubscriptionId, cancelAtPeriodEnd = true) {
    if (cancelAtPeriodEnd) {
      return await this.stripe.subscriptions.update(stripeSubscriptionId, {
        cancel_at_period_end: true
      });
    } else {
      return await this.stripe.subscriptions.cancel(stripeSubscriptionId);
    }
  }

  /**
   * Resume cancelled subscription
   */
  async resumeSubscription(stripeSubscriptionId) {
    return await this.stripe.subscriptions.update(stripeSubscriptionId, {
      cancel_at_period_end: false
    });
  }

  /**
   * Change subscription plan
   */
  async changeSubscriptionPlan(stripeSubscriptionId, newStripePriceId) {
    const subscription = await this.stripe.subscriptions.retrieve(stripeSubscriptionId);
    
    return await this.stripe.subscriptions.update(stripeSubscriptionId, {
      items: [{
        id: subscription.items.data[0].id,
        price: newStripePriceId
      }],
      proration_behavior: 'create_prorations'
    });
  }

  /**
   * Get subscription details
   */
  async getSubscription(stripeSubscriptionId) {
    return await this.stripe.subscriptions.retrieve(stripeSubscriptionId, {
      expand: ['default_payment_method', 'latest_invoice']
    });
  }

  /**
   * List customer invoices
   */
  async listInvoices(stripeCustomerId, limit = 10) {
    return await this.stripe.invoices.list({
      customer: stripeCustomerId,
      limit: limit,
      expand: ['data.subscription']
    });
  }

  /**
   * Get upcoming invoice
   */
  async getUpcomingInvoice(stripeCustomerId) {
    try {
      return await this.stripe.invoices.retrieveUpcoming({
        customer: stripeCustomerId
      });
    } catch (error) {
      // No upcoming invoice
      return null;
    }
  }

  /**
   * Create payment intent (one-time payment)
   */
  async createPaymentIntent(user, amount, currency = 'usd', description = '') {
    const customer = await this.getOrCreateCustomer(user);

    return await this.stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency,
      customer: customer.id,
      description: description,
      metadata: {
        userId: user.id
      }
    });
  }

  /**
   * List customer payment methods
   */
  async listPaymentMethods(stripeCustomerId) {
    return await this.stripe.paymentMethods.list({
      customer: stripeCustomerId,
      type: 'card'
    });
  }

  /**
   * Attach payment method to customer
   */
  async attachPaymentMethod(stripeCustomerId, paymentMethodId) {
    return await this.stripe.paymentMethods.attach(paymentMethodId, {
      customer: stripeCustomerId
    });
  }

  /**
   * Detach payment method
   */
  async detachPaymentMethod(paymentMethodId) {
    return await this.stripe.paymentMethods.detach(paymentMethodId);
  }

  /**
   * Set default payment method
   */
  async setDefaultPaymentMethod(stripeCustomerId, paymentMethodId) {
    return await this.stripe.customers.update(stripeCustomerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId
      }
    });
  }

  /**
   * Create refund
   */
  async createRefund(chargeId, amount = null, reason = '') {
    const refundParams = {
      charge: chargeId,
      reason: 'requested_by_customer'
    };

    if (amount) {
      refundParams.amount = Math.round(amount * 100);
    }

    return await this.stripe.refunds.create(refundParams);
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload, signature) {
    return this.stripe.webhooks.constructEvent(payload, signature, this.webhookSecret);
  }

  /**
   * Create Stripe product and price
   */
  async createProductWithPrice(plan) {
    // Create product
    const product = await this.stripe.products.create({
      name: plan.name,
      description: plan.description || `${plan.name} Subscription Plan`,
      metadata: {
        planId: plan.id
      }
    });

    // Create price
    const price = await this.stripe.prices.create({
      product: product.id,
      unit_amount: Math.round(plan.price * 100),
      currency: 'usd',
      recurring: {
        interval: plan.billingInterval || 'month'
      },
      metadata: {
        planId: plan.id
      }
    });

    return { product, price };
  }

  /**
   * Sync plan with Stripe
   */
  async syncPlanToStripe(plan) {
    if (!plan.stripeProductId || !plan.stripePriceId) {
      const { product, price } = await this.createProductWithPrice(plan);
      await plan.update({
        stripeProductId: product.id,
        stripePriceId: price.id
      });
      return { product, price };
    }

    // Update existing product
    await this.stripe.products.update(plan.stripeProductId, {
      name: plan.name,
      description: plan.description
    });

    return {
      productId: plan.stripeProductId,
      priceId: plan.stripePriceId
    };
  }

  /**
   * Get Stripe balance
   */
  async getBalance() {
    return await this.stripe.balance.retrieve();
  }

  /**
   * List transactions/charges
   */
  async listCharges(limit = 10, startingAfter = null) {
    const params = { limit };
    if (startingAfter) {
      params.starting_after = startingAfter;
    }
    return await this.stripe.charges.list(params);
  }
}

module.exports = new BillingService();

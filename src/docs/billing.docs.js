/**
 * @swagger
 * components:
 *   schemas:
 *     CheckoutSessionRequest:
 *       type: object
 *       required:
 *         - planId
 *         - successUrl
 *         - cancelUrl
 *       properties:
 *         planId:
 *           type: string
 *           format: uuid
 *           description: Plan ID to subscribe to
 *           example: "550e8400-e29b-41d4-a716-446655440000"
 *         successUrl:
 *           type: string
 *           description: URL to redirect after successful checkout
 *           example: "https://yourapp.com/checkout/success"
 *         cancelUrl:
 *           type: string
 *           description: URL to redirect if checkout is cancelled
 *           example: "https://yourapp.com/checkout/cancel"
 * 
 *     CheckoutSessionResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: object
 *           properties:
 *             sessionId:
 *               type: string
 *               description: Stripe checkout session ID
 *             url:
 *               type: string
 *               description: Stripe checkout URL
 * 
 *     PortalSessionRequest:
 *       type: object
 *       required:
 *         - returnUrl
 *       properties:
 *         returnUrl:
 *           type: string
 *           description: URL to return to after portal session
 *           example: "https://yourapp.com/billing"
 * 
 *     SubscriptionResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         data:
 *           type: object
 *           properties:
 *             subscription:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 planId:
 *                   type: string
 *                 status:
 *                   type: string
 *                   enum: [active, trialing, past_due, cancelled, inactive]
 *                 stripeSubscriptionId:
 *                   type: string
 *                 currentPeriodStart:
 *                   type: string
 *                   format: date-time
 *                 currentPeriodEnd:
 *                   type: string
 *                   format: date-time
 *                 cancelAtPeriodEnd:
 *                   type: boolean
 *             stripeData:
 *               type: object
 *               nullable: true
 * 
 *     InvoiceItem:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         invoiceNumber:
 *           type: string
 *           example: "INV-202412-00001"
 *         amount:
 *           type: number
 *           format: decimal
 *           example: 29.99
 *         currency:
 *           type: string
 *           example: "USD"
 *         status:
 *           type: string
 *           enum: [draft, pending, paid, failed, cancelled, refunded]
 *         paidAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         billingPeriodStart:
 *           type: string
 *           format: date-time
 *         billingPeriodEnd:
 *           type: string
 *           format: date-time
 * 
 *     TransactionItem:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         type:
 *           type: string
 *           enum: [payment, refund, credit, debit]
 *         amount:
 *           type: number
 *           format: decimal
 *         currency:
 *           type: string
 *         status:
 *           type: string
 *           enum: [pending, processing, succeeded, failed, cancelled]
 *         description:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 * 
 *     PaymentMethodItem:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         type:
 *           type: string
 *           enum: [card, bank_transfer, paypal]
 *         cardBrand:
 *           type: string
 *           example: "visa"
 *         cardLast4:
 *           type: string
 *           example: "4242"
 *         cardExpMonth:
 *           type: integer
 *           example: 12
 *         cardExpYear:
 *           type: integer
 *           example: 2025
 *         isDefault:
 *           type: boolean
 * 
 *     BillingOverview:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         data:
 *           type: object
 *           properties:
 *             revenueThisMonth:
 *               type: number
 *               description: Revenue for current month
 *             revenueLastMonth:
 *               type: number
 *               description: Revenue for previous month
 *             revenueGrowth:
 *               type: string
 *               description: Revenue growth percentage
 *             activeSubscriptions:
 *               type: integer
 *               description: Number of active subscriptions
 *             churnedThisMonth:
 *               type: integer
 *               description: Subscriptions cancelled this month
 *             mrr:
 *               type: string
 *               description: Monthly Recurring Revenue
 *             stripeBalance:
 *               type: object
 *               nullable: true
 *               properties:
 *                 available:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       amount:
 *                         type: number
 *                       currency:
 *                         type: string
 *                 pending:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       amount:
 *                         type: number
 *                       currency:
 *                         type: string
 * 
 * @swagger
 * tags:
 *   name: Billing
 *   description: Billing, subscription, and payment management with Stripe integration
 */

/**
 * @swagger
 * /api/v1/billing/checkout:
 *   post:
 *     summary: Create Stripe checkout session
 *     description: Create a new Stripe checkout session for subscribing to a plan
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CheckoutSessionRequest'
 *     responses:
 *       200:
 *         description: Checkout session created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CheckoutSessionResponse'
 *       400:
 *         description: Missing required parameters
 *       404:
 *         description: Plan not found
 */

/**
 * @swagger
 * /api/v1/billing/portal:
 *   post:
 *     summary: Create Stripe customer portal session
 *     description: Create a customer portal session to manage billing
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PortalSessionRequest'
 *     responses:
 *       200:
 *         description: Portal session created
 *       400:
 *         description: No billing account found
 */

/**
 * @swagger
 * /api/v1/billing/subscription:
 *   get:
 *     summary: Get current subscription
 *     description: Get the user's current active subscription details
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Subscription details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SubscriptionResponse'
 */

/**
 * @swagger
 * /api/v1/billing/subscription/cancel:
 *   post:
 *     summary: Cancel subscription
 *     description: Cancel the current subscription (at period end or immediately)
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               immediate:
 *                 type: boolean
 *                 description: Cancel immediately instead of at period end
 *                 default: false
 *     responses:
 *       200:
 *         description: Subscription cancelled
 *       404:
 *         description: No active subscription found
 */

/**
 * @swagger
 * /api/v1/billing/subscription/resume:
 *   post:
 *     summary: Resume cancelled subscription
 *     description: Resume a subscription that was scheduled for cancellation
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Subscription resumed
 *       404:
 *         description: No subscription scheduled for cancellation
 */

/**
 * @swagger
 * /api/v1/billing/subscription/change:
 *   post:
 *     summary: Change subscription plan
 *     description: Upgrade or downgrade to a different plan
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - newPlanId
 *             properties:
 *               newPlanId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Plan changed successfully
 *       404:
 *         description: Subscription or plan not found
 */

/**
 * @swagger
 * /api/v1/billing/invoices:
 *   get:
 *     summary: Get invoices
 *     description: Get list of user's invoices
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: List of invoices
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     localInvoices:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/InvoiceItem'
 *                     stripeInvoices:
 *                       type: array
 *                       items:
 *                         type: object
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 */

/**
 * @swagger
 * /api/v1/billing/invoices/upcoming:
 *   get:
 *     summary: Get upcoming invoice
 *     description: Get details of the next invoice to be generated
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Upcoming invoice details
 */

/**
 * @swagger
 * /api/v1/billing/payment-methods:
 *   get:
 *     summary: Get payment methods
 *     description: Get list of saved payment methods
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of payment methods
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     localMethods:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/PaymentMethodItem'
 *                     stripeMethods:
 *                       type: array
 *                       items:
 *                         type: object
 */

/**
 * @swagger
 * /api/v1/billing/payment-methods/{id}/default:
 *   put:
 *     summary: Set default payment method
 *     description: Set a payment method as the default for future payments
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Stripe payment method ID
 *     responses:
 *       200:
 *         description: Default payment method updated
 *       400:
 *         description: No billing account found
 */

/**
 * @swagger
 * /api/v1/billing/payment-methods/{id}:
 *   delete:
 *     summary: Delete payment method
 *     description: Remove a saved payment method
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Stripe payment method ID
 *     responses:
 *       200:
 *         description: Payment method deleted
 */

/**
 * @swagger
 * /api/v1/billing/transactions:
 *   get:
 *     summary: Get transactions
 *     description: Get list of payment transactions
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: List of transactions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     transactions:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/TransactionItem'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 */

/**
 * @swagger
 * /api/v1/billing/webhook:
 *   post:
 *     summary: Stripe webhook handler
 *     description: Handle Stripe webhook events (payment confirmations, subscription updates, etc.)
 *     tags: [Billing]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Webhook processed
 *       400:
 *         description: Invalid signature
 */

/**
 * @swagger
 * /api/v1/billing/admin/sync-plans:
 *   post:
 *     summary: Sync plans to Stripe (Admin)
 *     description: Sync all active plans to Stripe products and prices
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Plans synced successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       planId:
 *                         type: string
 *                       planName:
 *                         type: string
 *                       success:
 *                         type: boolean
 *                       stripeProductId:
 *                         type: string
 *                       stripePriceId:
 *                         type: string
 */

/**
 * @swagger
 * /api/v1/billing/admin/overview:
 *   get:
 *     summary: Get billing overview (Admin)
 *     description: Get billing statistics including revenue, MRR, and churn
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Billing overview statistics
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BillingOverview'
 */

module.exports = {};

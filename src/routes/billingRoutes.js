const express = require('express');
const router = express.Router();
const billingController = require('../controllers/billingController');
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/permissions');

// Raw body parser for Stripe webhook
const rawBodyParser = express.raw({ type: 'application/json' });

/**
 * @swagger
 * components:
 *   schemas:
 *     CheckoutSession:
 *       type: object
 *       required:
 *         - planId
 *         - successUrl
 *         - cancelUrl
 *       properties:
 *         planId:
 *           type: string
 *           description: Plan ID to subscribe to
 *         successUrl:
 *           type: string
 *           description: URL to redirect after successful checkout
 *         cancelUrl:
 *           type: string
 *           description: URL to redirect if checkout is cancelled
 *     Invoice:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         invoiceNumber:
 *           type: string
 *         amount:
 *           type: number
 *         currency:
 *           type: string
 *         status:
 *           type: string
 *           enum: [draft, pending, paid, failed, cancelled, refunded]
 *         paidAt:
 *           type: string
 *           format: date-time
 *     Transaction:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         type:
 *           type: string
 *           enum: [payment, refund, credit, debit]
 *         amount:
 *           type: number
 *         currency:
 *           type: string
 *         status:
 *           type: string
 *           enum: [pending, processing, succeeded, failed, cancelled]
 *     PaymentMethod:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         type:
 *           type: string
 *           enum: [card, bank_transfer, paypal]
 *         cardBrand:
 *           type: string
 *         cardLast4:
 *           type: string
 *         isDefault:
 *           type: boolean
 */

/**
 * @swagger
 * tags:
 *   name: Billing
 *   description: Billing and payment management
 */

// Webhook route - must be before authentication middleware
// This uses raw body for signature verification
router.post('/webhook', rawBodyParser, (req, res, next) => {
  req.rawBody = req.body;
  next();
}, billingController.handleWebhook);

// All other routes require authentication
router.use(authenticate);

// Debug: Log all registered routes
console.log('🔍 [BILLING ROUTES] Registering billing routes...');
router.use((req, res, next) => {
  console.log(`🔵 [BILLING] ${req.method} ${req.originalUrl} -> ${req.path}`);
  next();
});

/**
 * @swagger
 * /api/billing/plans:
 *   get:
 *     summary: Get all available subscription plans
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of available plans
 */
router.get('/plans', billingController.getPlans);

/**
 * @swagger
 * /api/billing/checkout:
 *   post:
 *     summary: Create checkout session for subscription
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CheckoutSession'
 *     responses:
 *       200:
 *         description: Checkout session created
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
 *                     sessionId:
 *                       type: string
 *                     url:
 *                       type: string
 */
router.post('/checkout', authenticate, billingController.createCheckoutSession);
router.post('/create-checkout-session', authenticate, billingController.createCheckoutSession); // Alias for frontend compatibility
console.log('✅ [BILLING ROUTES] POST /checkout registered');
console.log('✅ [BILLING ROUTES] POST /create-checkout-session registered');

/**
 * @swagger
 * /api/billing/portal:
 *   post:
 *     summary: Create customer portal session
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
 *               - returnUrl
 *             properties:
 *               returnUrl:
 *                 type: string
 *                 description: URL to return to after portal session
 *     responses:
 *       200:
 *         description: Portal session created
 */
router.post('/portal', authenticate, billingController.createPortalSession);

/**
 * @swagger
 * /api/billing/subscription:
 *   get:
 *     summary: Get current subscription
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current subscription details
 */
router.get('/subscription', authenticate, billingController.getSubscription);

/**
 * @swagger
 * /api/billing/subscription/cancel:
 *   post:
 *     summary: Cancel subscription
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
 *                 description: Cancel immediately or at period end
 *                 default: false
 *     responses:
 *       200:
 *         description: Subscription cancelled
 */
router.post('/subscription/cancel', authenticate, billingController.cancelSubscription);
router.post('/cancel-subscription', authenticate, billingController.cancelSubscription); // Alias

/**
 * @swagger
 * /api/billing/subscription/resume:
 *   post:
 *     summary: Resume cancelled subscription
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Subscription resumed
 */
router.post('/subscription/resume', authenticate, billingController.resumeSubscription);

/**
 * @swagger
 * /api/billing/subscription/change:
 *   post:
 *     summary: Change subscription plan
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
 *     responses:
 *       200:
 *         description: Plan changed successfully
 */
router.post('/subscription/change', authenticate, billingController.changeSubscriptionPlan);

/**
 * @swagger
 * /api/billing/invoices:
 *   get:
 *     summary: Get invoices
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
 */
router.get('/invoices', authenticate, billingController.getInvoices);

/**
 * @swagger
 * /api/billing/invoices/upcoming:
 *   get:
 *     summary: Get upcoming invoice
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Upcoming invoice details
 */
router.get('/invoices/upcoming', authenticate, billingController.getUpcomingInvoice);

/**
 * @swagger
 * /api/billing/payment-methods:
 *   get:
 *     summary: Get payment methods
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of payment methods
 */
router.get('/payment-methods', authenticate, billingController.getPaymentMethods);

/**
 * @swagger
 * /api/billing/payment-methods/{id}/default:
 *   put:
 *     summary: Set default payment method
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
 */
router.put('/payment-methods/:id/default', authenticate, billingController.setDefaultPaymentMethod);

/**
 * @swagger
 * /api/billing/payment-methods/{id}:
 *   delete:
 *     summary: Delete payment method
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
router.delete('/payment-methods/:id', authenticate, billingController.deletePaymentMethod);

/**
 * @swagger
 * /api/billing/transactions:
 *   get:
 *     summary: Get transactions
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
 */
router.get('/transactions', billingController.getTransactions);

// Admin routes
/**
 * @swagger
 * /api/billing/admin/sync-plans:
 *   post:
 *     summary: Sync all plans to Stripe (Admin only)
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Plans synced to Stripe
 */
router.post('/admin/sync-plans', authenticate, requireAdmin, billingController.syncPlansToStripe);

/**
 * @swagger
 * /api/billing/admin/overview:
 *   get:
 *     summary: Get billing overview (Admin only)
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Billing overview statistics
 */
router.get('/admin/overview', authenticate, requireAdmin, billingController.getBillingOverview);

module.exports = router;

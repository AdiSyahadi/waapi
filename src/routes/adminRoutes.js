const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/permissions');

// All routes require authentication + admin role
router.use(authenticate);
router.use(requireAdmin);

// Dashboard & Metrics
router.get('/dashboard', adminController.getDashboardStats);
router.get('/metrics', adminController.getSystemMetrics);
router.get('/health', adminController.getSystemHealth);

// User Management
router.get('/users', adminController.getAllUsers);
router.get('/users/:id', adminController.getUserDetails);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);
router.post('/users/:id/suspend', adminController.suspendUser);
router.post('/users/:id/unsuspend', adminController.unsuspendUser);

// Session Management
router.get('/sessions', adminController.getAllSessions);
router.post('/sessions/:id/disconnect', adminController.forceDisconnectSession);

// Audit Logs
router.get('/audit-logs', adminController.getAuditLogs);

// Subscription & Plan Management
router.post('/subscriptions', adminController.manageSubscription);
router.post('/subscriptions/activate-manual', adminController.activateSubscriptionManually);
router.get('/plans', adminController.getPlans);
router.post('/plans', adminController.managePlan);

module.exports = router;

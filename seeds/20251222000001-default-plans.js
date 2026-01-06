'use strict';
const { v4: uuidv4 } = require('uuid');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const now = new Date();
    
    await queryInterface.bulkInsert('plans', [
      {
        id: uuidv4(),
        name: 'Free',
        slug: 'free',
        description: 'Perfect for testing and small projects',
        price: 0.00,
        currency: 'USD',
        billing_cycle: 'monthly',
        trial_days: 0,
        features: JSON.stringify({
          features: [
            '1 WhatsApp Session',
            '100 Messages per day',
            'Basic Webhooks',
            'Community Support'
          ]
        }),
        limits: JSON.stringify({
          max_sessions: 1,
          max_messages_per_day: 100,
          max_webhooks: 2,
          max_api_keys: 1
        }),
        status: 'active',
        is_popular: false,
        sort_order: 1,
        metadata: JSON.stringify({}),
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'Starter',
        slug: 'starter',
        description: 'Great for small businesses',
        price: 29.99,
        currency: 'USD',
        billing_cycle: 'monthly',
        trial_days: 7,
        features: JSON.stringify({
          features: [
            '5 WhatsApp Sessions',
            '5,000 Messages per day',
            'Advanced Webhooks',
            'Priority Email Support',
            'Message Scheduling',
            'API Access'
          ]
        }),
        limits: JSON.stringify({
          max_sessions: 5,
          max_messages_per_day: 5000,
          max_webhooks: 10,
          max_api_keys: 5
        }),
        status: 'active',
        is_popular: false,
        sort_order: 2,
        metadata: JSON.stringify({}),
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'Professional',
        slug: 'professional',
        description: 'Most popular for growing businesses',
        price: 99.99,
        currency: 'USD',
        billing_cycle: 'monthly',
        trial_days: 14,
        features: JSON.stringify({
          features: [
            '20 WhatsApp Sessions',
            '50,000 Messages per day',
            'Advanced Webhooks & Events',
            'Priority Support (24/7)',
            'Message Scheduling',
            'Advanced API Access',
            'Custom Branding',
            'Analytics Dashboard'
          ]
        }),
        limits: JSON.stringify({
          max_sessions: 20,
          max_messages_per_day: 50000,
          max_webhooks: 50,
          max_api_keys: 20
        }),
        status: 'active',
        is_popular: true,
        sort_order: 3,
        metadata: JSON.stringify({}),
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'Enterprise',
        slug: 'enterprise',
        description: 'For large scale operations',
        price: 299.99,
        currency: 'USD',
        billing_cycle: 'monthly',
        trial_days: 30,
        features: JSON.stringify({
          features: [
            'Unlimited WhatsApp Sessions',
            'Unlimited Messages',
            'Advanced Webhooks & Events',
            'Dedicated Support Manager',
            'Message Scheduling',
            'Full API Access',
            'Custom Branding',
            'Advanced Analytics',
            'Custom Integrations',
            'SLA Guarantee',
            'Team Management'
          ]
        }),
        limits: JSON.stringify({
          max_sessions: 999999,
          max_messages_per_day: 999999,
          max_webhooks: 999,
          max_api_keys: 999
        }),
        status: 'active',
        is_popular: false,
        sort_order: 4,
        metadata: JSON.stringify({}),
        created_at: now,
        updated_at: now
      }
    ], {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('plans', null, {});
  }
};

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('plans', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      slug: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      currency: {
        type: Sequelize.STRING(3),
        defaultValue: 'USD'
      },
      billing_cycle: {
        type: Sequelize.ENUM('monthly', 'yearly', 'lifetime'),
        allowNull: false
      },
      trial_days: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      features: {
        type: Sequelize.JSON,
        allowNull: false
      },
      limits: {
        type: Sequelize.JSON,
        allowNull: false
      },
      stripe_price_id: {
        type: Sequelize.STRING,
        allowNull: true
      },
      paypal_plan_id: {
        type: Sequelize.STRING,
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('active', 'inactive', 'archived'),
        defaultValue: 'active'
      },
      is_popular: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      sort_order: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addIndex('plans', ['slug']);
    await queryInterface.addIndex('plans', ['status']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('plans');
  }
};

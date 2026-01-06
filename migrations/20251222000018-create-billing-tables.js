'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Create invoices table
    await queryInterface.createTable('invoices', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      subscription_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'subscriptions',
          key: 'id'
        }
      },
      invoice_number: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true
      },
      stripe_invoice_id: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      currency: {
        type: Sequelize.STRING(3),
        defaultValue: 'USD'
      },
      status: {
        type: Sequelize.ENUM('draft', 'pending', 'paid', 'failed', 'cancelled', 'refunded'),
        defaultValue: 'pending'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      billing_period_start: {
        type: Sequelize.DATE,
        allowNull: true
      },
      billing_period_end: {
        type: Sequelize.DATE,
        allowNull: true
      },
      due_date: {
        type: Sequelize.DATE,
        allowNull: true
      },
      paid_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      payment_method: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      }
    });

    // Create payment_methods table
    await queryInterface.createTable('payment_methods', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      stripe_payment_method_id: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      type: {
        type: Sequelize.ENUM('card', 'bank_transfer', 'paypal'),
        defaultValue: 'card'
      },
      card_brand: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      card_last4: {
        type: Sequelize.STRING(4),
        allowNull: true
      },
      card_exp_month: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      card_exp_year: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      is_default: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      }
    });

    // Create transactions table
    await queryInterface.createTable('transactions', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      invoice_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'invoices',
          key: 'id'
        }
      },
      stripe_payment_intent_id: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      stripe_charge_id: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      type: {
        type: Sequelize.ENUM('payment', 'refund', 'credit', 'debit'),
        defaultValue: 'payment'
      },
      amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      currency: {
        type: Sequelize.STRING(3),
        defaultValue: 'USD'
      },
      status: {
        type: Sequelize.ENUM('pending', 'processing', 'succeeded', 'failed', 'cancelled'),
        defaultValue: 'pending'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      }
    });

    // Add stripe_customer_id to users (check if exists)
    const [userStripeCol] = await queryInterface.sequelize.query(
      `SHOW COLUMNS FROM users LIKE 'stripe_customer_id'`
    );
    
    if (userStripeCol.length === 0) {
      await queryInterface.addColumn('users', 'stripe_customer_id', {
        type: Sequelize.STRING(100),
        allowNull: true
      });
    }

    // Add stripe fields to subscriptions (only if they don't exist)
    // stripe_subscription_id already exists from previous migration
    
    const [subColumns] = await queryInterface.sequelize.query(
      `SHOW COLUMNS FROM subscriptions LIKE 'stripe_price_id'`
    );
    
    if (subColumns.length === 0) {
      await queryInterface.addColumn('subscriptions', 'stripe_price_id', {
        type: Sequelize.STRING(100),
        allowNull: true
      });
    }

    const [periodStartCols] = await queryInterface.sequelize.query(
      `SHOW COLUMNS FROM subscriptions LIKE 'current_period_start'`
    );
    
    if (periodStartCols.length === 0) {
      await queryInterface.addColumn('subscriptions', 'current_period_start', {
        type: Sequelize.DATE,
        allowNull: true
      });
    }

    const [periodEndCols] = await queryInterface.sequelize.query(
      `SHOW COLUMNS FROM subscriptions LIKE 'current_period_end'`
    );
    
    if (periodEndCols.length === 0) {
      await queryInterface.addColumn('subscriptions', 'current_period_end', {
        type: Sequelize.DATE,
        allowNull: true
      });
    }

    const [cancelCols] = await queryInterface.sequelize.query(
      `SHOW COLUMNS FROM subscriptions LIKE 'cancel_at_period_end'`
    );
    
    if (cancelCols.length === 0) {
      await queryInterface.addColumn('subscriptions', 'cancel_at_period_end', {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      });
    }

    // Add stripe_price_id to plans (check if exists)
    const [planPriceCols] = await queryInterface.sequelize.query(
      `SHOW COLUMNS FROM plans LIKE 'stripe_price_id'`
    );
    
    if (planPriceCols.length === 0) {
      await queryInterface.addColumn('plans', 'stripe_price_id', {
        type: Sequelize.STRING(100),
        allowNull: true
      });
    }

    const [planProductCols] = await queryInterface.sequelize.query(
      `SHOW COLUMNS FROM plans LIKE 'stripe_product_id'`
    );
    
    if (planProductCols.length === 0) {
      await queryInterface.addColumn('plans', 'stripe_product_id', {
        type: Sequelize.STRING(100),
        allowNull: true
      });
    }

    const [billingIntervalCols] = await queryInterface.sequelize.query(
      `SHOW COLUMNS FROM plans LIKE 'billing_interval'`
    );
    
    if (billingIntervalCols.length === 0) {
      await queryInterface.addColumn('plans', 'billing_interval', {
        type: Sequelize.ENUM('month', 'year'),
        defaultValue: 'month'
      });
    }

    // Indexes
    await queryInterface.addIndex('invoices', ['user_id']);
    await queryInterface.addIndex('invoices', ['status']);
    await queryInterface.addIndex('invoices', ['invoice_number']);
    await queryInterface.addIndex('payment_methods', ['user_id']);
    await queryInterface.addIndex('transactions', ['user_id']);
    await queryInterface.addIndex('transactions', ['invoice_id']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('transactions');
    await queryInterface.dropTable('payment_methods');
    await queryInterface.dropTable('invoices');
    
    // Only remove columns that this migration added (not stripe_subscription_id)
    try { await queryInterface.removeColumn('users', 'stripe_customer_id'); } catch(e) {}
    try { await queryInterface.removeColumn('subscriptions', 'stripe_price_id'); } catch(e) {}
    try { await queryInterface.removeColumn('subscriptions', 'current_period_start'); } catch(e) {}
    try { await queryInterface.removeColumn('subscriptions', 'current_period_end'); } catch(e) {}
    try { await queryInterface.removeColumn('subscriptions', 'cancel_at_period_end'); } catch(e) {}
    try { await queryInterface.removeColumn('plans', 'stripe_price_id'); } catch(e) {}
    try { await queryInterface.removeColumn('plans', 'stripe_product_id'); } catch(e) {}
    try { await queryInterface.removeColumn('plans', 'billing_interval'); } catch(e) {}
  }
};

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('webhooks', {
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
      session_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'sessions',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      url: {
        type: Sequelize.STRING,
        allowNull: false
      },
      events: {
        type: Sequelize.JSON,
        allowNull: false
      },
      secret: {
        type: Sequelize.STRING,
        allowNull: true
      },
      headers: {
        type: Sequelize.JSON,
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('active', 'inactive', 'failed'),
        defaultValue: 'active'
      },
      retry_count: {
        type: Sequelize.INTEGER,
        defaultValue: 3
      },
      timeout: {
        type: Sequelize.INTEGER,
        defaultValue: 30000
      },
      last_triggered_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      last_status_code: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      last_error: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      success_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      failure_count: {
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

    await queryInterface.addIndex('webhooks', ['user_id']);
    await queryInterface.addIndex('webhooks', ['session_id']);
    await queryInterface.addIndex('webhooks', ['status']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('webhooks');
  }
};

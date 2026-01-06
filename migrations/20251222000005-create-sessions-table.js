'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('sessions', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      session_id: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
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
      organization_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'organizations',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      phone_number: {
        type: Sequelize.STRING,
        allowNull: true
      },
      qr_code: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('connecting', 'connected', 'disconnected', 'qr', 'failed'),
        defaultValue: 'connecting'
      },
      webhook_url: {
        type: Sequelize.STRING,
        allowNull: true
      },
      webhook_events: {
        type: Sequelize.JSON,
        allowNull: true
      },
      auth_state: {
        type: Sequelize.TEXT('long'),
        allowNull: true
      },
      last_connected_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      last_disconnected_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      reconnect_attempts: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      auto_reconnect: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      settings: {
        type: Sequelize.JSON,
        allowNull: true
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

    await queryInterface.addIndex('sessions', ['session_id']);
    await queryInterface.addIndex('sessions', ['user_id']);
    await queryInterface.addIndex('sessions', ['organization_id']);
    await queryInterface.addIndex('sessions', ['status']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('sessions');
  }
};

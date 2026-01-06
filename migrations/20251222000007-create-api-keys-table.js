'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('api_keys', {
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
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      key: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      secret: {
        type: Sequelize.STRING,
        allowNull: false
      },
      permissions: {
        type: Sequelize.JSON,
        allowNull: true
      },
      rate_limit: {
        type: Sequelize.INTEGER,
        defaultValue: 1000
      },
      rate_limit_window: {
        type: Sequelize.INTEGER,
        defaultValue: 3600
      },
      ip_whitelist: {
        type: Sequelize.JSON,
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('active', 'inactive', 'revoked'),
        defaultValue: 'active'
      },
      last_used_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      last_used_ip: {
        type: Sequelize.STRING,
        allowNull: true
      },
      expires_at: {
        type: Sequelize.DATE,
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

    await queryInterface.addIndex('api_keys', ['key']);
    await queryInterface.addIndex('api_keys', ['user_id']);
    await queryInterface.addIndex('api_keys', ['status']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('api_keys');
  }
};

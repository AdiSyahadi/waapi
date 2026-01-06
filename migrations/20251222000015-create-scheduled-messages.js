'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('scheduled_messages', {
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
        type: Sequelize.STRING(100),
        allowNull: false
      },
      recipient: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      message_type: {
        type: Sequelize.ENUM('text', 'image', 'video', 'audio', 'document', 'location', 'contact'),
        defaultValue: 'text'
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      media_url: {
        type: Sequelize.STRING(500),
        allowNull: true
      },
      caption: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      scheduled_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('pending', 'processing', 'sent', 'failed', 'cancelled'),
        defaultValue: 'pending'
      },
      sent_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      error: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      retry_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      max_retries: {
        type: Sequelize.INTEGER,
        defaultValue: 3
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    await queryInterface.addIndex('scheduled_messages', ['user_id']);
    await queryInterface.addIndex('scheduled_messages', ['session_id']);
    await queryInterface.addIndex('scheduled_messages', ['status']);
    await queryInterface.addIndex('scheduled_messages', ['scheduled_at']);
    await queryInterface.addIndex('scheduled_messages', ['status', 'scheduled_at']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('scheduled_messages');
  }
};

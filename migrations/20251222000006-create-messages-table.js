'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('messages', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      session_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'sessions',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      message_id: {
        type: Sequelize.STRING,
        allowNull: false
      },
      remote_jid: {
        type: Sequelize.STRING,
        allowNull: false
      },
      from_me: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      type: {
        type: Sequelize.ENUM('text', 'image', 'video', 'audio', 'document', 'sticker', 'location', 'contact', 'template'),
        allowNull: false
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      media_url: {
        type: Sequelize.STRING,
        allowNull: true
      },
      media_mime_type: {
        type: Sequelize.STRING,
        allowNull: true
      },
      media_size: {
        type: Sequelize.BIGINT,
        allowNull: true
      },
      thumbnail: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      quoted_message_id: {
        type: Sequelize.STRING,
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('pending', 'sent', 'delivered', 'read', 'failed'),
        defaultValue: 'pending'
      },
      timestamp: {
        type: Sequelize.BIGINT,
        allowNull: false
      },
      scheduled_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      sent_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      delivered_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      read_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      error_message: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      retry_count: {
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

    await queryInterface.addIndex('messages', ['session_id', 'remote_jid']);
    await queryInterface.addIndex('messages', ['message_id']);
    await queryInterface.addIndex('messages', ['status']);
    await queryInterface.addIndex('messages', ['timestamp']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('messages');
  }
};

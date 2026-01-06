'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Message analytics - aggregated daily stats
    await queryInterface.createTable('message_analytics', {
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
        allowNull: true
      },
      date: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      messages_sent: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      messages_delivered: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      messages_read: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      messages_failed: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      messages_received: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      media_sent: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      broadcasts_sent: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      broadcast_recipients: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      unique_recipients: {
        type: Sequelize.INTEGER,
        defaultValue: 0
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

    // API usage analytics
    await queryInterface.createTable('api_analytics', {
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
      date: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      endpoint: {
        type: Sequelize.STRING(200),
        allowNull: false
      },
      method: {
        type: Sequelize.STRING(10),
        allowNull: false
      },
      total_requests: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      successful_requests: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      failed_requests: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      avg_response_time: {
        type: Sequelize.FLOAT,
        defaultValue: 0
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

    // Session analytics
    await queryInterface.createTable('session_analytics', {
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
      date: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      uptime_minutes: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      disconnections: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      reconnections: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      qr_scans: {
        type: Sequelize.INTEGER,
        defaultValue: 0
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

    // Real-time events log (for recent activity)
    await queryInterface.createTable('activity_logs', {
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
        allowNull: true
      },
      event_type: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      event_data: {
        type: Sequelize.JSON,
        allowNull: true
      },
      ip_address: {
        type: Sequelize.STRING(45),
        allowNull: true
      },
      user_agent: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      }
    });

    // Indexes
    await queryInterface.addIndex('message_analytics', ['user_id', 'date']);
    await queryInterface.addIndex('message_analytics', ['session_id', 'date']);
    await queryInterface.addIndex('api_analytics', ['user_id', 'date']);
    await queryInterface.addIndex('api_analytics', ['endpoint']);
    await queryInterface.addIndex('session_analytics', ['user_id', 'date']);
    await queryInterface.addIndex('session_analytics', ['session_id', 'date']);
    await queryInterface.addIndex('activity_logs', ['user_id', 'created_at']);
    await queryInterface.addIndex('activity_logs', ['event_type']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('activity_logs');
    await queryInterface.dropTable('session_analytics');
    await queryInterface.dropTable('api_analytics');
    await queryInterface.dropTable('message_analytics');
  }
};

'use strict';

/**
 * Migration for Major Issues Fixes:
 * #6: Session ID confusion - Add session_identifier column for consistent API access
 * #7: Unread count persistence - Create chats table to persist chat metadata
 * #8: SLA/Response time tracking - Create conversation_metrics table
 * #9: Full-text search - Add FULLTEXT index on messages.content
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // ============================================
      // Issue #7 & #6: Create chats table for persistent chat metadata
      // This table stores chat-level data that was previously in memory
      // ============================================
      await queryInterface.createTable('chats', {
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
        jid: {
          type: Sequelize.STRING(100),
          allowNull: false,
          comment: 'WhatsApp JID (phone@s.whatsapp.net or groupid@g.us)'
        },
        name: {
          type: Sequelize.STRING(255),
          allowNull: true,
          comment: 'Display name (contact name or group subject)'
        },
        phone: {
          type: Sequelize.STRING(20),
          allowNull: true,
          comment: 'Phone number without @s.whatsapp.net'
        },
        is_group: {
          type: Sequelize.BOOLEAN,
          defaultValue: false
        },
        unread_count: {
          type: Sequelize.INTEGER,
          defaultValue: 0,
          comment: 'Persistent unread message count'
        },
        is_archived: {
          type: Sequelize.BOOLEAN,
          defaultValue: false
        },
        is_pinned: {
          type: Sequelize.BOOLEAN,
          defaultValue: false
        },
        is_muted: {
          type: Sequelize.BOOLEAN,
          defaultValue: false
        },
        mute_until: {
          type: Sequelize.DATE,
          allowNull: true
        },
        last_message_at: {
          type: Sequelize.DATE,
          allowNull: true
        },
        last_message_preview: {
          type: Sequelize.STRING(255),
          allowNull: true,
          comment: 'Preview of last message for list display'
        },
        last_message_type: {
          type: Sequelize.STRING(20),
          allowNull: true
        },
        last_message_from_me: {
          type: Sequelize.BOOLEAN,
          allowNull: true
        },
        profile_picture_url: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        metadata: {
          type: Sequelize.JSON,
          allowNull: true,
          defaultValue: {}
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
      }, { transaction });

      // Unique constraint: one chat per session+jid
      await queryInterface.addIndex('chats', ['session_id', 'jid'], {
        unique: true,
        name: 'chats_session_jid_unique',
        transaction
      });

      // Index for quick lookups
      await queryInterface.addIndex('chats', ['session_id', 'last_message_at'], {
        name: 'chats_session_last_message',
        transaction
      });

      await queryInterface.addIndex('chats', ['session_id', 'is_archived', 'is_pinned'], {
        name: 'chats_session_archive_pin',
        transaction
      });

      // ============================================
      // Issue #8: SLA/Response Time Tracking
      // Create conversation_metrics table for agent performance monitoring
      // ============================================
      await queryInterface.createTable('conversation_metrics', {
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
        chat_jid: {
          type: Sequelize.STRING(100),
          allowNull: false
        },
        agent_id: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: 'users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
          comment: 'Agent handling this conversation'
        },
        // Conversation timing
        conversation_started_at: {
          type: Sequelize.DATE,
          allowNull: false,
          comment: 'When customer first messaged'
        },
        first_response_at: {
          type: Sequelize.DATE,
          allowNull: true,
          comment: 'When agent first responded'
        },
        first_response_time_seconds: {
          type: Sequelize.INTEGER,
          allowNull: true,
          comment: 'Time to first response in seconds'
        },
        conversation_resolved_at: {
          type: Sequelize.DATE,
          allowNull: true
        },
        resolution_time_seconds: {
          type: Sequelize.INTEGER,
          allowNull: true,
          comment: 'Total time to resolution in seconds'
        },
        // Message counts
        customer_message_count: {
          type: Sequelize.INTEGER,
          defaultValue: 0
        },
        agent_message_count: {
          type: Sequelize.INTEGER,
          defaultValue: 0
        },
        total_message_count: {
          type: Sequelize.INTEGER,
          defaultValue: 0
        },
        // Response metrics
        avg_response_time_seconds: {
          type: Sequelize.FLOAT,
          allowNull: true,
          comment: 'Average time between customer message and agent response'
        },
        max_response_time_seconds: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        // Status
        status: {
          type: Sequelize.ENUM('active', 'waiting_customer', 'waiting_agent', 'resolved', 'abandoned'),
          defaultValue: 'active'
        },
        // SLA tracking
        sla_breached: {
          type: Sequelize.BOOLEAN,
          defaultValue: false
        },
        sla_breach_at: {
          type: Sequelize.DATE,
          allowNull: true
        },
        sla_target_seconds: {
          type: Sequelize.INTEGER,
          allowNull: true,
          comment: 'SLA target for first response'
        },
        // Customer satisfaction
        csat_score: {
          type: Sequelize.INTEGER,
          allowNull: true,
          comment: 'Customer satisfaction score 1-5'
        },
        csat_feedback: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        // Metadata
        tags: {
          type: Sequelize.JSON,
          allowNull: true,
          defaultValue: []
        },
        notes: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        metadata: {
          type: Sequelize.JSON,
          allowNull: true,
          defaultValue: {}
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
      }, { transaction });

      // Indexes for conversation_metrics
      await queryInterface.addIndex('conversation_metrics', ['session_id', 'chat_jid'], {
        name: 'conv_metrics_session_chat',
        transaction
      });

      await queryInterface.addIndex('conversation_metrics', ['agent_id', 'status'], {
        name: 'conv_metrics_agent_status',
        transaction
      });

      await queryInterface.addIndex('conversation_metrics', ['session_id', 'conversation_started_at'], {
        name: 'conv_metrics_session_started',
        transaction
      });

      await queryInterface.addIndex('conversation_metrics', ['sla_breached', 'status'], {
        name: 'conv_metrics_sla_status',
        transaction
      });

      // ============================================
      // Issue #8: Agent daily stats aggregation table
      // For quick dashboard queries without calculating on-the-fly
      // ============================================
      await queryInterface.createTable('agent_daily_stats', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true
        },
        agent_id: {
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
        date: {
          type: Sequelize.DATEONLY,
          allowNull: false
        },
        // Conversation counts
        conversations_handled: {
          type: Sequelize.INTEGER,
          defaultValue: 0
        },
        conversations_resolved: {
          type: Sequelize.INTEGER,
          defaultValue: 0
        },
        conversations_transferred: {
          type: Sequelize.INTEGER,
          defaultValue: 0
        },
        // Message counts
        messages_sent: {
          type: Sequelize.INTEGER,
          defaultValue: 0
        },
        messages_received: {
          type: Sequelize.INTEGER,
          defaultValue: 0
        },
        // Response times
        avg_first_response_seconds: {
          type: Sequelize.FLOAT,
          allowNull: true
        },
        avg_response_time_seconds: {
          type: Sequelize.FLOAT,
          allowNull: true
        },
        avg_resolution_time_seconds: {
          type: Sequelize.FLOAT,
          allowNull: true
        },
        // SLA
        sla_met_count: {
          type: Sequelize.INTEGER,
          defaultValue: 0
        },
        sla_breached_count: {
          type: Sequelize.INTEGER,
          defaultValue: 0
        },
        sla_compliance_rate: {
          type: Sequelize.FLOAT,
          allowNull: true,
          comment: 'Percentage 0-100'
        },
        // CSAT
        csat_responses: {
          type: Sequelize.INTEGER,
          defaultValue: 0
        },
        csat_total_score: {
          type: Sequelize.INTEGER,
          defaultValue: 0
        },
        csat_average: {
          type: Sequelize.FLOAT,
          allowNull: true
        },
        // Time tracking
        online_duration_minutes: {
          type: Sequelize.INTEGER,
          defaultValue: 0
        },
        busy_duration_minutes: {
          type: Sequelize.INTEGER,
          defaultValue: 0
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
      }, { transaction });

      // Unique constraint for daily stats
      await queryInterface.addIndex('agent_daily_stats', ['agent_id', 'session_id', 'date'], {
        unique: true,
        name: 'agent_stats_unique',
        transaction
      });

      await queryInterface.addIndex('agent_daily_stats', ['date'], {
        name: 'agent_stats_date',
        transaction
      });

      // ============================================
      // Issue #9: Full-text search on messages
      // Add FULLTEXT index for efficient text search
      // ============================================
      await queryInterface.sequelize.query(
        'ALTER TABLE messages ADD FULLTEXT INDEX messages_content_fulltext (content)',
        { transaction }
      );

      // Also add index on remote_jid for faster chat queries
      await queryInterface.addIndex('messages', ['session_id', 'remote_jid', 'timestamp'], {
        name: 'messages_session_jid_timestamp',
        transaction
      });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Remove FULLTEXT index
      await queryInterface.sequelize.query(
        'ALTER TABLE messages DROP INDEX messages_content_fulltext',
        { transaction }
      ).catch(() => {});

      await queryInterface.removeIndex('messages', 'messages_session_jid_timestamp', { transaction }).catch(() => {});

      // Drop tables
      await queryInterface.dropTable('agent_daily_stats', { transaction });
      await queryInterface.dropTable('conversation_metrics', { transaction });
      await queryInterface.dropTable('chats', { transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};

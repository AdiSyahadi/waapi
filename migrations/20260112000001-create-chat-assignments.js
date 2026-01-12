'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('chat_assignments', {
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
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'WhatsApp JID of the chat (phone@s.whatsapp.net or group@g.us)'
      },
      assigned_to: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'User ID of assigned agent'
      },
      assigned_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      status: {
        type: Sequelize.ENUM('open', 'pending', 'resolved', 'closed'),
        defaultValue: 'open'
      },
      priority: {
        type: Sequelize.ENUM('low', 'medium', 'high', 'urgent'),
        defaultValue: 'medium'
      },
      tags: {
        type: Sequelize.JSON,
        defaultValue: [],
        comment: 'Array of tags for categorization'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Internal notes about this chat'
      },
      first_response_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      resolved_at: {
        type: Sequelize.DATE,
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

    // Indexes for quick lookup
    await queryInterface.addIndex('chat_assignments', ['session_id', 'chat_jid'], {
      unique: true,
      name: 'idx_chat_assignments_session_jid'
    });

    await queryInterface.addIndex('chat_assignments', ['assigned_to'], {
      name: 'idx_chat_assignments_agent'
    });

    await queryInterface.addIndex('chat_assignments', ['status'], {
      name: 'idx_chat_assignments_status'
    });

    // Create contacts table for synced contacts
    await queryInterface.createTable('contacts', {
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
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'WhatsApp JID'
      },
      phone: {
        type: Sequelize.STRING,
        allowNull: true
      },
      name: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Display name from WhatsApp'
      },
      push_name: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Push notification name'
      },
      verified_name: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Business verified name'
      },
      is_business: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      profile_picture_url: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      status_text: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'About/status text'
      },
      is_blocked: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      custom_name: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Custom name set by CRM user'
      },
      custom_tags: {
        type: Sequelize.JSON,
        defaultValue: [],
        comment: 'Custom tags for CRM'
      },
      custom_notes: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'CRM notes about this contact'
      },
      metadata: {
        type: Sequelize.JSON,
        defaultValue: {}
      },
      last_message_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      synced_at: {
        type: Sequelize.DATE,
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

    // Indexes for contacts
    await queryInterface.addIndex('contacts', ['session_id', 'jid'], {
      unique: true,
      name: 'idx_contacts_session_jid'
    });

    await queryInterface.addIndex('contacts', ['phone'], {
      name: 'idx_contacts_phone'
    });

    await queryInterface.addIndex('contacts', ['session_id', 'last_message_at'], {
      name: 'idx_contacts_last_message'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('chat_assignments');
    await queryInterface.dropTable('contacts');
  }
};

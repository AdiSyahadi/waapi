/**
 * Chat Model - Persistent chat metadata
 * Fixes Issue #7: Unread count was in memory only, lost after restart
 * 
 * This model stores chat-level metadata that persists across server restarts:
 * - Unread count
 * - Archive/Pin/Mute status
 * - Last message preview
 */
module.exports = (sequelize, DataTypes) => {
  const Chat = sequelize.define('Chat', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    session_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'sessions',
        key: 'id'
      }
    },
    jid: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'WhatsApp JID (phone@s.whatsapp.net or groupid@g.us)'
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Display name (contact name or group subject)'
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'Phone number without @s.whatsapp.net'
    },
    is_group: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    unread_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Persistent unread message count'
    },
    is_archived: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    is_pinned: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    is_muted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    mute_until: {
      type: DataTypes.DATE,
      allowNull: true
    },
    last_message_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    last_message_preview: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Preview of last message for list display'
    },
    last_message_type: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    last_message_from_me: {
      type: DataTypes.BOOLEAN,
      allowNull: true
    },
    profile_picture_url: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {}
    }
  }, {
    tableName: 'chats',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['session_id', 'jid'],
        name: 'chats_session_jid_unique'
      }
    ]
  });

  Chat.associate = (models) => {
    Chat.belongsTo(models.Session, {
      foreignKey: 'session_id',
      as: 'session'
    });
  };

  /**
   * Get or create a chat record
   * Used when receiving a new message to ensure chat exists
   */
  Chat.getOrCreate = async function(sessionId, jid, defaults = {}) {
    const isGroup = jid.endsWith('@g.us');
    const phone = isGroup ? null : jid.split('@')[0];

    const [chat, created] = await this.findOrCreate({
      where: {
        session_id: sessionId,
        jid: jid
      },
      defaults: {
        name: defaults.name || phone || 'Unknown',
        phone: phone,
        is_group: isGroup,
        ...defaults
      }
    });

    return { chat, created };
  };

  /**
   * Increment unread count for a chat
   */
  Chat.incrementUnread = async function(sessionId, jid) {
    const [affectedRows] = await this.increment('unread_count', {
      where: { session_id: sessionId, jid: jid }
    });
    
    // If no rows affected, create the chat
    if (affectedRows === 0) {
      await this.getOrCreate(sessionId, jid, { unread_count: 1 });
    }
  };

  /**
   * Reset unread count (mark as read)
   */
  Chat.markAsRead = async function(sessionId, jid) {
    await this.update(
      { unread_count: 0 },
      { where: { session_id: sessionId, jid: jid } }
    );
  };

  /**
   * Update last message info
   */
  Chat.updateLastMessage = async function(sessionId, jid, message) {
    const preview = message.content?.substring(0, 255) || `[${message.type}]`;
    
    await this.upsert({
      session_id: sessionId,
      jid: jid,
      last_message_at: new Date(),
      last_message_preview: preview,
      last_message_type: message.type,
      last_message_from_me: message.from_me,
      phone: jid.endsWith('@g.us') ? null : jid.split('@')[0],
      is_group: jid.endsWith('@g.us')
    });
  };

  return Chat;
};

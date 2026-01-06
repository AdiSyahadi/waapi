module.exports = (sequelize, DataTypes) => {
  const Message = sequelize.define('Message', {
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
    message_id: {
      type: DataTypes.STRING,
      allowNull: false
    },
    remote_jid: {
      type: DataTypes.STRING,
      allowNull: false
    },
    from_me: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    type: {
      type: DataTypes.ENUM('text', 'image', 'video', 'audio', 'document', 'sticker', 'location', 'contact', 'template'),
      allowNull: false
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    media_url: {
      type: DataTypes.STRING,
      allowNull: true
    },
    media_mime_type: {
      type: DataTypes.STRING,
      allowNull: true
    },
    media_size: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    thumbnail: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    quoted_message_id: {
      type: DataTypes.STRING,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('pending', 'sent', 'delivered', 'read', 'failed', 'deleted'),
      defaultValue: 'pending'
    },
    quoted_message_id: {
      type: DataTypes.STRING,
      allowNull: true
    },
    edited: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    edited_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    timestamp: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    scheduled_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    sent_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    delivered_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    read_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    error_message: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    retry_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {}
    }
  }, {
    tableName: 'messages',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        fields: ['session_id', 'remote_jid']
      },
      {
        fields: ['message_id']
      },
      {
        fields: ['status']
      },
      {
        fields: ['timestamp']
      }
    ]
  });

  Message.associate = (models) => {
    Message.belongsTo(models.Session, {
      foreignKey: 'session_id',
      as: 'session'
    });
  };

  return Message;
};

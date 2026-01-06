module.exports = (sequelize, DataTypes) => {
  const ScheduledMessage = sequelize.define('ScheduledMessage', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    session_id: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    recipient: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'Phone number or group JID'
    },
    message_type: {
      type: DataTypes.ENUM('text', 'image', 'video', 'audio', 'document', 'location', 'contact'),
      defaultValue: 'text'
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'Message content or JSON for media'
    },
    media_url: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    caption: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    scheduled_at: {
      type: DataTypes.DATE,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('pending', 'processing', 'sent', 'failed', 'cancelled'),
      defaultValue: 'pending'
    },
    sent_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    error: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    retry_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    max_retries: {
      type: DataTypes.INTEGER,
      defaultValue: 3
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {}
    }
  }, {
    tableName: 'scheduled_messages',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['user_id'] },
      { fields: ['session_id'] },
      { fields: ['status'] },
      { fields: ['scheduled_at'] },
      { fields: ['status', 'scheduled_at'] }
    ]
  });

  ScheduledMessage.associate = (models) => {
    ScheduledMessage.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });
  };

  return ScheduledMessage;
};

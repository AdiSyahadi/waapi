module.exports = (sequelize, DataTypes) => {
  const MessageAnalytics = sequelize.define('MessageAnalytics', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id'
    },
    sessionId: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'session_id'
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    messagesSent: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'messages_sent'
    },
    messagesDelivered: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'messages_delivered'
    },
    messagesRead: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'messages_read'
    },
    messagesFailed: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'messages_failed'
    },
    messagesReceived: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'messages_received'
    },
    mediaSent: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'media_sent'
    },
    broadcastsSent: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'broadcasts_sent'
    },
    broadcastRecipients: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'broadcast_recipients'
    },
    uniqueRecipients: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'unique_recipients'
    }
  }, {
    tableName: 'message_analytics',
    underscored: true
  });

  MessageAnalytics.associate = function(models) {
    MessageAnalytics.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
  };

  return MessageAnalytics;
};

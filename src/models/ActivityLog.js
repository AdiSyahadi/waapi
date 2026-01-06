module.exports = (sequelize, DataTypes) => {
  const ActivityLog = sequelize.define('ActivityLog', {
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
    eventType: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'event_type'
    },
    eventData: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'event_data'
    },
    ipAddress: {
      type: DataTypes.STRING(45),
      allowNull: true,
      field: 'ip_address'
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'user_agent'
    }
  }, {
    tableName: 'activity_logs',
    underscored: true,
    updatedAt: false // Activity logs don't need updated_at
  });

  ActivityLog.associate = function(models) {
    ActivityLog.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
  };

  // Event types constants
  ActivityLog.EVENT_TYPES = {
    LOGIN: 'login',
    LOGOUT: 'logout',
    SESSION_CREATE: 'session_create',
    SESSION_CONNECT: 'session_connect',
    SESSION_DISCONNECT: 'session_disconnect',
    MESSAGE_SENT: 'message_sent',
    MESSAGE_RECEIVED: 'message_received',
    BROADCAST_SENT: 'broadcast_sent',
    API_CALL: 'api_call',
    WEBHOOK_DELIVERED: 'webhook_delivered',
    SUBSCRIPTION_CREATED: 'subscription_created',
    SUBSCRIPTION_CANCELLED: 'subscription_cancelled',
    PAYMENT_SUCCESS: 'payment_success',
    PAYMENT_FAILED: 'payment_failed'
  };

  return ActivityLog;
};

module.exports = (sequelize, DataTypes) => {
  const WebhookLog = sequelize.define('WebhookLog', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    url: {
      type: DataTypes.STRING(500),
      allowNull: false
    },
    event: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('success', 'failed'),
      allowNull: false
    },
    status_code: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    payload: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    response: {
      type: DataTypes.TEXT,
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
    delivered_at: {
      type: DataTypes.DATE,
      allowNull: false
    }
  }, {
    tableName: 'webhook_logs',
    timestamps: true,
    indexes: [
      {
        fields: ['url']
      },
      {
        fields: ['event']
      },
      {
        fields: ['status']
      },
      {
        fields: ['delivered_at']
      }
    ]
  });

  return WebhookLog;
};

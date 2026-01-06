module.exports = (sequelize, DataTypes) => {
  const Webhook = sequelize.define('Webhook', {
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
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'sessions',
        key: 'id'
      }
    },
    url: {
      type: DataTypes.STRING,
      allowNull: false
    },
    events: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: []
    },
    secret: {
      type: DataTypes.STRING,
      allowNull: true
    },
    headers: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {}
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'failed'),
      defaultValue: 'active'
    },
    retry_count: {
      type: DataTypes.INTEGER,
      defaultValue: 3
    },
    timeout: {
      type: DataTypes.INTEGER,
      defaultValue: 30000
    },
    last_triggered_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    last_status_code: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    last_error: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    success_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    failure_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {}
    }
  }, {
    tableName: 'webhooks',
    underscored: true,
    timestamps: true
  });

  Webhook.associate = (models) => {
    Webhook.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });
    Webhook.belongsTo(models.Session, {
      foreignKey: 'session_id',
      as: 'session'
    });
  };

  return Webhook;
};

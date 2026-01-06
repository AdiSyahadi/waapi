module.exports = (sequelize, DataTypes) => {
  const Session = sequelize.define('Session', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    session_id: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    organization_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'organizations',
        key: 'id'
      }
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    phone_number: {
      type: DataTypes.STRING,
      allowNull: true
    },
    qr_code: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    pairing_code: {
      type: DataTypes.STRING(8),
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('connecting', 'connected', 'disconnected', 'qr', 'pairing', 'failed'),
      defaultValue: 'connecting'
    },
    webhook_url: {
      type: DataTypes.STRING,
      allowNull: true
    },
    webhook_events: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: []
    },
    webhook_secret: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    auth_state: {
      type: DataTypes.TEXT('long'),
      allowNull: true
    },
    last_connected_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    last_disconnected_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    reconnect_attempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    auto_reconnect: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    settings: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {}
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {}
    }
  }, {
    tableName: 'sessions',
    underscored: true,
    timestamps: true
  });

  Session.associate = (models) => {
    Session.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });
    Session.belongsTo(models.Organization, {
      foreignKey: 'organization_id',
      as: 'organization'
    });
    Session.hasMany(models.Message, {
      foreignKey: 'session_id',
      as: 'messages'
    });
  };

  return Session;
};

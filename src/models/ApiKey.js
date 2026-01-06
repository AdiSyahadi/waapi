const crypto = require('crypto');

module.exports = (sequelize, DataTypes) => {
  const ApiKey = sequelize.define('ApiKey', {
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
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    key: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    secret: {
      type: DataTypes.STRING,
      allowNull: false
    },
    permissions: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: []
    },
    rate_limit: {
      type: DataTypes.INTEGER,
      defaultValue: 1000
    },
    rate_limit_window: {
      type: DataTypes.INTEGER,
      defaultValue: 3600
    },
    ip_whitelist: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: []
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'revoked'),
      defaultValue: 'active'
    },
    last_used_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    last_used_ip: {
      type: DataTypes.STRING,
      allowNull: true
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {}
    }
  }, {
    tableName: 'api_keys',
    underscored: true,
    timestamps: true,
    hooks: {
      beforeCreate: async (apiKey) => {
        if (!apiKey.key) {
          apiKey.key = 'sk_' + crypto.randomBytes(32).toString('hex');
        }
        if (!apiKey.secret) {
          apiKey.secret = crypto.randomBytes(32).toString('hex');
        }
      }
    }
  });

  ApiKey.associate = (models) => {
    ApiKey.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });
  };

  return ApiKey;
};

module.exports = (sequelize, DataTypes) => {
  const Plan = sequelize.define('Plan', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    slug: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    currency: {
      type: DataTypes.STRING(3),
      defaultValue: 'USD'
    },
    billing_cycle: {
      type: DataTypes.ENUM('monthly', 'yearly', 'lifetime'),
      allowNull: false
    },
    trial_days: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    features: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {}
    },
    limits: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {
        max_sessions: 1,
        max_messages_per_day: 1000,
        max_webhooks: 5,
        max_api_keys: 3
      }
    },
    stripe_price_id: {
      type: DataTypes.STRING,
      allowNull: true
    },
    paypal_plan_id: {
      type: DataTypes.STRING,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'archived'),
      defaultValue: 'active'
    },
    is_popular: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    sort_order: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {}
    }
  }, {
    tableName: 'plans',
    underscored: true,
    timestamps: true
  });

  Plan.associate = (models) => {
    Plan.hasMany(models.Subscription, {
      foreignKey: 'plan_id',
      as: 'subscriptions'
    });
  };

  return Plan;
};

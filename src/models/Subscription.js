module.exports = (sequelize, DataTypes) => {
  const Subscription = sequelize.define('Subscription', {
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
    plan_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'plans',
        key: 'id'
      }
    },
    status: {
      type: DataTypes.ENUM('active', 'cancelled', 'expired', 'past_due', 'trial'),
      defaultValue: 'trial'
    },
    stripe_subscription_id: {
      type: DataTypes.STRING,
      allowNull: true
    },
    stripe_customer_id: {
      type: DataTypes.STRING,
      allowNull: true
    },
    paypal_subscription_id: {
      type: DataTypes.STRING,
      allowNull: true
    },
    payment_method: {
      type: DataTypes.ENUM('stripe', 'paypal', 'manual'),
      allowNull: true
    },
    current_period_start: {
      type: DataTypes.DATE,
      allowNull: true
    },
    current_period_end: {
      type: DataTypes.DATE,
      allowNull: true
    },
    trial_start: {
      type: DataTypes.DATE,
      allowNull: true
    },
    trial_end: {
      type: DataTypes.DATE,
      allowNull: true
    },
    cancelled_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    ended_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    usage: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {
        sessions: 0,
        messages_today: 0,
        messages_this_month: 0
      }
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {}
    }
  }, {
    tableName: 'subscriptions',
    underscored: true,
    timestamps: true
  });

  Subscription.associate = (models) => {
    Subscription.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });
    Subscription.belongsTo(models.Plan, {
      foreignKey: 'plan_id',
      as: 'plan'
    });
  };

  return Subscription;
};

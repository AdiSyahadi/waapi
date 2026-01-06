module.exports = (sequelize, DataTypes) => {
  const PaymentMethod = sequelize.define('PaymentMethod', {
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
    stripePaymentMethodId: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'stripe_payment_method_id'
    },
    type: {
      type: DataTypes.ENUM('card', 'bank_transfer', 'paypal'),
      defaultValue: 'card'
    },
    cardBrand: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: 'card_brand'
    },
    cardLast4: {
      type: DataTypes.STRING(4),
      allowNull: true,
      field: 'card_last4'
    },
    cardExpMonth: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'card_exp_month'
    },
    cardExpYear: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'card_exp_year'
    },
    isDefault: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_default'
    }
  }, {
    tableName: 'payment_methods',
    underscored: true
  });

  PaymentMethod.associate = function(models) {
    PaymentMethod.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
  };

  return PaymentMethod;
};

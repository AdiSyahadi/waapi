module.exports = (sequelize, DataTypes) => {
  const Transaction = sequelize.define('Transaction', {
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
    invoiceId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'invoice_id'
    },
    stripePaymentIntentId: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'stripe_payment_intent_id'
    },
    stripeChargeId: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'stripe_charge_id'
    },
    type: {
      type: DataTypes.ENUM('payment', 'refund', 'credit', 'debit'),
      defaultValue: 'payment'
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    currency: {
      type: DataTypes.STRING(3),
      defaultValue: 'USD'
    },
    status: {
      type: DataTypes.ENUM('pending', 'processing', 'succeeded', 'failed', 'cancelled'),
      defaultValue: 'pending'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true
    }
  }, {
    tableName: 'transactions',
    underscored: true
  });

  Transaction.associate = function(models) {
    Transaction.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
    Transaction.belongsTo(models.Invoice, {
      foreignKey: 'invoiceId',
      as: 'invoice'
    });
  };

  return Transaction;
};

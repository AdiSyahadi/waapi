module.exports = (sequelize, DataTypes) => {
  const Invoice = sequelize.define('Invoice', {
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
    subscriptionId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'subscription_id'
    },
    invoiceNumber: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      field: 'invoice_number'
    },
    stripeInvoiceId: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'stripe_invoice_id'
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
      type: DataTypes.ENUM('draft', 'pending', 'paid', 'failed', 'cancelled', 'refunded'),
      defaultValue: 'pending'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    billingPeriodStart: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'billing_period_start'
    },
    billingPeriodEnd: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'billing_period_end'
    },
    dueDate: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'due_date'
    },
    paidAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'paid_at'
    },
    paymentMethod: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'payment_method'
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true
    }
  }, {
    tableName: 'invoices',
    underscored: true
  });

  Invoice.associate = function(models) {
    Invoice.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
    Invoice.belongsTo(models.Subscription, {
      foreignKey: 'subscriptionId',
      as: 'subscription'
    });
    Invoice.hasMany(models.Transaction, {
      foreignKey: 'invoiceId',
      as: 'transactions'
    });
  };

  // Generate invoice number
  Invoice.generateInvoiceNumber = async function() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    
    const count = await Invoice.count({
      where: sequelize.where(
        sequelize.fn('YEAR', sequelize.col('created_at')),
        year
      )
    });
    
    return `INV-${year}${month}-${String(count + 1).padStart(5, '0')}`;
  };

  return Invoice;
};

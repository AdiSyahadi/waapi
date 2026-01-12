module.exports = (sequelize, DataTypes) => {
  const Contact = sequelize.define('Contact', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    session_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'sessions',
        key: 'id'
      }
    },
    jid: {
      type: DataTypes.STRING,
      allowNull: false
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: true
    },
    push_name: {
      type: DataTypes.STRING,
      allowNull: true
    },
    verified_name: {
      type: DataTypes.STRING,
      allowNull: true
    },
    is_business: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    profile_picture_url: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    status_text: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    is_blocked: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    custom_name: {
      type: DataTypes.STRING,
      allowNull: true
    },
    custom_tags: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    custom_notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSON,
      defaultValue: {}
    },
    last_message_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    synced_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'contacts',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['session_id', 'jid']
      },
      {
        fields: ['phone']
      },
      {
        fields: ['session_id', 'last_message_at']
      }
    ]
  });

  Contact.associate = (models) => {
    Contact.belongsTo(models.Session, {
      foreignKey: 'session_id',
      as: 'session'
    });
  };

  return Contact;
};

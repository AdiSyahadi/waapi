module.exports = (sequelize, DataTypes) => {
  const ChatAssignment = sequelize.define('ChatAssignment', {
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
    chat_jid: {
      type: DataTypes.STRING,
      allowNull: false
    },
    assigned_to: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    assigned_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    status: {
      type: DataTypes.ENUM('open', 'pending', 'resolved', 'closed'),
      defaultValue: 'open'
    },
    priority: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
      defaultValue: 'medium'
    },
    tags: {
      type: DataTypes.JSON,
      defaultValue: []
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    first_response_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    resolved_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'chat_assignments',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['session_id', 'chat_jid']
      },
      {
        fields: ['assigned_to']
      },
      {
        fields: ['status']
      }
    ]
  });

  ChatAssignment.associate = (models) => {
    ChatAssignment.belongsTo(models.Session, {
      foreignKey: 'session_id',
      as: 'session'
    });
    ChatAssignment.belongsTo(models.User, {
      foreignKey: 'assigned_to',
      as: 'assignedAgent'
    });
    ChatAssignment.belongsTo(models.User, {
      foreignKey: 'assigned_by',
      as: 'assignedByUser'
    });
  };

  return ChatAssignment;
};

module.exports = (sequelize, DataTypes) => {
  const Template = sequelize.define('Template', {
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
    type: {
      type: DataTypes.ENUM('text', 'media', 'button', 'list', 'location', 'contact'),
      allowNull: false,
      defaultValue: 'text'
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    variables: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: []
    },
    category: {
      type: DataTypes.STRING,
      allowNull: true
    },
    usage_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {}
    }
  }, {
    tableName: 'templates',
    underscored: true,
    timestamps: true
  });

  Template.associate = (models) => {
    Template.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });
    Template.belongsTo(models.Organization, {
      foreignKey: 'organization_id',
      as: 'organization'
    });
  };

  return Template;
};

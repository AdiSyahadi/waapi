module.exports = (sequelize, DataTypes) => {
  const ApiAnalytics = sequelize.define('ApiAnalytics', {
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
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    endpoint: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    method: {
      type: DataTypes.STRING(10),
      allowNull: false
    },
    totalRequests: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'total_requests'
    },
    successfulRequests: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'successful_requests'
    },
    failedRequests: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'failed_requests'
    },
    avgResponseTime: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
      field: 'avg_response_time'
    }
  }, {
    tableName: 'api_analytics',
    underscored: true
  });

  ApiAnalytics.associate = function(models) {
    ApiAnalytics.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
  };

  return ApiAnalytics;
};

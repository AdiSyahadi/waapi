module.exports = (sequelize, DataTypes) => {
  const SessionAnalytics = sequelize.define('SessionAnalytics', {
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
    sessionId: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'session_id'
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    uptimeMinutes: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'uptime_minutes'
    },
    disconnections: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    reconnections: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    qrScans: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'qr_scans'
    }
  }, {
    tableName: 'session_analytics',
    underscored: true
  });

  SessionAnalytics.associate = function(models) {
    SessionAnalytics.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
  };

  return SessionAnalytics;
};

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add pairing_code column
    await queryInterface.addColumn('sessions', 'pairing_code', {
      type: Sequelize.STRING(8),
      allowNull: true,
      after: 'qr_code'
    });

    // Update status enum to include 'pairing'
    await queryInterface.changeColumn('sessions', 'status', {
      type: Sequelize.ENUM('connecting', 'connected', 'disconnected', 'qr', 'pairing', 'failed'),
      defaultValue: 'connecting'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove pairing_code column
    await queryInterface.removeColumn('sessions', 'pairing_code');

    // Revert status enum
    await queryInterface.changeColumn('sessions', 'status', {
      type: Sequelize.ENUM('connecting', 'connected', 'disconnected', 'qr', 'failed'),
      defaultValue: 'connecting'
    });
  }
};

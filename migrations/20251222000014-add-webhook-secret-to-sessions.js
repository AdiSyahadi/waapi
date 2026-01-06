'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('sessions', 'webhook_secret', {
      type: Sequelize.STRING(255),
      allowNull: true,
      after: 'webhook_events'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('sessions', 'webhook_secret');
  }
};

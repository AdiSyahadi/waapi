'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add admin_notes column to users table for admin use
    await queryInterface.addColumn('users', 'admin_notes', {
      type: Sequelize.TEXT,
      allowNull: true
    });

    // Add suspended_at column to track when user was suspended
    await queryInterface.addColumn('users', 'suspended_at', {
      type: Sequelize.DATE,
      allowNull: true
    });

    // Add suspended_reason column
    await queryInterface.addColumn('users', 'suspended_reason', {
      type: Sequelize.STRING(500),
      allowNull: true
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('users', 'admin_notes');
    await queryInterface.removeColumn('users', 'suspended_at');
    await queryInterface.removeColumn('users', 'suspended_reason');
  }
};

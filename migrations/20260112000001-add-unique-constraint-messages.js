'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Remove duplicate messages first (keep the latest one)
    await queryInterface.sequelize.query(`
      DELETE m1 FROM messages m1
      INNER JOIN messages m2 
      WHERE m1.id > m2.id 
        AND m1.message_id = m2.message_id 
        AND m1.session_id = m2.session_id
    `);

    // Add unique constraint on message_id + session_id
    await queryInterface.addConstraint('messages', {
      fields: ['message_id', 'session_id'],
      type: 'unique',
      name: 'unique_message_per_session'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeConstraint('messages', 'unique_message_per_session');
  }
};

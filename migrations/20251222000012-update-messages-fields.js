'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add edited field
    await queryInterface.addColumn('messages', 'edited', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      after: 'quoted_message_id'
    });

    // Add edited_at field
    await queryInterface.addColumn('messages', 'edited_at', {
      type: Sequelize.DATE,
      allowNull: true,
      after: 'edited'
    });

    // Add deleted_at field
    await queryInterface.addColumn('messages', 'deleted_at', {
      type: Sequelize.DATE,
      allowNull: true,
      after: 'edited_at'
    });

    // Update status enum to include 'deleted'
    await queryInterface.changeColumn('messages', 'status', {
      type: Sequelize.ENUM('pending', 'sent', 'delivered', 'read', 'failed', 'deleted'),
      defaultValue: 'pending'
    });

    // Update type enum to include new types
    await queryInterface.changeColumn('messages', 'type', {
      type: Sequelize.ENUM('text', 'image', 'video', 'audio', 'document', 'sticker', 'location', 'contact', 'template', 'button', 'list', 'poll'),
      allowNull: false
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove added columns
    await queryInterface.removeColumn('messages', 'edited');
    await queryInterface.removeColumn('messages', 'edited_at');
    await queryInterface.removeColumn('messages', 'deleted_at');

    // Revert status enum
    await queryInterface.changeColumn('messages', 'status', {
      type: Sequelize.ENUM('pending', 'sent', 'delivered', 'read', 'failed'),
      defaultValue: 'pending'
    });

    // Revert type enum
    await queryInterface.changeColumn('messages', 'type', {
      type: Sequelize.ENUM('text', 'image', 'video', 'audio', 'document', 'sticker', 'location', 'contact', 'template'),
      allowNull: false
    });
  }
};

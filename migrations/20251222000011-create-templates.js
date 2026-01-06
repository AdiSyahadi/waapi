'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('templates', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      organization_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'organizations',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      type: {
        type: Sequelize.ENUM('text', 'media', 'button', 'list', 'location', 'contact'),
        allowNull: false,
        defaultValue: 'text'
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      variables: {
        type: Sequelize.JSON,
        allowNull: true
      },
      category: {
        type: Sequelize.STRING,
        allowNull: true
      },
      usage_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // Add indexes
    await queryInterface.addIndex('templates', ['user_id']);
    await queryInterface.addIndex('templates', ['organization_id']);
    await queryInterface.addIndex('templates', ['type']);
    await queryInterface.addIndex('templates', ['is_active']);
    await queryInterface.addIndex('templates', ['user_id', 'name'], { unique: true });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('templates');
  }
};

'use strict';
const bcrypt = require('bcrypt');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const hashedPassword = await bcrypt.hash('Admin@123456', 12);
    
    // Create admin user if not exists
    const [results] = await queryInterface.sequelize.query(
      `SELECT * FROM users WHERE email = 'admin@whatsapp-api.com'`
    );
    
    if (results.length === 0) {
      const adminId = require('crypto').randomUUID();
      
      await queryInterface.bulkInsert('users', [{
        id: adminId,
        email: 'admin@whatsapp-api.com',
        password: hashedPassword,
        name: 'System Administrator',
        role: 'admin',
        status: 'active',
        email_verified: true,
        created_at: new Date(),
        updated_at: new Date()
      }]);

      // Find enterprise plan
      const [plans] = await queryInterface.sequelize.query(
        `SELECT id FROM plans WHERE name = 'Enterprise' OR name = 'enterprise' LIMIT 1`
      );

      if (plans.length > 0) {
        // Create subscription for admin with existing plan
        await queryInterface.bulkInsert('subscriptions', [{
          id: require('crypto').randomUUID(),
          user_id: adminId,
          plan_id: plans[0].id,
          status: 'active',
          created_at: new Date(),
          updated_at: new Date()
        }]);
      }

      console.log('✅ Admin user created: admin@whatsapp-api.com / Admin@123456');
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('users', { email: 'admin@whatsapp-api.com' });
  }
};

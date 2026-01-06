require('dotenv').config();
const { Plan, sequelize } = require('../src/models');

async function checkPlans() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    const plans = await Plan.findAll({
      attributes: ['id', 'name', 'slug', 'price', 'status', 'is_popular'],
      order: [['sort_order', 'ASC']]
    });

    console.log(`📋 Found ${plans.length} plans:\n`);
    
    plans.forEach(p => {
      const dataValues = p.dataValues || p;
      console.log(`${dataValues.is_popular ? '⭐' : '  '} ID: ${dataValues.id}`);
      console.log(`   Name: ${dataValues.name}`);
      console.log(`   Slug: ${dataValues.slug}`);
      console.log(`   Price: $${dataValues.price}`);
      console.log(`   Status: ${dataValues.status}`);
      console.log('');
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkPlans();

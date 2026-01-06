require('dotenv').config();
const { Plan, sequelize } = require('../src/models');

const plans = [
  {
    id: 'free',
    name: 'Free',
    slug: 'free',
    description: 'Perfect for testing',
    price: 0,
    currency: 'USD',
    billing_cycle: 'monthly',
    trial_days: 0,
    features: JSON.stringify({
      sessions: 1,
      messages: 100,
      api_calls: 1000,
      support: 'email'
    }),
    limits: JSON.stringify({
      sessions: 1,
      messages: 100,
      api_calls: 1000
    }),
    status: 'active',
    is_popular: false,
    sort_order: 1
  },
  {
    id: 'starter',
    name: 'Starter',
    slug: 'starter',
    description: 'Best for small businesses',
    price: 29,
    currency: 'USD',
    billing_cycle: 'monthly',
    trial_days: 7,
    features: JSON.stringify({
      sessions: 3,
      messages: 5000,
      api_calls: 10000,
      support: 'email'
    }),
    limits: JSON.stringify({
      sessions: 3,
      messages: 5000,
      api_calls: 10000
    }),
    status: 'active',
    is_popular: true,
    sort_order: 2
  },
  {
    id: 'professional',
    name: 'Professional',
    slug: 'professional',
    description: 'For growing businesses',
    price: 99,
    currency: 'USD',
    billing_cycle: 'monthly',
    trial_days: 14,
    features: JSON.stringify({
      sessions: 10,
      messages: 20000,
      api_calls: 50000,
      support: 'priority'
    }),
    limits: JSON.stringify({
      sessions: 10,
      messages: 20000,
      api_calls: 50000
    }),
    status: 'active',
    is_popular: false,
    sort_order: 3
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    slug: 'enterprise',
    description: 'For large organizations',
    price: 299,
    currency: 'USD',
    billing_cycle: 'monthly',
    trial_days: 30,
    features: JSON.stringify({
      sessions: -1,
      messages: -1,
      api_calls: -1,
      support: 'dedicated'
    }),
    limits: JSON.stringify({
      sessions: -1,
      messages: -1,
      api_calls: -1
    }),
    status: 'active',
    is_popular: false,
    sort_order: 4
  }
];

async function seedPlans() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');

    // Check existing plans
    const existingPlans = await Plan.findAll();
    console.log(`📊 Found ${existingPlans.length} existing plans`);

    // Create or update plans
    for (const planData of plans) {
      const [plan, created] = await Plan.findOrCreate({
        where: { id: planData.id },
        defaults: planData
      });

      if (!created) {
        await plan.update(planData);
        console.log(`✏️  Updated plan: ${planData.name}`);
      } else {
        console.log(`✅ Created plan: ${planData.name}`);
      }
    }

    // Display all plans
    const allPlans = await Plan.findAll({
      attributes: ['id', 'name', 'price', 'status', 'is_popular'],
      order: [['sort_order', 'ASC']]
    });

    console.log('\n📋 All plans:');
    allPlans.forEach(p => {
      console.log(`  ${p.is_popular ? '⭐' : '  '} ${p.id.padEnd(15)} ${p.name.padEnd(15)} $${p.price.toString().padEnd(6)} ${p.status}`);
    });

    console.log('\n✅ Plans seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding plans:', error);
    process.exit(1);
  }
}

seedPlans();

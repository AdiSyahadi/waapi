// Comprehensive routes check
require('dotenv').config();

console.log('🔍 Checking ALL routes...\n');

const routes = [
  { name: 'Auth', path: './src/routes/auth' },
  { name: 'Sessions', path: './src/routes/sessions' },
  { name: 'Messages', path: './src/routes/messages' },
  { name: 'Templates', path: './src/routes/templates' },
  { name: 'Broadcast', path: './src/routes/broadcast' },
  { name: 'Chat', path: './src/routes/chat' },
  { name: 'Groups', path: './src/routes/groupRoutes' },
  { name: 'Contacts', path: './src/routes/contactRoutes' },
  { name: 'Webhooks', path: './src/routes/webhookRoutes' },
  { name: 'Schedule', path: './src/routes/scheduleRoutes' },
  { name: 'Admin', path: './src/routes/adminRoutes' },
  { name: 'Billing', path: './src/routes/billingRoutes' },
  { name: 'Analytics', path: './src/routes/analyticsRoutes' }
];

let totalRoutes = 0;
let loadedModules = 0;
let failedModules = [];

routes.forEach(({ name, path }) => {
  try {
    const route = require(path);
    const routeCount = route.stack.filter(r => r.route).length;
    totalRoutes += routeCount;
    loadedModules++;
    console.log(`✅ ${name.padEnd(15)} - ${routeCount} endpoints`);
  } catch (error) {
    failedModules.push({ name, error: error.message });
    console.log(`❌ ${name.padEnd(15)} - FAILED: ${error.message}`);
  }
});

console.log('\n' + '='.repeat(50));
console.log(`📊 Summary:`);
console.log(`   Loaded modules: ${loadedModules}/${routes.length}`);
console.log(`   Total endpoints: ${totalRoutes}`);

if (failedModules.length > 0) {
  console.log(`\n❌ Failed modules (${failedModules.length}):`);
  failedModules.forEach(({ name, error }) => {
    console.log(`   - ${name}: ${error}`);
  });
  process.exit(1);
} else {
  console.log('\n✅ All routes loaded successfully!');
  process.exit(0);
}

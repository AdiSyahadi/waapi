// Test script untuk cek routes
const express = require('express');
const app = express();

// Test import routes
try {
  console.log('Testing routes import...');
  
  const authRoutes = require('./src/routes/auth');
  console.log('✅ authRoutes loaded');
  
  const sessionRoutes = require('./src/routes/sessions');
  console.log('✅ sessionRoutes loaded');
  
  const messageRoutes = require('./src/routes/messages');
  console.log('✅ messageRoutes loaded');
  
  console.log('\nAll routes loaded successfully!');
  console.log('\nRegistered routes in authRoutes:');
  authRoutes.stack.forEach(r => {
    if (r.route) {
      console.log(`  ${Object.keys(r.route.methods)[0].toUpperCase()} /api/v1/auth${r.route.path}`);
    }
  });
  
} catch (error) {
  console.error('❌ Error loading routes:', error.message);
  console.error(error.stack);
}

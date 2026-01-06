// Simple server starter with error catching
require('dotenv').config();

console.log('Starting WhatsApp API Server...');
console.log('Node version:', process.version);
console.log('Working directory:', process.cwd());

try {
  require('./src/app.js');
} catch (error) {
  console.error('❌ Fatal Error starting server:');
  console.error(error);
  process.exit(1);
}

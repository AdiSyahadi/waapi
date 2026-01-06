// Simple test to check if the issue is with HTTP request or Baileys
const express = require('express');
const app = express();

app.use(express.json());

let testValue = 0;

app.post('/test-async', async (req, res) => {
  console.log('[TEST] Request received');
  
  // Simulate async operation without Baileys
  setTimeout(() => {
    console.log('[TEST] Async operation completed');
    testValue++;
  }, 100);
  
  console.log('[TEST] Sending response');
  res.json({ success: true, message: 'Test OK', value: testValue });
  console.log('[TEST] Response sent');
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
  console.log('Try: curl -X POST http://localhost:3001/test-async -H "Content-Type: application/json"');
});

// Handle SIGINT
process.on('SIGINT', () => {
  console.log('[TEST] SIGINT received!');
  process.exit(0);
});

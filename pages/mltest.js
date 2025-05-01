// test-kantata-validation.js - Save this as a separate file to run with Node.js
const fetch = require('node-fetch');

async function testValidation() {
  // Replace with your actual OAuth token
  const token = 'your-auth-token';
  
  // Test case 1: Valid project ID with an approved review
  try {
    const response = await fetch('https://graph-review-system-3a7t.vercel.app/api/kantata/validate-status?projectId=test-project-123', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    });
    
    const data = await response.json();
    console.log('Test 1 Result:', data);
  } catch (error) {
    console.error('Test 1 Error:', error);
  }
  
  // Test case 2: Valid project ID with a non-approved review
  try {
    const response = await fetch('https://graph-review-system-3a7t.vercel.app/api/kantata/validate-status?projectId=test-project-456', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    });
    
    const data = await response.json();
    console.log('Test 2 Result:', data);
  } catch (error) {
    console.error('Test 2 Error:', error);
  }
  
  // Test case 3: Invalid project ID
  try {
    const response = await fetch('https://graph-review-system-3a7t.vercel.app/api/kantata/validate-status?projectId=nonexistent', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      }
    });
    
    const data = await response.json();
    console.log('Test 3 Result:', data);
  } catch (error) {
    console.error('Test 3 Error:', error);
  }
}

testValidation();
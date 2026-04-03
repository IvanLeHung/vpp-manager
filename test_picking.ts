import axios from 'axios';

const BASE_URL = 'http://localhost:3001/api';
const REQUEST_ID = 'PDX-09483149';

async function testCompletePicking() {
  try {
    // 1. Login as kho (since subagent might have changed password to Employee@123)
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'kho',
      password: 'Employee@123'
    });
    const token = loginRes.data.token;
    console.log('Login successful');

    // 2. Complete picking
    const completeRes = await axios.post(`${BASE_URL}/requests/${REQUEST_ID}/warehouse/complete_picking`, {
      items: [
        { itemId: '7f9c9682-1430-47e1-965a-168cdf459f99', qtyPicked: 1 }, // Giấy in A4 SPEED
        { itemId: 'd3cbd1b6-0b3b-4b1a-9c1a-1a2b3c4d5e6f', qtyPicked: 1 }  // Bút bi Thiên Long 045
      ],
      note: 'Completed via test script'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('Complete Picking Result:', completeRes.data);
  } catch (err: any) {
    console.error('Error:', err.response?.data || err.message);
  }
}

testCompletePicking();

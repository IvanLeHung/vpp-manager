async function test() {
  const baseURL = 'http://localhost:3001/api';
  try {
    console.log('Logging in...');
    const loginRes = await fetch(`${baseURL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'Admin@123' })
    });
    const loginData = await loginRes.json();
    if (!loginRes.ok) throw new Error(`Login failed: ${loginData.error}`);
    
    const token = loginData.token;
    console.log('Login successful');

    const headers = { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };

    console.log('Testing GET /departments');
    const getRes = await fetch(`${baseURL}/departments`, { headers });
    const getData = await getRes.json();
    console.log('GET successful, found', getData.data.length, 'departments');

    console.log('Testing POST /departments');
    const testCode = 'TEST' + Math.floor(Math.random() * 1000);
    const postRes = await fetch(`${baseURL}/departments`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        code: testCode,
        name: 'Phòng Thử Nghiệm',
        isActive: true
      })
    });
    const postData = await postRes.json();
    if (!postRes.ok) throw new Error(`POST failed: ${postData.error}`);
    console.log('POST successful:', postData.data.code);

    const deptId = postData.data.id;
    console.log('Testing PUT /departments/' + deptId);
    const putRes = await fetch(`${baseURL}/departments/${deptId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        code: testCode,
        name: 'Phòng Thử Nghiệm (Updated)',
        isActive: false
      })
    });
    const putData = await putRes.json();
    if (!putRes.ok) throw new Error(`PUT failed: ${putData.error}`);
    console.log('PUT successful:', putData.data.name);

    console.log('All tests passed!');
  } catch (error) {
    console.error('Test Error:', error.message);
  }
}

test();

#!/usr/bin/env node
const http = require('http');

const username = process.argv[2];
const password = process.argv[3];
const name = process.argv[4] || username;
const role = (process.argv[5] || 'OWNER').toUpperCase();

if (!username || !password) {
  console.log(`
Usage:
  node scripts/create-user.js <username> <password> [fullName] [role]

Examples:
  node scripts/create-user.js ramesh password123 "Ramesh Kumar" OWNER
  node scripts/create-user.js supervisor1 pass123 "Field Supervisor" SUPERVISOR
  node scripts/create-user.js accountant1 pass123 "Site Accountant" ACCOUNTANT
`);
  process.exit(1);
}

const payload = JSON.stringify({
  email: `${username.toLowerCase()}@rrconstruction.app`,
  username: username.toLowerCase(),
  name: name,
  password: password,
  role: role,
});

const req = http.request(
  {
    hostname: '127.0.0.1',
    port: 3000,
    path: '/api/auth/sign-up/email',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
    },
  },
  (res) => {
    let data = '';
    res.on('data', (chunk) => (data += chunk));
    res.on('end', () => {
      try {
        const json = JSON.parse(data);
        if (json.error) {
          console.error(`❌ Error creating user:`, json.error.message || json.error);
        } else {
          console.log(`✅ User successfully created in Better Auth & SQLite!`);
          console.log(`-----------------------------------------------`);
          console.log(`Username : ${username.toLowerCase()}`);
          console.log(`Name     : ${name}`);
          console.log(`Role     : ${role}`);
          console.log(`Password : ${password}`);
          console.log(`-----------------------------------------------`);
        }
      } catch (e) {
        console.log('Response:', data);
      }
    });
  }
);

req.on('error', (err) => {
  console.error('❌ Could not connect to dev server on port 3000. Is "npm run dev" running?');
  console.error(err.message);
});

req.write(payload);
req.end();

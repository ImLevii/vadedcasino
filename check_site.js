const https = require('https');

const req = https.get('https://cosmicluck.gg/', { timeout: 15000 }, (res) => {
  console.log('STATUS:', res.statusCode);
  console.log('HEADERS:', JSON.stringify(res.headers, null, 2));
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('BODY length:', data.length);
    console.log('BODY preview:', data.substring(0, 500));
    process.exit(0);
  });
});

req.on('error', (e) => {
  console.log('ERROR:', e.code, e.message);
  process.exit(1);
});

req.end();
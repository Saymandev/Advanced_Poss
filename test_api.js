const http = require('http');

async function checkApi() {
  const url = "https://api.raincyber.com/api/v1/public/companies/raincyber/branches/dhaka/products/6a3d59f5585cfa47bfe933ce/reviews";
  const https = require('https');
  
  https.get(url, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log('Status Code:', res.statusCode);
      console.log('Response:', data);
    });
  }).on('error', err => {
    console.error('Error:', err.message);
  });
}
checkApi();

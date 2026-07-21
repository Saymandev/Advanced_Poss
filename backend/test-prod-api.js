const jwt = require('jsonwebtoken');
const https = require('https');

const secret = '44efb23d4c7c952c9acc50427b01408c6f6ea1fe0304ff28c82e2a1fbf58e769f3569beb202940e2400d85a3d34d7eedb094fd7fd824fb3af81bff752004cad7';

const payload = {
  sub: '6a37fa7a289b39650e480495', // userId
  companyId: '6a37fa7a289b39650e480471',
  branchId: '6a37fa7a289b39650e480485',
  role: 'owner',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 3600
};

const token = jwt.sign(payload, secret);

const url = 'https://api.raha.bd/api/v1/work-periods/6a4b59e9c1befe0084a849cb/summary?branchId=6a37fa7a289b39650e480485';

https.get(url, {
  headers: {
    'Authorization': 'Bearer ' + token
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log(res.statusCode);
    console.log(data);
  });
}).on('error', err => {
  console.error(err);
});

# 🚀 Deployment Guide

Complete guide to deploy the Restaurant POS System to production.

---

## 📋 Pre-Deployment Checklist

- [ ] Environment variables configured
- [ ] Database indexes created
- [ ] SSL certificates obtained
- [ ] Domain DNS configured
- [ ] CDN setup (if using)
- [ ] Email service configured
- [ ] Payment gateway (Stripe) configured
- [ ] Cloudinary account setup
- [ ] Monitoring tools setup
- [ ] Backup strategy implemented

---

## 🐳 Docker Deployment

### 1. Build Images

```bash
# Build backend
cd backend
docker build -t restaurant-pos-backend:latest .

# Build frontend
cd ../frontend
docker build -t restaurant-pos-frontend:latest .
```

### 2. Docker Compose Production

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:7.0
    restart: always
    environment:
      MONGO_INITDB_ROOT_USERNAME: ${MONGO_USERNAME}
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD}
    volumes:
      - mongodb_data:/data/db
    networks:
      - app-network

  redis:
    image: redis:7-alpine
    restart: always
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    networks:
      - app-network

  backend:
    image: restaurant-pos-backend:latest
    restart: always
    environment:
      NODE_ENV: production
      MONGODB_URI: ${MONGODB_URI}
      REDIS_HOST: redis
      JWT_SECRET: ${JWT_SECRET}
      STRIPE_SECRET_KEY: ${STRIPE_SECRET_KEY}
    depends_on:
      - mongodb
      - redis
    networks:
      - app-network

  frontend:
    image: restaurant-pos-frontend:latest
    restart: always
    environment:
      NODE_ENV: production
      NEXT_PUBLIC_API_URL: ${API_URL}
    depends_on:
      - backend
    networks:
      - app-network

  nginx:
    image: nginx:alpine
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - frontend
      - backend
    networks:
      - app-network

volumes:
  mongodb_data:
  redis_data:

networks:
  app-network:
    driver: bridge
```

### 3. Start Production

```bash
docker-compose -f docker-compose.prod.yml up -d
```

---

## ☁️ Cloud Deployment Options

### Option 1: AWS (Recommended for Enterprise)

#### Architecture:
- **EC2** - Application servers
- **RDS MongoDB** - Managed database
- **ElastiCache** - Redis cache
- **S3** - File storage
- **CloudFront** - CDN
- **Route53** - DNS
- **Load Balancer** - Traffic distribution
- **CloudWatch** - Monitoring

#### Steps:

1. **Create VPC & Security Groups**
```bash
# Create VPC
aws ec2 create-vpc --cidr-block 10.0.0.0/16

# Create security groups
aws ec2 create-security-group --group-name restaurant-pos-sg
```

2. **Launch EC2 Instances**
```bash
# Launch Ubuntu 22.04 instances
aws ec2 run-instances \
  --image-id ami-xxxxxxxxx \
  --instance-type t3.medium \
  --key-name your-key \
  --security-group-ids sg-xxxxxxxx
```

3. **Setup Application**
```bash
# SSH into instance
ssh -i your-key.pem ubuntu@ec2-xx-xx-xx-xx.compute.amazonaws.com

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Clone repository
git clone https://github.com/your-repo/restaurant-pos.git
cd restaurant-pos

# Setup environment
cp .env.example .env
nano .env

# Start with Docker Compose
docker-compose -f docker-compose.prod.yml up -d
```

4. **Configure Load Balancer**
```bash
aws elbv2 create-load-balancer \
  --name restaurant-pos-lb \
  --subnets subnet-xxx subnet-yyy \
  --security-groups sg-xxxxxxxx
```

---

### Option 2: DigitalOcean (Budget-Friendly)

#### Steps:

1. **Create Droplet**
- Choose Ubuntu 22.04
- Size: 2 vCPUs, 4GB RAM (minimum)
- Add block storage for database

2. **Initial Server Setup**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

3. **Deploy Application**
```bash
# Clone repo
git clone https://github.com/your-repo/restaurant-pos.git
cd restaurant-pos

# Setup environment
nano .env

# Deploy
docker-compose -f docker-compose.prod.yml up -d
```

4. **Setup Nginx & SSL**
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

---

### Option 3: Vercel (Frontend) + Render (Backend)

#### Frontend (Vercel):

1. **Connect GitHub Repository**
   - Go to vercel.com
   - Import your repository
   - Select `frontend` directory

2. **Configure Build Settings**
```
Build Command: npm run build
Output Directory: .next
Install Command: npm install
```

3. **Environment Variables**
```
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_SOCKET_URL=https://api.yourdomain.com
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=your-secret
```

#### Backend (Render):

1. **Create Web Service**
   - Choose Docker deployment
   - Connect GitHub repo
   - Select `backend` directory

2. **Add Database**
   - Create MongoDB instance
   - Create Redis instance
   - Copy connection strings

3. **Environment Variables**
```
NODE_ENV=production
MONGODB_URI=your-mongodb-uri
REDIS_URL=your-redis-uri
JWT_SECRET=your-jwt-secret
STRIPE_SECRET_KEY=your-stripe-key
```

---

## 🌐 Nginx Configuration

Create `nginx.conf`:

```nginx
upstream backend {
    server backend:5000;
}

upstream frontend {
    server frontend:3000;
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS Server
server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL Certificates
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;

    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;

    # API Proxy
    location /api {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Socket.IO
    location /socket.io {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Frontend
    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Static files
    location /_next/static {
        proxy_pass http://frontend;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # Uploads
    location /uploads {
        alias /app/uploads;
        add_header Cache-Control "public, max-age=2592000";
    }
}
```

---

## 🔐 SSL Certificate (Let's Encrypt)

### Using Certbot:

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal (added to crontab)
sudo certbot renew --dry-run
```

### Using Cloudflare:

1. Add your domain to Cloudflare
2. Update nameservers at your domain registrar
3. Enable "Full (strict)" SSL mode
4. Create origin certificates for your server

---

## 📊 Database Setup

### MongoDB Atlas (Recommended):

1. **Create Cluster**
   - Go to mongodb.com/cloud/atlas
   - Create account
   - Deploy free/paid cluster

2. **Network Access**
   - Add IP whitelist (or allow all: 0.0.0.0/0)

3. **Database User**
   - Create user with read/write permissions

4. **Connection String**
```
mongodb+srv://username:password@cluster.mongodb.net/restaurant_pos?retryWrites=true&w=majority
```

### Self-Hosted MongoDB:

```bash
# Install MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt update
sudo apt install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Secure MongoDB
mongo
use admin
db.createUser({
  user: "admin",
  pwd: "your-password",
  roles: ["root"]
})
```

### Create Indexes:

```bash
# Connect to MongoDB
mongosh "mongodb+srv://cluster.mongodb.net/restaurant_pos" --username admin

# Create indexes
db.users.createIndex({ "email": 1 }, { unique: true })
db.orders.createIndex({ "companyId": 1, "branchId": 1, "createdAt": -1 })
db.orders.createIndex({ "orderNumber": 1 }, { unique: true })
db.menuItems.createIndex({ "companyId": 1, "categoryId": 1, "isAvailable": 1 })
db.attendance.createIndex({ "userId": 1, "date": -1 })
db.activityLogs.createIndex({ "createdAt": 1 }, { expireAfterSeconds: 7776000 })
```

---

## 🔴 Redis Setup

### Redis Cloud (Recommended):

1. Go to redis.com/cloud
2. Create free account
3. Create database
4. Copy connection string

### Self-Hosted:

```bash
# Install Redis
sudo apt install redis-server

# Configure Redis
sudo nano /etc/redis/redis.conf

# Set password
requirepass your-redis-password

# Restart Redis
sudo systemctl restart redis-server
sudo systemctl enable redis-server
```

---

## 📧 Email Service

### Using SendGrid:

```env
EMAIL_SERVICE=sendgrid
SENDGRID_API_KEY=your-api-key
EMAIL_FROM=noreply@yourdomain.com
```

### Using AWS SES:

```env
EMAIL_SERVICE=ses
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
EMAIL_FROM=noreply@yourdomain.com
```

---

## 💳 Stripe Configuration

1. **Get API Keys**
   - Go to stripe.com
   - Get test/live API keys

2. **Setup Webhooks**
   - Endpoint: `https://api.yourdomain.com/api/v1/webhooks/stripe`
   - Events to listen:
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`

3. **Environment Variables**
```env
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRICE_ID_BASIC=price_xxx
STRIPE_PRICE_ID_PREMIUM=price_xxx
```

---

## 📱 PWA Setup

### Frontend Configuration:

Create `public/manifest.json`:

```json
{
  "name": "Restaurant POS",
  "short_name": "POS",
  "description": "Advanced Restaurant Management System",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#4F46E5",
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### Service Worker:

```javascript
// public/sw.js
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('pos-v1').then((cache) => {
      return cache.addAll([
        '/',
        '/offline',
        '/manifest.json'
      ]);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
```

---

## 📊 Monitoring & Logging

### PM2 (Process Management):

```bash
# Install PM2
npm install -g pm2

# Start backend
cd backend
pm2 start npm --name "pos-backend" -- start

# Start frontend
cd frontend
pm2 start npm --name "pos-frontend" -- start

# Save PM2 config
pm2 save
pm2 startup

# Monitor
pm2 monit
pm2 logs
```

### Log Management:

```bash
# Install Winston (already in package.json)

# Setup log rotation
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
```

---

## 🔄 CI/CD with GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: |
          cd backend && npm install
          cd ../frontend && npm install
      
      - name: Run tests
        run: |
          cd backend && npm test
          cd ../frontend && npm test

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /var/www/restaurant-pos
            git pull origin main
            docker-compose -f docker-compose.prod.yml down
            docker-compose -f docker-compose.prod.yml build
            docker-compose -f docker-compose.prod.yml up -d
```

---

## 🔒 Security Checklist

- [ ] Environment variables secured
- [ ] Database authentication enabled
- [ ] Redis password set
- [ ] SSL/TLS certificates installed
- [ ] CORS configured properly
- [ ] Rate limiting enabled
- [ ] Helmet middleware configured
- [ ] JWT secrets are strong and unique
- [ ] API keys rotated regularly
- [ ] Backup encryption enabled
- [ ] Firewall rules configured
- [ ] SSH key-based authentication
- [ ] Fail2ban installed
- [ ] Regular security updates scheduled

---

## 📦 Backup Strategy

### Automated Daily Backups:

Create `scripts/backup.sh`:

```bash
#!/bin/bash

# Variables
BACKUP_DIR="/var/backups/restaurant-pos"
DATE=$(date +%Y-%m-%d_%H-%M-%S)
MONGO_URI="your-mongodb-uri"
RETENTION_DAYS=30

# Create backup directory
mkdir -p $BACKUP_DIR

# MongoDB dump
mongodump --uri="$MONGO_URI" --out="$BACKUP_DIR/mongodb_$DATE"

# Compress
tar -czf "$BACKUP_DIR/mongodb_$DATE.tar.gz" "$BACKUP_DIR/mongodb_$DATE"
rm -rf "$BACKUP_DIR/mongodb_$DATE"

# Upload to S3 (optional)
aws s3 cp "$BACKUP_DIR/mongodb_$DATE.tar.gz" s3://your-bucket/backups/

# Delete old backups
find $BACKUP_DIR -type f -mtime +$RETENTION_DAYS -delete

echo "Backup completed: mongodb_$DATE.tar.gz"
```

### Cron Job:

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /path/to/backup.sh >> /var/log/backup.log 2>&1
```

---

## 🎯 Performance Optimization

### Backend:

1. **Enable Compression**
```typescript
// Already configured in main.ts
app.use(compression());
```

2. **Redis Caching**
```typescript
// Cache frequently accessed data
await cacheManager.set('menu:branch123', menuData, 300); // 5 min
```

3. **Database Query Optimization**
```typescript
// Use projections
const users = await User.find({}).select('firstName lastName email');

// Use lean() for read-only queries
const orders = await Order.find({}).lean();
```

### Frontend:

1. **Image Optimization**
```typescript
import Image from 'next/image';

<Image 
  src="/menu-item.jpg" 
  width={300} 
  height={200} 
  alt="Menu item"
  loading="lazy"
/>
```

2. **Code Splitting**
```typescript
const KitchenDisplay = dynamic(() => import('@/components/KitchenDisplay'), {
  ssr: false
});
```

3. **API Route Caching**
```typescript
export const revalidate = 60; // Revalidate every 60 seconds
```

---

## 📱 Mobile App Deployment (Future)

### iOS (App Store):

1. Build with Expo/React Native
2. Apple Developer account ($99/year)
3. Submit to App Store Connect
4. Review process (7-14 days)

### Android (Play Store):

1. Build APK/AAB
2. Google Play Console ($25 one-time)
3. Submit for review
4. Review process (1-3 days)

---

## 🆘 Troubleshooting

### Common Issues:

**1. Database Connection Failed**
```bash
# Check MongoDB status
sudo systemctl status mongod

# Check connection string
echo $MONGODB_URI
```

**2. Redis Connection Failed**
```bash
# Test Redis
redis-cli ping

# Check password
redis-cli -a your-password ping
```

**3. Port Already in Use**
```bash
# Find process
sudo lsof -i :5000

# Kill process
sudo kill -9 <PID>
```

**4. SSL Certificate Renewal Failed**
```bash
# Manually renew
sudo certbot renew --force-renewal
```

---

## 📞 Support & Maintenance

### Monitoring Checklist:
- Check server resources (CPU, RAM, Disk)
- Monitor application logs
- Check database performance
- Review security logs
- Test backup restoration
- Update dependencies monthly
- Security patch updates weekly

---

**Deployment Complete! 🎉**

Your Restaurant POS System is now live and ready for production use.


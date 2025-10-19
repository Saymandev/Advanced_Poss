# 🚀 Getting Started Guide

Welcome to the Advanced Restaurant POS & Management System! This guide will help you set up and run the project locally.

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 20+ ([Download](https://nodejs.org/))
- **pnpm** 8+ (Install: `npm install -g pnpm`)
- **MongoDB** 7+ ([Download](https://www.mongodb.com/try/download/community) or use [MongoDB Atlas](https://www.mongodb.com/cloud/atlas))
- **Redis** 7+ ([Download](https://redis.io/download) or use Docker)
- **Git** ([Download](https://git-scm.com/))
- **Docker** (Optional, for containerized setup)

## 🏗️ Project Structure

```
Advanced_Poss/
├── backend/          # NestJS API server
├── frontend/         # Next.js 15 application
├── docs/             # Documentation
├── docker/           # Docker configurations
├── .github/          # CI/CD workflows
├── docker-compose.yml
└── package.json      # Root workspace config
```

## ⚡ Quick Start (Development)

### Option 1: Using Docker (Recommended for beginners)

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd Advanced_Poss
   ```

2. **Start services with Docker Compose**
   ```bash
   docker-compose up -d
   ```

3. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - API Docs: http://localhost:5000/api/docs

4. **View logs**
   ```bash
   docker-compose logs -f
   ```

5. **Stop services**
   ```bash
   docker-compose down
   ```

### Option 2: Local Development Setup

#### Step 1: Install Dependencies

```bash
# Install root dependencies
pnpm install

# Or install individually
cd backend && pnpm install
cd ../frontend && pnpm install
```

#### Step 2: Start MongoDB

**Option A: Using Docker**
```bash
docker run -d -p 27017:27017 --name mongodb mongo:7
```

**Option B: Local Installation**
```bash
# Start MongoDB service
# macOS
brew services start mongodb-community

# Linux
sudo systemctl start mongod

# Windows
net start MongoDB
```

#### Step 3: Start Redis

**Option A: Using Docker**
```bash
docker run -d -p 6379:6379 --name redis redis:7-alpine
```

**Option B: Local Installation**
```bash
# macOS
brew services start redis

# Linux
sudo systemctl start redis

# Windows
redis-server
```

#### Step 4: Configure Environment Variables

**Backend:**
```bash
cd backend
cp .env.example .env
```

Edit `backend/.env` with your configuration:
```env
NODE_ENV=development
PORT=5000

MONGODB_URI=mongodb://localhost:27017/restaurant_pos
REDIS_HOST=localhost
REDIS_PORT=6379

JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-super-secret-refresh-key

# Email (for development, use mailtrap.io or similar)
EMAIL_HOST=smtp.mailtrap.io
EMAIL_PORT=2525
EMAIL_USER=your-mailtrap-user
EMAIL_PASSWORD=your-mailtrap-password

# Cloudinary (optional for development)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Stripe (use test keys)
STRIPE_SECRET_KEY=sk_test_your-test-key

# OpenAI (optional)
OPENAI_API_KEY=sk-your-api-key
```

**Frontend:**
```bash
cd frontend
cp .env.example .env.local
```

Edit `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret
```

#### Step 5: Start Development Servers

**Option A: Start all services at once (from root)**
```bash
pnpm dev
```

**Option B: Start individually**

Terminal 1 - Backend:
```bash
cd backend
pnpm dev
```

Terminal 2 - Frontend:
```bash
cd frontend
pnpm dev
```

#### Step 6: Access the Application

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5000
- **API Documentation:** http://localhost:5000/api/docs
- **Health Check:** http://localhost:5000/health

## 🗄️ Database Setup

### Create Indexes

Connect to MongoDB and run:

```bash
mongosh restaurant_pos

# Create indexes for performance
db.users.createIndex({ "email": 1 }, { unique: true })
db.orders.createIndex({ "companyId": 1, "branchId": 1, "createdAt": -1 })
db.orders.createIndex({ "orderNumber": 1 }, { unique: true })
db.menuItems.createIndex({ "companyId": 1, "categoryId": 1, "isAvailable": 1 })
```

### Seed Initial Data (Optional)

```bash
cd backend
pnpm run seed
```

This will create:
- Super Admin user
- Sample company and branch
- Sample menu categories and items
- Sample tables

**Default Super Admin Credentials:**
- Email: admin@restaurantpos.com
- Password: Admin@123456

## 🧪 Testing

### Backend Tests
```bash
cd backend
pnpm test              # Unit tests
pnpm test:watch        # Watch mode
pnpm test:cov          # With coverage
pnpm test:e2e          # E2E tests
```

### Frontend Tests
```bash
cd frontend
pnpm test              # Unit tests
pnpm test:e2e          # E2E tests with Cypress
```

## 🔧 Development Workflow

### Backend Development

1. **Create a new module:**
   ```bash
   cd backend
   nest g module modules/your-module
   nest g controller modules/your-module
   nest g service modules/your-module
   ```

2. **Create a new schema:**
   ```bash
   nest g class modules/your-module/schemas/your-model.schema
   ```

3. **Run linting:**
   ```bash
   pnpm lint
   pnpm lint:fix
   ```

4. **Build for production:**
   ```bash
   pnpm build
   ```

### Frontend Development

1. **Create a new page:**
   ```bash
   # Pages are automatically routed in Next.js App Router
   # Create: src/app/your-page/page.tsx
   ```

2. **Add Shadcn/UI components:**
   ```bash
   npx shadcn-ui@latest add button
   npx shadcn-ui@latest add card
   ```

3. **Run linting:**
   ```bash
   pnpm lint
   pnpm lint:fix
   ```

4. **Build for production:**
   ```bash
   pnpm build
   ```

## 📱 PWA Setup (Progressive Web App)

The frontend is configured as a PWA. To test PWA features:

1. Build the frontend for production
2. Serve with HTTPS (required for PWA)
3. Open in Chrome and look for "Install" option

## 🐛 Troubleshooting

### MongoDB Connection Issues
```bash
# Check if MongoDB is running
mongosh

# If connection fails, check the URI in .env
# Make sure MongoDB service is started
```

### Redis Connection Issues
```bash
# Test Redis connection
redis-cli ping
# Should return: PONG

# If fails, start Redis service
```

### Port Already in Use
```bash
# Find process using port 5000
lsof -i :5000

# Kill the process
kill -9 <PID>
```

### Module Not Found Errors
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
pnpm install

# Or clear entire workspace
pnpm clean
pnpm install
```

### Build Errors
```bash
# Clear build cache
cd backend && rm -rf dist
cd frontend && rm -rf .next

# Rebuild
pnpm build
```

## 🔐 Security Notes

### Development
- **Never commit `.env` files** (already in .gitignore)
- Use test API keys for development
- Keep JWT secrets strong and unique

### Production
- Use environment variables management (e.g., AWS Secrets Manager)
- Enable HTTPS/SSL
- Use strong JWT secrets (32+ characters)
- Enable rate limiting
- Set up monitoring and logging
- Regular security audits

## 📚 Next Steps

Now that you have the project running:

1. **Review the Documentation**
   - [Database Schemas](docs/SCHEMAS.md)
   - [API Documentation](docs/API.md)
   - [Implementation Guide](docs/IMPLEMENTATION_GUIDE.md)
   - [Deployment Guide](docs/DEPLOYMENT.md)

2. **Start Building**
   - Complete the Auth module
   - Implement POS interface
   - Add real-time features with Socket.IO

3. **Test Thoroughly**
   - Write unit tests for services
   - Add E2E tests for critical flows
   - Test on different devices

4. **Deploy**
   - Set up CI/CD pipeline
   - Deploy to staging environment
   - Deploy to production

## 🤝 Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make your changes
3. Run tests: `pnpm test`
4. Commit: `git commit -m "Add your feature"`
5. Push: `git push origin feature/your-feature`
6. Create a Pull Request

## 📞 Support

- **Documentation:** Check the `docs/` folder
- **API Docs:** http://localhost:5000/api/docs (when running)
- **Issues:** Create an issue on GitHub

## 🎯 Common Tasks

### Add a new API endpoint
1. Create DTO in `backend/src/modules/your-module/dto/`
2. Add method to service
3. Add route to controller
4. Test with Swagger docs

### Add a new frontend page
1. Create `frontend/src/app/your-page/page.tsx`
2. Add to navigation if needed
3. Test routing

### Connect to WebSocket
```typescript
import { socketClient } from '@/lib/socket';

// In your component
useEffect(() => {
  const socket = socketClient.connect(branchId);
  
  socket.on('order:new', (data) => {
    console.log('New order:', data);
  });
  
  return () => {
    socketClient.disconnect();
  };
}, [branchId]);
```

---

## ✅ Quick Checklist

- [ ] Node.js 20+ installed
- [ ] pnpm installed
- [ ] MongoDB running
- [ ] Redis running
- [ ] Environment variables configured
- [ ] Dependencies installed
- [ ] Backend running on port 5000
- [ ] Frontend running on port 3000
- [ ] Can access API docs at /api/docs
- [ ] Database indexes created

---

**You're all set! Happy coding! 🚀**

For detailed implementation guidance, refer to [IMPLEMENTATION_GUIDE.md](docs/IMPLEMENTATION_GUIDE.md)


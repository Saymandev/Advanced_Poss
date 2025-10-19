# 🛠️ Implementation Guide

This guide provides step-by-step instructions to complete the Restaurant POS system implementation.

## ✅ Completed So Far

1. **Project Structure**
   - ✅ Root monorepo setup
   - ✅ Docker Compose configuration
   - ✅ Database schema documentation
   - ✅ API documentation
   - ✅ Deployment guide

2. **Backend Foundation**
   - ✅ NestJS project structure
   - ✅ Configuration management
   - ✅ Common utilities (guards, filters, interceptors, decorators)
   - ✅ Winston logger
   - ✅ User schema and module
   - ✅ Password utilities
   - ✅ Generator utilities

---

## 📝 Next Steps

### Phase 1: Complete Core Backend Modules (Priority: High)

#### 1.1 Authentication Module
**Location:** `backend/src/modules/auth/`

**Files to Create:**

```typescript
// auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { UsersModule } from '../users/users.module';
import { CompaniesModule } from '../companies/companies.module';
import { BranchesModule } from '../branches/branches.module';

@Module({
  imports: [
    UsersModule,
    CompaniesModule,
    BranchesModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('jwt.secret'),
        signOptions: {
          expiresIn: configService.get('jwt.expiresIn'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, LocalStrategy],
  exports: [AuthService],
})
export class AuthModule {}
```

```typescript
// strategies/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('jwt.secret'),
    });
  }

  async validate(payload: any) {
    const user = await this.usersService.findOne(payload.sub);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      companyId: payload.companyId,
      branchId: payload.branchId,
    };
  }
}
```

**Key Features to Implement:**
- Login with email/password
- Login with PIN (for POS screens)
- Multi-step registration (Company → Branch → Owner)
- JWT token generation and refresh
- Email verification
- Password reset flow
- 2FA with OTP

#### 1.2 Companies Module
**Location:** `backend/src/modules/companies/`

**Schema:** (Based on docs/SCHEMAS.md)
- Company information
- Subscription details
- Settings and features
- Owner reference

**Key Endpoints:**
- `POST /companies` - Create company (registration step 1)
- `GET /companies/:id` - Get company details
- `PATCH /companies/:id` - Update company
- `GET /companies/:id/stats` - Company statistics

#### 1.3 Branches Module
**Location:** `backend/src/modules/branches/`

**Schema:** (Based on docs/SCHEMAS.md)
- Branch information
- Address and coordinates
- Opening hours
- Manager assignment
- Settings

**Key Endpoints:**
- `POST /branches` - Create branch (registration step 2)
- `GET /branches` - List all branches
- `GET /branches/:id` - Get branch details
- `PATCH /branches/:id` - Update branch
- `GET /branches/:id/stats` - Branch statistics

#### 1.4 Menu Management Modules

**Categories Module** (`backend/src/modules/categories/`)
- CRUD operations for menu categories
- Image upload support
- Ordering/sorting

**MenuItems Module** (`backend/src/modules/menu-items/`)
- Full CRUD with variants and addons
- Image upload (multiple)
- Ingredient tracking
- Availability management
- Popular items tracking

#### 1.5 Orders Module
**Location:** `backend/src/modules/orders/`

**Critical Features:**
- Create order with items
- Calculate subtotals, tax, discounts
- Payment processing
- Split billing support
- Order status updates
- Kitchen integration
- Receipt generation (PDF)

**Socket.IO Integration:**
```typescript
// Emit events for real-time updates
this.websocketsGateway.emitToRoom(branchId, 'order:new', order);
this.websocketsGateway.emitToRoom(branchId, 'order:updated', order);
```

#### 1.6 Tables Module
**Location:** `backend/src/modules/tables/`

**Features:**
- Table management (Available, Occupied, Reserved, Cleaning)
- QR code generation
- Reservation system
- Real-time status updates

---

### Phase 2: Frontend Setup (Priority: High)

#### 2.1 Next.js 15 Project Structure

```bash
frontend/
├── src/
│   ├── app/                      # App Router
│   │   ├── (auth)/              # Auth layout group
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   └── forgot-password/
│   │   ├── (dashboard)/         # Dashboard layout group
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx         # Dashboard home
│   │   │   ├── pos/            # POS system
│   │   │   ├── menu/           # Menu management
│   │   │   ├── orders/         # Orders
│   │   │   ├── kitchen/        # Kitchen display
│   │   │   ├── customers/      # CRM
│   │   │   ├── inventory/      # Inventory
│   │   │   ├── staff/          # Staff management
│   │   │   ├── reports/        # Reports
│   │   │   └── settings/       # Settings
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/              # Reusable components
│   │   ├── ui/                 # Shadcn/UI components
│   │   ├── layout/             # Layout components
│   │   ├── forms/              # Form components
│   │   └── charts/             # Chart components
│   ├── lib/                     # Utilities
│   │   ├── api/                # API client
│   │   ├── utils.ts            # Helper functions
│   │   └── socket.ts           # Socket.IO client
│   ├── hooks/                   # Custom React hooks
│   ├── store/                   # Zustand stores
│   ├── types/                   # TypeScript types
│   └── styles/                  # Global styles
├── public/
│   ├── icons/
│   ├── manifest.json
│   └── sw.js
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.js
```

#### 2.2 Frontend Setup Commands

```bash
cd frontend
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir

# Install dependencies
npm install @tanstack/react-query zustand
npm install socket.io-client
npm install next-auth
npm install recharts
npm install framer-motion
npm install date-fns
npm install react-hook-form @hookform/resolvers zod
npm install lucide-react
npm install next-themes

# Install Shadcn/UI
npx shadcn-ui@latest init
npx shadcn-ui@latest add button input card table dialog dropdown-menu
npx shadcn-ui@latest add form select checkbox radio-group
npx shadcn-ui@latest add toast alert sheet tabs
```

#### 2.3 API Client Setup

```typescript
// lib/api/client.ts
import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const response = await axios.post(
          `${apiClient.defaults.baseURL}/auth/refresh`,
          { refreshToken }
        );

        const { accessToken } = response.data.data;
        localStorage.setItem('accessToken', accessToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Redirect to login
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
```

#### 2.4 Zustand Store Example

```typescript
// store/authStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  companyId?: string;
  branchId?: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  setAuth: (user: User, tokens: { accessToken: string; refreshToken: string }) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      setAuth: (user, tokens) => set({ user, ...tokens }),
      logout: () => set({ user: null, accessToken: null, refreshToken: null }),
    }),
    {
      name: 'auth-storage',
    }
  )
);
```

#### 2.5 Socket.IO Client Setup

```typescript
// lib/socket.ts
import { io, Socket } from 'socket.io-client';

class SocketClient {
  private socket: Socket | null = null;

  connect(branchId: string) {
    if (this.socket?.connected) return;

    this.socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000', {
      auth: {
        token: localStorage.getItem('accessToken'),
      },
    });

    this.socket.on('connect', () => {
      console.log('Socket connected');
      this.socket?.emit('join:branch', { branchId });
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    return this.socket;
  }

  on(event: string, callback: (...args: any[]) => void) {
    this.socket?.on(event, callback);
  }

  emit(event: string, data: any) {
    this.socket?.emit(event, data);
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }
}

export const socketClient = new SocketClient();
```

---

### Phase 3: POS Interface (Priority: Critical)

#### 3.1 POS Layout
**Path:** `app/(dashboard)/pos/page.tsx`

**Key Features:**
- Left: Menu items grid with categories
- Right: Current order cart
- Bottom: Payment and actions
- Real-time table status
- Quick shortcuts
- Offline support (PWA)

**UI Components Needed:**
- Category tabs/pills
- Menu item cards with images
- Cart item list with quantity controls
- Payment modal with split billing
- Table selection modal
- Customer selection/add modal

#### 3.2 Kitchen Display
**Path:** `app/(dashboard)/kitchen/page.tsx`

**Features:**
- Real-time incoming orders
- Status update buttons (Pending → Cooking → Ready)
- Order priority highlighting
- Preparation time tracking
- Auto-refresh every 2 seconds
- Sound notifications

---

### Phase 4: Inventory & Suppliers (Priority: Medium)

#### 4.1 Ingredients Module
- Stock tracking
- Low stock alerts
- Expiry date management
- Batch tracking

#### 4.2 Suppliers Module
- Supplier management
- Purchase orders
- Invoice generation
- Payment tracking

---

### Phase 5: CRM & Loyalty (Priority: Medium)

#### 5.1 Customers Module
- Customer profiles
- Order history
- Loyalty points
- Tier management

#### 5.2 Campaigns Module
- Email/SMS campaigns
- Segmentation
- Scheduling
- Analytics

---

### Phase 6: Staff Management (Priority: Medium)

#### 6.1 Attendance Module
- Check-in/out with GPS
- Working hours calculation
- Shift management

#### 6.2 Leaves Module
- Leave application
- Approval workflow
- Calendar view

#### 6.3 Salaries Module
- Salary calculation
- Commission tracking
- Payment records

---

### Phase 7: Reports & Analytics (Priority: High)

#### 7.1 Dashboard
- Real-time sales charts (Recharts)
- Key metrics cards
- Top selling items
- Revenue trends

#### 7.2 Reports Module
- Sales reports
- Profit/Loss reports
- Inventory reports
- Staff performance reports
- Export to PDF/CSV

---

### Phase 8: Subscriptions & Billing (Priority: Medium)

#### 8.1 Stripe Integration
- Subscription plans
- Payment processing
- Webhook handling
- Invoice generation

---

### Phase 9: AI Features (Priority: Low)

#### 9.1 OpenAI Integration
- Sales predictions
- Menu optimization suggestions
- Customer behavior analysis
- Smart inventory recommendations

```typescript
// ai/ai.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class AiService {
  private openai: OpenAI;

  constructor(private configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get('openai.apiKey'),
    });
  }

  async generateInsights(salesData: any[]) {
    const prompt = `Analyze this restaurant sales data and provide insights:\n${JSON.stringify(salesData)}`;

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [{ role: 'user', content: prompt }],
    });

    return completion.choices[0].message.content;
  }

  async predictSales(historicalData: any[]) {
    // Implement prediction logic
  }

  async optimizeMenu(menuData: any[], salesData: any[]) {
    // Implement menu optimization suggestions
  }
}
```

---

### Phase 10: WebSocket Implementation (Priority: High)

#### 10.1 WebSockets Gateway

```typescript
// websockets/websockets.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: true })
export class WebsocketsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join:branch')
  handleJoinBranch(client: Socket, payload: { branchId: string }) {
    client.join(`branch:${payload.branchId}`);
    return { event: 'joined', data: payload };
  }

  @SubscribeMessage('join:kitchen')
  handleJoinKitchen(client: Socket, payload: { branchId: string }) {
    client.join(`kitchen:${payload.branchId}`);
    return { event: 'joined', data: payload };
  }

  emitToRoom(room: string, event: string, data: any) {
    this.server.to(room).emit(event, data);
  }

  emitToAll(event: string, data: any) {
    this.server.emit(event, data);
  }
}
```

---

### Phase 11: Email Service (Priority: Medium)

```typescript
// mail/mail.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransporter({
      host: this.configService.get('email.host'),
      port: this.configService.get('email.port'),
      secure: false,
      auth: {
        user: this.configService.get('email.user'),
        pass: this.configService.get('email.password'),
      },
    });
  }

  async sendVerificationEmail(to: string, token: string) {
    const verificationUrl = `${this.configService.get('frontend.url')}/verify-email/${token}`;

    await this.transporter.sendMail({
      from: this.configService.get('email.from'),
      to,
      subject: 'Verify Your Email',
      html: `
        <h1>Email Verification</h1>
        <p>Click the link below to verify your email:</p>
        <a href="${verificationUrl}">Verify Email</a>
      `,
    });
  }

  async sendPasswordReset(to: string, token: string) {
    const resetUrl = `${this.configService.get('frontend.url')}/reset-password/${token}`;

    await this.transporter.sendMail({
      from: this.configService.get('email.from'),
      to,
      subject: 'Reset Your Password',
      html: `
        <h1>Password Reset</h1>
        <p>Click the link below to reset your password:</p>
        <a href="${resetUrl}">Reset Password</a>
      `,
    });
  }

  async sendReceipt(to: string, receiptPdf: Buffer) {
    await this.transporter.sendMail({
      from: this.configService.get('email.from'),
      to,
      subject: 'Your Receipt',
      html: '<h1>Thank you for your order!</h1>',
      attachments: [
        {
          filename: 'receipt.pdf',
          content: receiptPdf,
        },
      ],
    });
  }
}
```

---

### Phase 12: Testing (Priority: Medium)

#### 12.1 Backend Unit Tests
```bash
cd backend
npm run test
```

#### 12.2 Frontend Tests
```bash
cd frontend
npm run test
```

#### 12.3 E2E Tests
Use Cypress or Playwright for end-to-end testing.

---

### Phase 13: Deployment (Priority: High)

#### 13.1 Environment Setup
- Production MongoDB Atlas
- Redis Cloud
- Cloudinary
- Stripe live keys
- Email service

#### 13.2 Docker Build
```bash
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d
```

#### 13.3 CI/CD
- Set up GitHub Actions
- Automated testing
- Automated deployment

---

## 📊 Progress Tracking

Use this checklist to track progress:

### Backend Modules
- [ ] Auth Module (JWT, Login, Register, 2FA)
- [ ] Companies Module
- [ ] Branches Module
- [ ] Categories Module
- [ ] MenuItems Module
- [ ] Tables Module
- [ ] Orders Module
- [ ] Customers Module
- [ ] Ingredients Module
- [ ] Suppliers Module
- [ ] PurchaseOrders Module
- [ ] Expenses Module
- [ ] Attendance Module
- [ ] Leaves Module
- [ ] Salaries Module
- [ ] Subscriptions Module
- [ ] Reviews Module
- [ ] Campaigns Module
- [ ] ActivityLogs Module
- [ ] Notifications Module
- [ ] Backups Module
- [ ] Reports Module
- [ ] Kitchen Module
- [ ] AI Module
- [ ] WebSockets Module
- [ ] Upload Module
- [ ] Mail Module

### Frontend Pages
- [ ] Login Page
- [ ] Multi-step Registration
- [ ] Dashboard Home
- [ ] POS System
- [ ] Menu Management
- [ ] Orders List
- [ ] Kitchen Display
- [ ] Customer Management
- [ ] Inventory Management
- [ ] Staff Management
- [ ] Reports & Analytics
- [ ] Settings

### Integration
- [ ] Socket.IO real-time updates
- [ ] Payment processing (Stripe)
- [ ] Email service
- [ ] Image upload (Cloudinary)
- [ ] PDF generation (receipts, reports)
- [ ] CSV export/import

### Testing & Deployment
- [ ] Unit tests
- [ ] Integration tests
- [ ] E2E tests
- [ ] Docker setup
- [ ] CI/CD pipeline
- [ ] Production deployment

---

## 🎯 Quick Start Commands

### Development
```bash
# Install dependencies
pnpm install

# Start MongoDB and Redis
docker-compose up mongodb redis -d

# Start backend
cd backend
pnpm dev

# Start frontend (new terminal)
cd frontend
pnpm dev
```

### Production
```bash
# Build all
pnpm build

# Start with Docker
docker-compose -f docker-compose.prod.yml up -d
```

---

## 📚 Additional Resources

- **NestJS Docs:** https://docs.nestjs.com
- **Next.js Docs:** https://nextjs.org/docs
- **MongoDB Docs:** https://docs.mongodb.com
- **Socket.IO Docs:** https://socket.io/docs
- **Stripe Docs:** https://stripe.com/docs
- **Shadcn/UI:** https://ui.shadcn.com

---

## 🆘 Need Help?

If you encounter issues:
1. Check the error logs in `backend/logs/`
2. Verify environment variables
3. Ensure MongoDB and Redis are running
4. Check API documentation at `http://localhost:5000/api/docs`
5. Review database schemas in `docs/SCHEMAS.md`

---

**Next Immediate Steps:**
1. Complete the Auth module with all authentication flows
2. Create Company and Branch modules for multi-step registration
3. Set up the Next.js frontend with Shadcn/UI
4. Implement the POS interface
5. Add WebSocket integration for real-time updates

This is a comprehensive system - take it one module at a time! 🚀


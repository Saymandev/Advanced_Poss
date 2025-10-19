# Frontend Setup Guide

## Overview
The frontend is built with **Next.js 15 (App Router)**, TypeScript, Tailwind CSS, and Shadcn/UI components. It features a modern, responsive dashboard with real-time updates, dark/light theme support, and AI-powered insights.

## Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Shadcn/UI + Radix UI
- **State Management**: Zustand
- **Data Fetching**: TanStack Query (React Query)
- **Charts**: Recharts
- **Icons**: Lucide React
- **Theme**: next-themes
- **Real-time**: Socket.IO Client
- **HTTP Client**: Axios

## Installation

```bash
cd frontend
npm install
```

## Environment Setup

Create a `.env.local` file in the `frontend` directory:

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000

# App Configuration
NEXT_PUBLIC_APP_NAME=Restaurant POS
NEXT_PUBLIC_APP_URL=http://localhost:3000

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here
```

## Running the Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

## Project Structure

```
frontend/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── (dashboard)/        # Dashboard layout group
│   │   │   ├── dashboard/      # Main dashboard
│   │   │   ├── orders/         # Orders management
│   │   │   ├── kitchen/        # Kitchen display
│   │   │   ├── menu/           # Menu management
│   │   │   └── ...
│   │   ├── layout.tsx          # Root layout
│   │   └── page.tsx            # Landing page
│   ├── components/             # React components
│   │   ├── dashboard/          # Dashboard-specific components
│   │   │   ├── nav.tsx         # Navigation sidebar
│   │   │   ├── header.tsx      # Header with theme toggle
│   │   │   ├── stats.tsx       # Stats cards
│   │   │   ├── sales-chart.tsx # Sales chart
│   │   │   ├── ai-insights.tsx # AI insights card
│   │   │   └── ...
│   │   ├── ui/                 # Shadcn/UI components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── badge.tsx
│   │   │   └── ...
│   │   └── providers.tsx       # Context providers
│   ├── lib/                    # Utilities
│   │   ├── api.ts              # API client
│   │   └── utils.ts            # Helper functions
│   ├── types/                  # TypeScript types
│   │   └── dashboard.ts        # Dashboard types
│   └── styles/                 # Global styles
│       └── globals.css         # Tailwind + custom CSS
├── public/                     # Static assets
├── components.json             # Shadcn/UI config
├── next.config.js              # Next.js config
├── tailwind.config.ts          # Tailwind config
├── tsconfig.json               # TypeScript config
└── package.json                # Dependencies
```

## Key Features

### 1. Dashboard & Analytics
- **Real-time Stats**: Revenue, orders, customers with growth trends
- **Sales Charts**: Line charts showing revenue and order trends
- **Category Revenue**: Pie chart for revenue distribution
- **Top Selling Items**: Best performing menu items
- **Recent Orders**: Live order feed
- **Low Stock Alerts**: Inventory warnings
- **AI Insights**: Business intelligence and recommendations

### 2. Theme Support
- Light and dark mode
- System preference detection
- Persistent theme selection

### 3. API Integration
- Centralized API client (`src/lib/api.ts`)
- Automatic token management
- Request/response interceptors
- Error handling and retries

### 4. Real-time Updates
- Socket.IO integration ready
- React Query for data synchronization
- Automatic refetching at intervals

## API Client Usage

```typescript
import { api } from '@/lib/api'

// Get dashboard stats
const stats = await api.getDashboardStats()

// Get sales analytics
const sales = await api.getSalesAnalytics('week')

// Create an order
const order = await api.createOrder(orderData)
```

## React Query Usage

```typescript
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

function DashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.getDashboardStats(),
    refetchInterval: 30000, // Refresh every 30 seconds
  })

  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorMessage />

  return <DashboardStats data={data} />
}
```

## Adding New Shadcn/UI Components

```bash
npx shadcn-ui@latest add [component-name]
```

Example:
```bash
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add table
npx shadcn-ui@latest add form
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix linting errors
- `npm run type-check` - Run TypeScript compiler check
- `npm test` - Run Jest tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:e2e` - Open Cypress for E2E testing

## Dashboard Routes

- `/` - Landing page
- `/dashboard` - Main dashboard with analytics
- `/dashboard/orders` - Order management
- `/dashboard/kitchen` - Kitchen display system
- `/dashboard/menu` - Menu management
- `/dashboard/tables` - Table management
- `/dashboard/customers` - Customer management
- `/dashboard/inventory` - Inventory tracking
- `/dashboard/staff` - Staff management
- `/dashboard/reports` - Reports & analytics
- `/dashboard/ai-insights` - AI-powered insights
- `/dashboard/billing` - Subscription & billing
- `/dashboard/settings` - System settings

## Responsive Design

The dashboard is fully responsive:
- **Mobile**: Stacked layout, collapsible nav
- **Tablet**: 2-column grid for cards
- **Desktop**: Full multi-column layout with sidebar

## Performance Optimization

- **Code Splitting**: Automatic with Next.js App Router
- **Image Optimization**: Next.js Image component
- **Data Fetching**: React Query caching and deduplication
- **Bundle Analysis**: Check with `npm run build`

## Deployment

### Vercel (Recommended)
```bash
vercel
```

### Docker
```bash
docker build -t restaurant-pos-frontend .
docker run -p 3000:3000 restaurant-pos-frontend
```

### Manual Build
```bash
npm run build
npm start
```

## Troubleshooting

### Port Already in Use
```bash
# Kill process on port 3000
npx kill-port 3000
# Or use a different port
PORT=3001 npm run dev
```

### Type Errors
```bash
# Clear .next cache
rm -rf .next
npm run dev
```

### Styling Issues
```bash
# Rebuild Tailwind
npm run build
```

## Next Steps

1. **Authentication Pages**: Create login, register, and onboarding flows
2. **Order Management**: Build POS interface with table selection
3. **Kitchen Display**: Real-time order tracking for kitchen staff
4. **Menu Management**: CRUD operations for menu items
5. **Real-time Features**: Implement Socket.IO for live updates
6. **Mobile App**: Consider React Native for mobile POS

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Shadcn/UI](https://ui.shadcn.com)
- [TanStack Query](https://tanstack.com/query/latest)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Recharts](https://recharts.org/)


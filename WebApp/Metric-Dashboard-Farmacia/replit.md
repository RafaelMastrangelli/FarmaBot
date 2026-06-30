# FarmaBot - Dashboard de Metricas

## Overview
Dashboard web para monitoramento em tempo real do bot de farmacia WhatsApp (rodando em n8n). Exibe metricas de vendas, atendimentos, desistencias, conversoes e atividade do bot.

## Architecture
- **Frontend**: React + TypeScript + Vite + Tailwind CSS + Shadcn UI + Recharts
- **Backend**: Express.js with session-based auth
- **Database**: PostgreSQL (Drizzle ORM)
- **Real-time**: Server-Sent Events (SSE) for live activity feed

## Key Features
1. **Login page** - Authentication with DASHBOARD_USER/DASHBOARD_PASSWORD env vars
2. **Overview** - KPI cards, daily evolution charts, revenue chart, conversion funnel, payment distribution, product ranking
3. **Orders** - Paginated order table with search, filters, CSV export, order detail modal
4. **Activity** - Real-time SSE event feed with type filters (messages, orders, transfers)
5. **Abandonment** - Heatmap of dropout states, abandoned session analysis, KPIs
6. **Customers** - Unique customer table with interaction stats

## API Endpoints
- `POST /api/metrics` - Receives metrics from n8n (requires `x-api-key` header)
- `POST /api/auth/login` - Dashboard login
- `GET /api/stats` - Consolidated KPIs
- `GET /api/stats/daily` - Daily statistics
- `GET /api/events` - Event list with filters
- `GET /api/events/live` - SSE stream for real-time events
- `GET /api/funnel` - Conversion funnel data
- `GET /api/products/ranking` - Top products by sales
- `GET /api/customers` - Unique customers with stats
- `GET /api/orders` - Paginated orders with filters

## Environment Variables
- `API_KEY` - n8n authentication key for POST /api/metrics
- `DASHBOARD_USER` - Dashboard login username
- `DASHBOARD_PASSWORD` - Dashboard login password
- `SESSION_SECRET` - Express session secret
- `DATABASE_URL` - PostgreSQL connection string (auto-configured)

## Database Tables
- `users` - Dashboard users (for future multi-user support)
- `metrics_snapshots` - Snapshot of metrics sent by n8n
- `events` - All bot events (messages, orders, transfers)
- `daily_stats` - Daily aggregated statistics
- `orders` - Individual orders extracted from events

## File Structure
- `shared/schema.ts` - Database schema + Zod validation schemas
- `server/db.ts` - Database connection
- `server/storage.ts` - Data access layer (IStorage interface)
- `server/routes.ts` - API routes with auth middleware
- `server/seed.ts` - Sample data seeder
- `client/src/App.tsx` - Main app with auth gate + sidebar layout
- `client/src/lib/auth.tsx` - Auth context provider
- `client/src/components/app-sidebar.tsx` - Navigation sidebar
- `client/src/components/kpi-card.tsx` - Reusable KPI card component
- `client/src/pages/login.tsx` - Login page
- `client/src/pages/overview.tsx` - Dashboard overview with charts
- `client/src/pages/orders.tsx` - Orders management
- `client/src/pages/activity.tsx` - Real-time activity feed (SSE)
- `client/src/pages/abandonment.tsx` - Abandonment analysis
- `client/src/pages/customers.tsx` - Customer list

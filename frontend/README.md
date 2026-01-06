# WhatsApp API SaaS Platform - Frontend

Modern, production-ready dashboard for WhatsApp API platform built with Next.js 14, TypeScript, and Tailwind CSS.

## 🚀 Features

- ✅ **Landing Page** - Modern marketing page with pricing
- ✅ **Authentication** - Login, Register, Forgot Password
- ✅ **User Dashboard** - Manage WhatsApp sessions, send messages, view analytics
- ✅ **Admin Panel** - Platform management and user administration
- ✅ **API Integration** - Full integration with backend REST API
- ✅ **Modern UI/UX** - Clean design inspired by Stripe, Vercel, Linear
- ✅ **Responsive** - Mobile-first design
- ✅ **Real-time Updates** - Live session status and notifications

## 📦 Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **State Management:** Zustand
- **HTTP Client:** Axios
- **Icons:** Lucide React
- **Charts:** Recharts
- **Notifications:** React Hot Toast

## 🛠️ Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## 🌐 Environment Variables

Create `.env.local` file:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

## 📱 Pages

### Public Pages
- `/` - Landing page
- `/login` - User login
- `/register` - User registration
- `/forgot-password` - Password reset

### User Dashboard
- `/dashboard` - Overview & analytics
- `/dashboard/sessions` - WhatsApp session management
- `/dashboard/messages` - Send messages
- `/dashboard/analytics` - Detailed analytics
- `/dashboard/api-keys` - API key management
- `/dashboard/docs` - Integration documentation
- `/dashboard/settings` - Account settings
- `/dashboard/billing` - Subscription & billing

### Admin Panel
- `/admin` - Admin dashboard
- `/admin/users` - User management
- `/admin/analytics` - Platform analytics
- `/admin/system` - System monitoring

## 🎨 UI Components

- **DashboardNav** - Top navigation bar
- **Sidebar** - Dashboard sidebar navigation
- **StatsCard** - Statistics card component
- **Modal** - Reusable modal component
- **Table** - Data table component

## 🔐 Authentication Flow

1. User registers/logs in
2. JWT token stored in localStorage
3. Automatic token refresh on expiry
4. Protected routes redirect to login

## 📊 Dashboard Features

### User Dashboard
- Real-time session status
- Message analytics
- API usage statistics
- Quick actions

### Admin Dashboard
- User management
- Platform metrics
- System health
- Revenue analytics

## 🚀 Deployment

### Vercel (Recommended)

```bash
vercel deploy
```

### Docker

```bash
docker build -t whatsapp-api-frontend .
docker run -p 3001:3001 whatsapp-api-frontend
```

## 📝 API Integration

Backend API should be running on `http://localhost:3000`

All API calls go through `/lib/api.ts` with automatic auth token injection.

## 🎯 Next Steps

1. Install dependencies: `npm install`
2. Update `.env.local` with backend API URL
3. Run dev server: `npm run dev`
4. Open browser: `http://localhost:3001`

## 📄 License

MIT

## 👥 Support

For support, email support@yourcompany.com

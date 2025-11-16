# stageinseconds.com

**AI-powered real estate photo enhancement platform**

Transform real estate photos in seconds using AI to create stunning, professionally staged images.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Development](#development)
- [Deployment](#deployment)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

StageInSeconds is a full-stack application that allows real estate professionals to enhance property photos using AI. The platform includes:

- **Web Application**: React-based SPA with server-side rendering
- **Mobile Application**: React Native app for iOS and Android
- **AI Processing**: Google Gemini-powered image enhancement
- **Payment Integration**: Stripe-based credit system

---

## Features

### Core Functionality
- User authentication (email/password)
- Credit-based billing system via Stripe
- AI-powered photo enhancement (furniture staging, lighting, etc.)
- Batch photo processing (up to 30 images)
- Job management and status tracking
- Preview before purchasing credits
- Group organization for photos
- Download processed images as ZIP

### Security Features
- Argon2 password hashing
- JWT session management
- SSRF protection with URL validation
- Input validation and sanitization
- Secure file upload with size limits (15MB)
- CSRF protection

---

## Tech Stack

### Web Application (`/apps/web`)

**Frontend**:
- React 18
- React Router 7 (with SSR)
- Vite (build tool)
- Tailwind CSS
- TypeScript

**Backend**:
- Hono (web framework)
- @auth/core (authentication)
- Neon Serverless PostgreSQL
- Stripe (payments)
- Google Gemini API (AI processing)

**Key Dependencies**:
```json
{
  "react": "^18.3.1",
  "react-router": "^7.1.1",
  "hono": "^4.6.15",
  "@auth/core": "^0.37.4",
  "@neondatabase/serverless": "^0.10.5",
  "stripe": "^17.5.0"
}
```

### Mobile Application (`/apps/mobile`)

- React Native
- Expo Router
- Expo Application Services (EAS)

---

## Getting Started

### Prerequisites

- Node.js 18+ (recommended: 20+)
- npm or yarn
- PostgreSQL database (Neon recommended)
- Stripe account
- Google Cloud account (for Gemini API)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/stageinseconds.com.git
   cd stageinseconds.com
   ```

2. **Install dependencies**:
   ```bash
   # Install web app dependencies
   cd apps/web
   npm install

   # Install mobile app dependencies (if needed)
   cd ../mobile
   npm install
   ```

3. **Set up environment variables**:

   Create a `.env` file in `apps/web/` based on `.env.example`:
   ```bash
   cp .env.example .env
   ```

   Fill in the required values (see [Environment Variables](#environment-variables) section).

4. **Set up the database**:

   Run database migrations using Drizzle ORM:
   ```bash
   cd apps/web
   npm run db:generate  # Generate migration files
   npm run db:migrate   # Run migrations
   ```

   See [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) for complete schema documentation.

5. **Start the development server**:
   ```bash
   cd apps/web
   npm run dev
   ```

   The app will be available at `http://localhost:4000`

---

## Environment Variables

Create a `.env` file in `apps/web/` with the following variables:

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host/db` |
| `AUTH_SECRET` | JWT signing secret (32+ random chars) | `openssl rand -hex 32` |
| `GOOGLE_API_KEY` | Google Gemini API key | `AIza...` |
| `STRIPE_SECRET_KEY` | Stripe API secret key | `sk_test_...` or `sk_live_...` |
| `STRIPE_PUBLIC_KEY` | Stripe publishable key | `pk_test_...` or `pk_live_...` |
| `NEXT_PUBLIC_CREATE_HOST` | Integration host | `create.xyz` |
| `NEXT_PUBLIC_PROJECT_GROUP_ID` | Project group ID | `proj_...` |

### Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `CORS_ORIGINS` | Comma-separated allowed origins | Request origin |
| `NEXT_PUBLIC_APP_URL` | Base URL for the app | Request origin |
| `NEXT_PUBLIC_CREATE_BASE_URL` | Integration base URL | `https://create.xyz` |
| `NODE_ENV` | Environment (development/production) | `development` |
| `PORT` | Server port | `4000` |

See [.env.example](./.env.example) for a complete template.

---

## Project Structure

```
stageinseconds.com/
├── apps/
│   ├── web/                    # Web application
│   │   ├── src/
│   │   │   ├── app/           # React Router routes
│   │   │   │   ├── api/       # API endpoints (18 routes)
│   │   │   │   └── ...        # Page components
│   │   │   ├── utils/         # Utility functions and hooks
│   │   │   └── auth.js        # Authentication configuration
│   │   ├── __create/          # Server setup and middleware
│   │   ├── public/            # Static assets
│   │   ├── vite.config.ts     # Vite configuration
│   │   └── package.json
│   │
│   └── mobile/                 # React Native mobile app
│       ├── app/               # Expo Router screens
│       ├── eas.json           # Expo build configuration
│       └── package.json
│
├── PRODUCTION_READINESS.md    # Production checklist
├── DATABASE_SCHEMA.md         # Database documentation
├── API_DOCUMENTATION.md       # API endpoint documentation
├── DEPLOYMENT.md              # Deployment guide
└── README.md                  # This file
```

---

## Development

### Running the Web App

```bash
cd apps/web
npm run dev
```

Available at `http://localhost:4000`

### Running the Mobile App

```bash
cd apps/mobile
npm start
```

Scan the QR code with Expo Go app.

### Building for Production

**Web**:
```bash
cd apps/web
npm run build
```

**Mobile** (requires EAS):
```bash
cd apps/mobile
eas build --platform all
```

---

## API Endpoints

The web application exposes 18 API endpoints:

### Authentication
- `POST /api/auth/*` - Authentication endpoints (@auth/core)

### User Management
- `GET /api/user` - Get current user info
- `PATCH /api/user` - Update user settings

### Billing
- `POST /api/billing/create-checkout` - Create Stripe checkout session
- `POST /api/billing/stripe-webhook` - Handle Stripe webhooks
- `GET /api/billing/create-customer-portal-session` - Manage subscriptions

### Photo Processing
- `POST /api/process-photos` - Process photos with AI
- `POST /api/upload` - Upload photos for processing

### Job Management
- `GET /api/jobs` - List all jobs
- `GET /api/jobs/[id]` - Get job details
- `PATCH /api/jobs/[id]` - Update job (e.g., rename group)
- `DELETE /api/jobs/[id]` - Delete job

### Dashboard
- `GET /api/dashboard` - Get dashboard data (jobs, credits)

See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for detailed endpoint documentation.

---

## Database Schema

The application uses PostgreSQL with Drizzle ORM for migrations.

### Tables

- `auth_users` - User accounts
- `auth_accounts` - OAuth accounts (for future providers)
- `auth_sessions` - Active sessions
- `auth_verification_token` - Email verification tokens
- `photo_jobs` - Photo processing jobs
- `user_credits` - User credit balances
- `purchases` - Purchase transaction records

### Database Commands

```bash
# Generate migration from schema changes
npm run db:generate

# Run migrations
npm run db:migrate

# Open Drizzle Studio (database browser)
npm run db:studio

# Push schema changes directly (dev only)
npm run db:push
```

See [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) for complete schema documentation.

---

## Deployment

### Prerequisites

- Node.js 18+ runtime
- PostgreSQL database
- Reverse proxy (Nginx, Caddy, or cloud load balancer) for HTTPS
- Object storage for images (S3, Cloudflare R2, etc.)

### Deployment Steps

1. Set up environment variables on your hosting platform
2. Run database migrations
3. Build the application (`npm run build`)
4. Start the server (`npm start`)
5. Configure reverse proxy for HTTPS

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions for various platforms (Vercel, Railway, AWS, etc.).

---

## Documentation

- [Production Readiness Roadmap](./PRODUCTION_READINESS.md) - Checklist for production deployment
- [API Documentation](./API_DOCUMENTATION.md) - Detailed API endpoint specs
- [Database Schema](./DATABASE_SCHEMA.md) - Database structure and migrations
- [Deployment Guide](./DEPLOYMENT.md) - Platform-specific deployment instructions
- [Testing Strategy](./TESTING_STRATEGY.md) - Testing guidelines and setup

---

## Production Readiness

**Current Status**: ALPHA/BETA - Not Production-Ready

This application is functional but requires additional work before production deployment:

- [ ] Add comprehensive test suite
- [x] Set up database migrations (Drizzle ORM)
- [x] Add ESLint and Prettier with pre-commit hooks
- [ ] Configure CI/CD pipeline
- [ ] Add monitoring and logging
- [ ] Complete security audit

See [PRODUCTION_READINESS.md](./PRODUCTION_READINESS.md) for the complete roadmap.

---

## Contributing

(Coming soon - see CONTRIBUTING.md)

### Development Workflow

1. Create a feature branch
2. Make your changes
3. Run tests (`npm test`)
4. Submit a pull request

### Code Quality

- TypeScript strict mode enabled
- Use ESLint and Prettier (configuration coming soon)
- Write tests for new features
- Follow existing code patterns

---

## Security

### Reporting Vulnerabilities

If you discover a security vulnerability, please email security@stageinseconds.com instead of using the issue tracker.

### Security Features

- Argon2 password hashing
- SSRF protection on file uploads
- Input validation on all endpoints
- CSRF protection
- Secure session management

---

## License

(Add your license here - MIT, Apache 2.0, etc.)

---

## Support

- Documentation: See `/docs` folder
- Issues: [GitHub Issues](https://github.com/yourusername/stageinseconds.com/issues)
- Email: support@stageinseconds.com

---

## Acknowledgments

- Google Gemini API for AI processing
- Stripe for payment processing
- Neon for serverless PostgreSQL
- React Router team for the excellent framework

---

**Built with** ❤️ **using React, Hono, and AI**

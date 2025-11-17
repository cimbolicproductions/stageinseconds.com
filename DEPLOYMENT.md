# Deployment Guide

**Last Updated**: 2025-11-09
**Stack**: Vercel + Neon PostgreSQL

This guide provides step-by-step instructions for deploying stageinseconds.com to production.

---

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Database Setup (Neon)](#database-setup-neon)
- [Vercel Deployment](#vercel-deployment)
- [Environment Variables](#environment-variables)
- [Post-Deployment Verification](#post-deployment-verification)
- [Rollback Procedures](#rollback-procedures)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)

---

## Overview

### Tech Stack

**Hosting**: Vercel
- Zero-config deployment for React Router 7
- Automatic HTTPS and SSL certificates
- Serverless functions for API routes
- Preview deployments for every PR
- Edge network for fast global delivery
- Free tier available

**Database**: Neon PostgreSQL
- Serverless PostgreSQL with instant cold starts
- Auto-scaling based on usage
- Database branching (like git for databases)
- Already integrated in your code (`@neondatabase/serverless`)
- Free tier: 0.5 GB storage, unlimited compute hours

### Cost

**Free Tier** (Getting Started):
- Vercel Hobby: Free (100 GB bandwidth/month)
- Neon Free: Free (0.5 GB storage)
- **Total**: $0/month

**Production Scale**:
- Vercel Pro: $20/month (1 TB bandwidth)
- Neon Pro: $19/month (10 GB storage, point-in-time recovery)
- **Total**: ~$40/month

---

## Prerequisites

### Required Before Deployment

1. **Code Quality**
   - [ ] All tests passing (`npm test`)
   - [ ] No TypeScript errors (`npm run type-check`)
   - [ ] Linting passing (`npm run lint`)
   - [ ] Build succeeds (`npm run build`)

2. **External Services**
   - [ ] Stripe account configured (production keys)
   - [ ] Google Cloud project with Gemini API enabled
   - [ ] Domain name registered (optional but recommended)

3. **Accounts**
   - [ ] Vercel account - sign up at https://vercel.com
   - [ ] Neon account - sign up at https://neon.tech
   - [ ] GitHub repository with your code

---

## Database Setup (Neon)

### Step 1: Create Neon Project

1. Go to https://console.neon.tech
2. Click **"Create Project"**
3. Configure:
   - **Project name**: `stageinseconds-production`
   - **Region**: Select closest to your users (e.g., `us-east-2` for US East)
   - **PostgreSQL version**: 15 (default)
4. Click **"Create Project"**

### Step 2: Get Connection String

After creation, Neon displays your connection string:

```
postgresql://[user]:[password]@[endpoint].neon.tech/[database]?sslmode=require
```

**Copy this** - you'll need it for Vercel.

**Example**:
```
postgresql://alex:AbCdEf123@ep-cool-darkness-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
```

### Step 3: Enable Connection Pooling

**Important**: For Vercel serverless functions, use the **pooled connection**.

1. In Neon Console → **Connection Details**
2. Toggle to **"Pooled connection"**
3. Copy this connection string (port changes from `5432` to `6543`)

**Pooled connection example**:
```
postgresql://alex:AbCdEf123@ep-cool-darkness-123456-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
```

**Use the pooled connection for `DATABASE_URL` in Vercel.**

### Step 4: Create Database Schema

Choose one method to create your database schema:

#### Option A: Using Neon SQL Editor (Easiest)

1. In Neon Console → **SQL Editor**
2. Copy the complete schema from [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) (section "Schema SQL")
3. Paste into SQL Editor
4. Click **"Run"**

#### Option B: Using psql (Local PostgreSQL client)

```bash
# Create migrations directory
mkdir -p migrations

# Copy schema SQL from DATABASE_SCHEMA.md to this file
nano migrations/001_initial_schema.sql

# Run migration
psql "your-pooled-connection-string-here" -f migrations/001_initial_schema.sql
```

### Step 5: Verify Tables Created

In Neon Console → **Tables**, verify you see:
- `auth_users`
- `auth_accounts`
- `auth_sessions`
- `auth_verification_token`
- `photo_jobs`
- `user_credits`
- `purchases`

✅ Database setup complete!

---

## Vercel Deployment

### Step 1: Install Vercel CLI (Optional)

```bash
npm install -g vercel
```

### Step 2: Connect GitHub Repository

**Via Vercel Dashboard** (Recommended):

1. Go to https://vercel.com/new
2. Click **"Import Git Repository"**
3. Authorize Vercel to access your GitHub account
4. Select your `stageinseconds.com` repository
5. Click **"Import"**

**Via CLI** (Alternative):

```bash
cd stageinseconds.com
vercel login
vercel
# Follow prompts to link repository
```

### Step 3: Configure Build Settings

Vercel should auto-detect React Router 7. Verify these settings in the dashboard:

**Framework Preset**: `Other` or `Vite`

**Root Directory**: `apps/web`

**Build Command**:
```bash
npm install && npm run build
```

**Output Directory**:
```bash
build/client
```

**Install Command**:
```bash
npm install
```

**Node Version**: `20.x` (latest LTS)

### Step 4: Set Environment Variables

In Vercel Dashboard → Your Project → **Settings** → **Environment Variables**

Add all variables from [.env.example](./.env.example):

| Variable | Value | Environment |
|----------|-------|-------------|
| `DATABASE_URL` | Neon **pooled** connection string | Production, Preview |
| `AUTH_SECRET` | Generate: `openssl rand -hex 32` | Production, Preview |
| `GOOGLE_API_KEY` | From https://aistudio.google.com/app/apikey | Production, Preview |
| `STRIPE_SECRET_KEY` | `sk_live_...` (prod) or `sk_test_...` (dev) | Production |
| `STRIPE_SECRET_KEY` | `sk_test_...` | Preview |
| `STRIPE_PUBLIC_KEY` | `pk_live_...` or `pk_test_...` | Production |
| `STRIPE_PUBLIC_KEY` | `pk_test_...` | Preview |
| `NEXT_PUBLIC_CREATE_HOST` | `create.xyz` | Production, Preview |
| `NEXT_PUBLIC_PROJECT_GROUP_ID` | Your project group ID | Production, Preview |
| `NEXT_PUBLIC_APP_URL` | `https://stageinseconds.com` | Production |
| `NODE_ENV` | `production` | Production |
| `CORS_ORIGINS` | `https://stageinseconds.com` | Production |

**Important**:
- Select **"Production"** environment for production values
- Select **"Preview"** environment for PR preview deployments
- Use Stripe **test keys** for Preview, **live keys** for Production

**Generate AUTH_SECRET**:
```bash
openssl rand -hex 32
```

### Step 5: Configure Custom Domain (Optional)

1. Vercel Dashboard → Your Project → **Settings** → **Domains**
2. Click **"Add Domain"**
3. Enter your domain: `stageinseconds.com`
4. Vercel provides DNS configuration instructions

**Update DNS at your domain registrar**:

**Option A: Vercel Nameservers** (Recommended):
```
Nameserver 1: ns1.vercel-dns.com
Nameserver 2: ns2.vercel-dns.com
```

**Option B: CNAME/A Records**:
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com

Type: A
Name: @
Value: 76.76.21.21
```

Vercel automatically provisions an SSL certificate via Let's Encrypt.

**Wait 24-48 hours** for DNS propagation.

### Step 6: Deploy

**Automatic via GitHub** (Recommended):

```bash
git add .
git commit -m "Initial production deployment"
git push origin main
```

Vercel automatically deploys every push to `main` branch.

**Manual via CLI**:

```bash
vercel --prod
```

**Check deployment status** in Vercel Dashboard → Deployments.

### Step 7: Configure Stripe Webhook

After your first deployment, configure Stripe to send webhooks to your app:

1. Go to https://dashboard.stripe.com/webhooks
2. Click **"Add endpoint"**
3. **Endpoint URL**: `https://stageinseconds.com/api/billing/stripe-webhook`
   (or your Vercel deployment URL: `https://your-project.vercel.app/api/billing/stripe-webhook`)
4. **Events to send**:
   - Select `checkout.session.completed`
5. Click **"Add endpoint"**
6. Copy the **Signing secret** (starts with `whsec_...`)
7. Add to Vercel environment variables:
   - **Name**: `STRIPE_WEBHOOK_SECRET`
   - **Value**: `whsec_...`
   - **Environment**: Production

**For local development** (optional):
- Use Stripe CLI: https://stripe.com/docs/stripe-cli
- Forward webhooks: `stripe listen --forward-to localhost:4000/api/billing/stripe-webhook`

---

## Environment Variables

### Complete List

**Critical: Never commit these to git**

| Variable | How to Get It | Required |
|----------|---------------|----------|
| `DATABASE_URL` | Neon Console → Connection Details (**pooled**) | Yes |
| `AUTH_SECRET` | `openssl rand -hex 32` | Yes |
| `GOOGLE_API_KEY` | https://aistudio.google.com/app/apikey | Yes |
| `STRIPE_SECRET_KEY` | https://dashboard.stripe.com/apikeys | Yes |
| `STRIPE_PUBLIC_KEY` | https://dashboard.stripe.com/apikeys | Yes |
| `STRIPE_WEBHOOK_SECRET` | Stripe → Webhooks → Signing secret | Yes |
| `NEXT_PUBLIC_CREATE_HOST` | Integration provider | Yes |
| `NEXT_PUBLIC_PROJECT_GROUP_ID` | Integration provider | Yes |
| `NEXT_PUBLIC_APP_URL` | Your domain (auto-set by Vercel) | No |
| `CORS_ORIGINS` | Comma-separated allowed origins | No |
| `NODE_ENV` | Auto-set to `production` by Vercel | Auto |
| `LOG_LEVEL` | Log level: trace, debug, info, warn, error, fatal (default: info) | No |
| `LOGTAIL_TOKEN` | LogTail/BetterStack source token (optional, free tier available) | No |

### Setting Environment Variables

**Via Vercel Dashboard**:
1. Project → Settings → Environment Variables
2. Click **"Add New"**
3. Enter name and value
4. Select environment (Production/Preview/Development)
5. Click **"Save"**

**Via Vercel CLI**:
```bash
vercel env add DATABASE_URL production
# Paste value when prompted
```

**Bulk Import**:
```bash
# Pull current env vars
vercel env pull .env.local

# Edit with production values
nano .env.local

# Push to Vercel
vercel env push .env.local production
```

---

## Post-Deployment Verification

### Immediate Checks (First 15 Minutes)

#### 1. Health Check

Visit your domain:
```bash
curl https://stageinseconds.com
```
**Expected**: 200 OK, returns homepage HTML

#### 2. API Endpoint Check

```bash
curl https://stageinseconds.com/api/billing/products
```
**Expected**: JSON with pricing offers

#### 3. Test Authentication

1. Visit `https://stageinseconds.com/account/signup`
2. Create a test account
3. Sign in with credentials
4. Verify session persists after refresh

#### 4. Database Verification

After creating test account:
- Go to Neon Console → **Tables** → `auth_users`
- Verify test user appears
- Check `auth_accounts` table for credentials record

#### 5. Photo Processing Test

1. Sign in to test account
2. Navigate to photo upload page
3. Upload a test image
4. Submit for processing
5. Verify job appears in dashboard
6. Check download works (if processing completes)

#### 6. Stripe Checkout Test

1. Navigate to pricing/billing page
2. Click to purchase credits
3. Use Stripe test card: `4242 4242 4242 4242`
4. Complete checkout
5. Verify redirect back to app
6. Check Vercel logs for webhook received
7. Verify credits added to account

### Monitoring (First Hour)

**Vercel Dashboard** → Your Project → **Logs**:
- [ ] No 500 errors
- [ ] API responses < 1 second
- [ ] Function executions completing successfully
- [ ] Stripe webhooks delivering

**Neon Dashboard** → Your Project → **Monitoring**:
- [ ] Database connections healthy
- [ ] No connection pool exhaustion
- [ ] Query performance acceptable (< 100ms average)

### Quality Checks (First Day)

- [ ] Review Vercel Analytics for traffic patterns
- [ ] Check error logs for any issues
- [ ] Test from multiple browsers (Chrome, Firefox, Safari)
- [ ] Test on mobile devices (iOS, Android)
- [ ] Run Lighthouse audit: https://pagespeed.web.dev
  - Target: Performance > 90, Accessibility > 95
- [ ] Verify SSL certificate is valid (check browser lock icon)

---

## Rollback Procedures

### Quick Rollback (< 2 minutes)

If something goes wrong after deployment:

**Via Vercel Dashboard**:
1. Go to Project → **Deployments**
2. Find the last working deployment
3. Click **"•••"** menu → **"Promote to Production"**
4. Confirm promotion

**Via CLI**:
```bash
# List recent deployments
vercel ls

# Rollback to specific deployment
vercel rollback [deployment-url]
```

### Database Rollback (Emergency Only)

⚠️ **DANGER**: Only use if absolutely necessary

#### Neon Automatic Backups

1. Neon Console → **Backups**
2. Select backup timestamp before the issue
3. Click **"Restore"**
4. Confirm restoration

**Note**: Free tier has limited backup retention. Upgrade to Pro for point-in-time recovery.

#### Point-in-Time Recovery (Neon Pro)

Restore database to any point in the last 7 days:
1. Neon Console → **Restore**
2. Select date/time
3. Create new branch or restore in place
4. Verify data

#### Manual Restore

If you have manual backups:
```bash
psql $DATABASE_URL < backup-20250108.sql
```

**After database rollback**:
1. Deploy previous application code version
2. Verify data integrity
3. Test critical flows
4. Monitor error rates closely

---

## Monitoring

### Vercel Built-in Tools

**Analytics** (free on all plans):
- Vercel Dashboard → Your Project → **Analytics**
- Page views, unique visitors
- Top pages and referrers
- Geographic distribution

**Logs** (real-time):
- Vercel Dashboard → Your Project → **Logs**
- Function execution logs
- Error logs with stack traces
- Request/response details
- Filter by status code, function, time

**Speed Insights** (paid add-on):
- Core Web Vitals monitoring
- Real user performance metrics
- Performance scores by page

### Neon Database Monitoring

**Built-in Dashboard**:
- Neon Console → Your Project → **Monitoring**
- Connection count (watch for pool exhaustion)
- Storage usage
- Compute time
- Query performance

**Set up alerts**:
1. Neon Console → **Settings** → **Alerts**
2. Configure thresholds:
   - Storage approaching limit (80% recommended)
   - High connection count (> 80% of pool)
   - Compute hours approaching quota

### Logging (Built-in with Pino)

The application includes built-in logging with Pino for structured logging and error tracking.

**Viewing Logs in Production**:

1. **Vercel Logs** (built-in, free):
   - Vercel Dashboard → Your Project → **Logs**
   - View real-time JSON logs
   - Filter by status code, function, time
   - Search for errors: filter by "level:50" (error) or "level:60" (fatal)

2. **LogTail/BetterStack** (optional, free tier):
   - Sign up at https://betterstack.com/logs or https://logtail.com
   - Create a source and copy the source token
   - Add `LOGTAIL_TOKEN` to Vercel environment variables
   - Logs will stream to LogTail dashboard with advanced search and filtering
   - Free tier: 1GB/month, 3-day retention

3. **Papertrail** (alternative, free tier):
   - Sign up at https://papertrailapp.com
   - Free tier: 50MB/day, 48-hour search
   - Configure Pino transport (see [LOGGING.md](./docs/LOGGING.md))

**Log Structure**:
All logs include context for easy filtering:
- `requestId`: Unique ID for request tracing
- `userId`: Authenticated user ID
- `method`, `path`: HTTP request details
- `statusCode`, `duration`: Response metrics
- `err.message`, `err.stack`: Error details

**Searching Logs**:
```
# Find all errors for a user
userId = "user_123" AND level >= 50

# Find slow requests
duration > 1000

# Find payment events
event = "checkout_session_created"

# Trace a request
requestId = "abc123"
```

For detailed logging documentation, see [docs/LOGGING.md](./docs/LOGGING.md).

### External Monitoring (Optional)

#### Error Tracking: Alternative to Built-in Logging

If you need more advanced error tracking beyond Pino, consider Sentry (paid service, $26/month after trial).

The application already includes comprehensive error logging with Pino. Sentry provides additional features like error grouping, release tracking, and performance monitoring.

#### Uptime Monitoring: UptimeRobot

1. Sign up at https://uptimerobot.com (free)
2. Add monitors:
   - **Monitor 1**: Homepage
     - Type: HTTPS
     - URL: `https://stageinseconds.com`
     - Interval: 5 minutes
   - **Monitor 2**: API health
     - Type: HTTPS
     - URL: `https://stageinseconds.com/api/billing/products`
     - Interval: 5 minutes
3. Configure alerts:
   - Email notifications
   - Slack integration (optional)
   - SMS for critical alerts (paid)

---

## Vercel Features

### Preview Deployments

Every pull request gets a unique preview URL automatically:
- Format: `https://stageinseconds-git-[branch]-[team].vercel.app`
- Isolated environment for testing
- Automatic deployment on every push to PR branch

**Workflow**:
1. Create feature branch: `git checkout -b feature/new-pricing`
2. Make changes and commit
3. Push: `git push origin feature/new-pricing`
4. Create PR on GitHub
5. Vercel automatically comments with preview URL
6. Test on preview environment
7. Merge PR → auto-deploys to production

**Preview Environment Variables**:
- Use different values for Preview vs Production
- Example: Stripe test keys in Preview, live keys in Production
- Configure in Vercel → Settings → Environment Variables

### Automatic Deployments

**Production** (main branch):
- Every push to `main` deploys to production
- Automatic HTTPS
- Zero downtime deployments

**Branch Deployments**:
- Every push to any branch creates a preview
- Great for testing before merging

**Disable auto-deploy** (if needed):
- Project Settings → Git → Toggle "Auto Deploy"

### Build Cache

Vercel caches builds for faster deployments:
- npm dependencies cached
- Build outputs cached
- Incremental builds when possible

**Clear cache**:
```bash
vercel --force
```

### Logs and Debugging

**Real-time logs**:
```bash
vercel logs [deployment-url] --follow
```

**Filter logs**:
- By status code: Filter by "500" to see errors
- By function: Filter by function name
- By time range: Select date range in dashboard

---

## Troubleshooting

### Common Issues

#### 500 Internal Server Error

**Symptoms**: API endpoints returning 500

**Diagnosis**:
1. Vercel Dashboard → Logs → Filter by "500"
2. Check function execution logs
3. Look for error stack traces

**Common causes**:
- Missing environment variables
- Database connection failed
- Incorrect `DATABASE_URL` (use pooled connection)

**Solution**:
```bash
# Verify all env vars are set
vercel env ls

# Add missing variables
vercel env add VARIABLE_NAME production
```

#### Database Connection Failed

**Symptoms**: "Failed to connect to database" errors

**Diagnosis**:
1. Check `DATABASE_URL` is the **pooled connection** (port 6543, not 5432)
2. Verify Neon project is active (not suspended)
3. Check SSL mode in connection string: `?sslmode=require`

**Solution**:
```bash
# Verify connection string format
# Should be: postgresql://user:pass@host-pooler.neon.tech:6543/db?sslmode=require

# Update in Vercel
vercel env rm DATABASE_URL production
vercel env add DATABASE_URL production
# Paste correct pooled connection string
```

#### Stripe Webhooks Not Working

**Symptoms**: Credits not added after purchase

**Diagnosis**:
1. Stripe Dashboard → Webhooks → Recent deliveries
2. Check delivery attempts and responses
3. Verify endpoint URL is correct

**Common causes**:
- Incorrect webhook URL
- Missing `STRIPE_WEBHOOK_SECRET`
- Webhook signature validation failing

**Solution**:
```bash
# Verify webhook URL is correct
# Should be: https://your-domain.com/api/billing/stripe-webhook

# Check webhook secret is set
vercel env ls production | grep STRIPE_WEBHOOK_SECRET

# Add if missing
vercel env add STRIPE_WEBHOOK_SECRET production
```

#### Build Failures

**Symptoms**: Deployment fails during build

**Diagnosis**:
1. Vercel Dashboard → Deployments → Failed deployment → Logs
2. Check build logs for errors
3. Look for TypeScript errors, dependency issues

**Common causes**:
- TypeScript errors
- Missing dependencies
- Build script errors

**Solution**:
```bash
# Test build locally first
cd apps/web
npm run build

# Check for TypeScript errors
npm run type-check

# Fix errors, then redeploy
git add .
git commit -m "Fix build errors"
git push origin main
```

#### Slow Cold Starts

**Symptoms**: First request after inactivity is slow (> 3 seconds)

**Explanation**: Normal for serverless functions

**Mitigation**:
- Use Neon **pooled connections** (reduces DB connection time)
- Upgrade to Vercel Pro (faster cold starts)
- Implement warming strategy (ping endpoint every 5 minutes)

#### CORS Errors

**Symptoms**: Browser console shows CORS errors

**Solution**:
```bash
# Set CORS_ORIGINS environment variable
vercel env add CORS_ORIGINS production
# Value: https://stageinseconds.com,https://www.stageinseconds.com
```

### Getting Help

**Vercel**:
- Documentation: https://vercel.com/docs
- Support: Dashboard → Help
- Community: https://github.com/vercel/vercel/discussions

**Neon**:
- Documentation: https://neon.tech/docs
- Discord: https://discord.gg/neon
- Support: support@neon.tech

---

## Security Checklist

Before launching to production:

- [ ] HTTPS enabled (automatic with Vercel ✅)
- [ ] Environment variables not committed to git
- [ ] `AUTH_SECRET` is strong (32+ characters)
- [ ] Database password is secure (Neon auto-generates ✅)
- [ ] Database accessible only via SSL (Neon enforces ✅)
- [ ] Stripe uses **production keys** (not test keys)
- [ ] `STRIPE_WEBHOOK_SECRET` configured
- [ ] CORS configured via `CORS_ORIGINS` env var
- [ ] Dependencies updated: `npm audit`
- [ ] No high/critical vulnerabilities
- [ ] Vercel deployment protection enabled (optional)

### Optional: Enable Deployment Protection

Protect preview deployments with password:

1. Vercel Dashboard → Project → Settings → **Deployment Protection**
2. Enable "Password Protection" for Preview
3. Set password
4. Preview URLs now require password to access

---

## Next Steps

After successful deployment:

1. **Week 1**: Monitor closely
   - Check Vercel logs daily
   - Monitor Neon database usage
   - Review error rates in Sentry
   - Watch for uptime alerts

2. **Week 2**: Optimize
   - Review Vercel Analytics
   - Identify slow endpoints
   - Optimize database queries
   - Review Lighthouse scores

3. **Month 1**: Scale planning
   - Monitor bandwidth usage (Vercel)
   - Monitor database size (Neon)
   - Plan for paid tiers if needed
   - Set up automated backups

4. **Ongoing**:
   - Set up Sentry error tracking
   - Configure UptimeRobot monitoring
   - Enable Vercel Analytics
   - Document incident response procedures
   - Keep dependencies updated

---

## Documentation Resources

- [Production Readiness Roadmap](./PRODUCTION_READINESS.md)
- [Database Schema](./DATABASE_SCHEMA.md)
- [API Documentation](./API_DOCUMENTATION.md)
- [Environment Variables](./.env.example)
- [Testing Strategy](./TESTING_STRATEGY.md)

**Official Docs**:
- Vercel: https://vercel.com/docs
- Neon: https://neon.tech/docs
- React Router: https://reactrouter.com/docs
- Stripe: https://stripe.com/docs

---

**You're ready to deploy!** 🚀

Follow the steps above in order, and you'll have a production deployment running in under an hour.

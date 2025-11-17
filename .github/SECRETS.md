# GitHub Secrets Configuration

This document outlines all required and optional secrets for the CI/CD pipeline and deployment workflows.

## Required Secrets

These secrets are essential for the application to function properly in production and CI/CD environments.

### 1. DATABASE_URL

**Description**: Production database connection string for PostgreSQL

**Format**: `postgresql://[user]:[password]@[host]:[port]/[database]?sslmode=require`

**Example**: `postgresql://myuser:mypassword@db.example.com:5432/production_db?sslmode=require`

**How to obtain**:
- If using a managed database (e.g., Neon, Supabase, AWS RDS), copy the connection string from the provider's dashboard
- Ensure SSL mode is enabled for security
- Use a dedicated database user with appropriate permissions

**Where to use**:
- Production deployment (Vercel)
- Set as environment variable in Vercel project settings

### 2. TEST_DATABASE_URL

**Description**: Test database connection string for CI/CD pipeline

**Format**: `postgresql://postgres:postgres@localhost:5432/test_db`

**Note**: This is automatically configured in GitHub Actions using a PostgreSQL service container. You typically don't need to set this as a secret.

**How to configure locally**:
```bash
# In apps/web/.env
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/test_db
```

### 3. STRIPE_SECRET_KEY

**Description**: Stripe API secret key for payment processing

**Format**: `sk_live_...` (production) or `sk_test_...` (testing)

**How to obtain**:
1. Log in to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Go to **Developers** → **API Keys**
3. Copy the **Secret key**
4. For production, use the live key; for testing, use the test key

**Security**:
- ⚠️ **NEVER** commit this to your repository
- Use test keys for development and CI
- Use live keys only in production

**Where to use**:
- GitHub repository secrets (for CI/CD)
- Vercel environment variables (production)
- Local `.env` file (development - use test key)

### 4. STRIPE_WEBHOOK_SECRET

**Description**: Stripe webhook signing secret for verifying webhook authenticity

**Format**: `whsec_...`

**How to obtain**:
1. Log in to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Go to **Developers** → **Webhooks**
3. Click **Add endpoint** or select existing endpoint
4. Copy the **Signing secret**

**Where to use**:
- GitHub repository secrets (for CI/CD)
- Vercel environment variables (production)
- Local `.env` file (development)

**Note**: You'll need separate webhook secrets for:
- Local development (using Stripe CLI)
- Production deployment
- CI/CD testing (can use test webhook secret)

### 5. GEMINI_API_KEY

**Description**: Google Gemini API key for AI-powered photo processing

**Format**: Alphanumeric string

**How to obtain**:
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Click **Create API Key**
3. Select or create a Google Cloud project
4. Copy the generated API key

**Where to use**:
- GitHub repository secrets (for CI/CD)
- Vercel environment variables (production)
- Local `.env` file (development)

**Rate limits**:
- Free tier: 60 requests per minute
- Consider rate limiting in your application
- Monitor usage in Google Cloud Console

## Optional Secrets

These secrets enable additional features but are not required for basic functionality.

### 6. VERCEL_TOKEN (Optional)

**Description**: Vercel API token for automated deployments

**How to obtain**:
1. Log in to [Vercel](https://vercel.com/)
2. Go to **Settings** → **Tokens**
3. Click **Create Token**
4. Give it a descriptive name (e.g., "GitHub Actions")
5. Set expiration (recommended: 1 year)
6. Copy the token immediately (shown only once)

**Where to use**:
- GitHub repository secrets (for deploy workflow)

**Note**: If not configured, the deploy workflow will skip deployment steps gracefully.

### 7. VERCEL_ORG_ID (Optional)

**Description**: Vercel organization/team ID

**How to obtain**:
1. Install Vercel CLI: `npm install -g vercel`
2. Run `vercel login` and authenticate
3. Navigate to your project directory
4. Run `vercel link`
5. Check `.vercel/project.json` for `orgId`

**Where to use**:
- GitHub repository secrets (for deploy workflow)

### 8. CODECOV_TOKEN (Optional)

**Description**: Codecov upload token for test coverage reports

**How to obtain**:
1. Sign up at [Codecov](https://codecov.io/)
2. Link your GitHub repository
3. Go to repository settings
4. Copy the upload token

**Where to use**:
- GitHub repository secrets (for test workflow)

**Note**: Codecov is free for public repositories. For private repos, you'll need a paid plan.

## How to Set GitHub Secrets

### Via GitHub Web Interface

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Enter the secret name and value
5. Click **Add secret**

### Via GitHub CLI

```bash
# Set a secret using GitHub CLI
gh secret set SECRET_NAME --body "secret-value"

# Or read from a file
gh secret set SECRET_NAME < secret-file.txt

# Or enter interactively
gh secret set SECRET_NAME
# (paste value and press Ctrl+D)
```

### Example: Setting All Required Secrets

```bash
# Database URLs
gh secret set DATABASE_URL --body "postgresql://user:pass@host:5432/prod_db?sslmode=require"

# Stripe keys
gh secret set STRIPE_SECRET_KEY --body "sk_test_..."
gh secret set STRIPE_WEBHOOK_SECRET --body "whsec_..."

# Gemini API key
gh secret set GEMINI_API_KEY --body "your-gemini-api-key"

# Optional: Vercel deployment
gh secret set VERCEL_TOKEN --body "your-vercel-token"
gh secret set VERCEL_ORG_ID --body "your-org-id"

# Optional: Codecov
gh secret set CODECOV_TOKEN --body "your-codecov-token"
```

## Local Development Setup

Create a `.env` file in `apps/web/` directory:

```bash
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/dev_db
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/test_db

# Stripe (use test keys)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Gemini API
GEMINI_API_KEY=your-gemini-api-key

# Optional: Set these if using Vercel CLI locally
# VERCEL_TOKEN=...
# VERCEL_ORG_ID=...
```

**Important**: The `.env` file is gitignored and should never be committed to version control.

## Vercel Environment Variables

Set these in Vercel project settings:

1. Go to your project in Vercel dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add each variable with appropriate values
4. Select environment (Production, Preview, Development)

**Production variables**:
- `DATABASE_URL` - Production database
- `STRIPE_SECRET_KEY` - Live Stripe key
- `STRIPE_WEBHOOK_SECRET` - Production webhook secret
- `GEMINI_API_KEY` - Production API key

**Preview/Development variables**:
- Can use the same test keys as local development
- Useful for testing in Vercel preview deployments

## Security Best Practices

1. **Rotate secrets regularly**
   - Database passwords: Every 90 days
   - API keys: Annually or when team members leave
   - Webhooks: When endpoints change

2. **Use different secrets for each environment**
   - Development: Test keys, local database
   - Staging: Test keys, staging database
   - Production: Live keys, production database

3. **Limit secret access**
   - Only grant access to team members who need it
   - Use role-based access control in Vercel

4. **Monitor secret usage**
   - Check Stripe dashboard for unusual activity
   - Monitor API usage in Google Cloud Console
   - Review database access logs

5. **Never log secrets**
   - Ensure secrets are not printed in logs
   - Redact sensitive data in error messages

## Troubleshooting

### Tests failing in CI with database errors

- Ensure PostgreSQL service is configured in workflow
- Check that `TEST_DATABASE_URL` points to `localhost:5432`
- Verify migrations run before tests

### Stripe webhooks not working

- Verify webhook secret matches the endpoint
- Check webhook endpoint URL is correct
- Ensure webhook is configured for the right events

### Deployment failing

- Verify `VERCEL_TOKEN` is valid and not expired
- Check `VERCEL_ORG_ID` matches your organization
- Ensure Vercel project is linked correctly

### Gemini API errors

- Verify API key is valid
- Check rate limits haven't been exceeded
- Ensure billing is set up in Google Cloud

## Questions?

If you need help with secret configuration:

1. Check this documentation first
2. Review the provider's documentation (Stripe, Vercel, etc.)
3. Open an issue with the `question` label
4. For security issues, contact maintainers privately

---

**Last Updated**: 2025-11-17
**Document Owner**: Development Team

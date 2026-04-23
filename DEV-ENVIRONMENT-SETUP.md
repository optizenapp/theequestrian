# Development Environment Setup

## Overview
This guide covers setting up separate development and production environments for The Equestrian headless storefront.

## Environment Structure

### Production Environment
- **Branch**: `main`
- **Database**: Production Neon DB
- **Shopify**: Production store
- **Deployment**: Vercel (auto-deploy from main)
- **URL**: https://theequestrian.vercel.app

### Development Environment
- **Branch**: `jono-dev`
- **Database**: Development Neon DB (separate database)
- **Shopify**: Same store (development/staging collections)
- **Deployment**: Vercel preview deployments
- **URL**: Preview URLs from Vercel

## Initial Setup

### 1. Create Development Database

#### Option A: Neon Console (Recommended)
1. Go to [Neon Console](https://console.neon.tech)
2. Select your project
3. Click **"Branches"** in sidebar
4. Click **"Create Branch"**
5. Settings:
   - **Branch name**: `dev` or `jono-dev`
   - **Parent branch**: `main` (or create from scratch)
   - **Compute**: Auto (scales to zero when not in use)
6. Click **"Create Branch"**
7. Copy the new connection string

#### Option B: Neon CLI
```bash
# Install Neon CLI
npm install -g neonctl

# Login to Neon
neonctl auth

# Create development branch
neonctl branches create --name dev --parent main

# Get connection string
neonctl connection-string dev
```

### 2. Configure Environment Variables

Create `.env.local` for development:

```env
# ============================================
# DEVELOPMENT ENVIRONMENT
# ============================================

# Shopify Configuration (same store for now)
SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
SHOPIFY_STOREFRONT_ACCESS_TOKEN=your_storefront_token

# Shopify Admin API (for webhooks, mutations)
SHOPIFY_ADMIN_ACCESS_TOKEN=your_admin_token

# Site Configuration
NEXT_PUBLIC_SITE_URL=http://localhost:3001

# ============================================
# DEVELOPMENT DATABASE (Neon Dev Branch)
# ============================================
POSTGRES_URL=postgresql://user:pass@dev-branch.neon.tech/neondb?sslmode=require

# Amazon SES (Development)
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_REGION=ap-southeast-2
AWS_SES_FROM_EMAIL=dev@yourdomain.com

# Admin Authentication
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_secure_password

# Optional: Moosend Newsletter
MOOSEND_API_KEY=your_moosend_key
```

### 3. Initialize Development Database

```bash
# Make sure you're on jono-dev branch
git checkout jono-dev

# Initialize database schema
npm run db:init

# Sync products from Shopify (takes 2-5 minutes)
npm run db:sync

# Verify sync
npm run db:stats
```

Expected output:
```
✅ Total Products: 4,409
✅ Available for Sale: 3,800+
✅ Last Synced: [timestamp]
```

### 4. Push Development Branch to GitHub

```bash
# Push jono-dev branch to remote
git push -u origin jono-dev
```

### 5. Configure Vercel for Development

#### Automatic Preview Deployments
Vercel automatically creates preview deployments for all branches:
- Every push to `jono-dev` creates a unique preview URL
- Format: `https://theequestrian-[hash]-optizenapp.vercel.app`

#### Custom Development Environment (Optional)
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Settings → Git
4. Add **"Development Branch"**: `jono-dev`
5. Settings → Environment Variables
6. Add dev-specific variables:
   - `POSTGRES_URL` → Development connection string
   - Target: **Preview** environments only

## Development Workflow

### Daily Workflow

```bash
# 1. Switch to dev branch
git checkout jono-dev

# 2. Pull latest changes
git pull origin jono-dev

# 3. Start development server
npm run dev

# 4. Make changes and test
# [your development work]

# 5. Commit changes
git add .
git commit -m "feat: description of changes"

# 6. Push to dev branch
git push origin jono-dev

# 7. Test on Vercel preview URL
# Check deployment in Vercel dashboard
```

### Merging to Production

```bash
# 1. Ensure jono-dev is up to date
git checkout jono-dev
git pull origin jono-dev

# 2. Switch to main
git checkout main
git pull origin main

# 3. Merge dev changes
git merge jono-dev

# 4. Test locally
npm run build
npm run start

# 5. Push to main (triggers production deploy)
git push origin main
```

### Keeping Dev Branch Updated

```bash
# Option 1: Merge main into dev (recommended)
git checkout jono-dev
git merge main
git push origin jono-dev

# Option 2: Rebase dev on main (cleaner history)
git checkout jono-dev
git rebase main
git push origin jono-dev --force-with-lease
```

## Database Management

### Syncing Development Database

```bash
# Full sync from Shopify (2-5 minutes)
npm run db:sync

# Check sync status
npm run db:stats

# Manual query (if needed)
psql $POSTGRES_URL -c "SELECT COUNT(*) FROM products;"
```

### Database Branching Strategy

#### When to Create New Database Branch
- Testing major schema changes
- Experimenting with data migrations
- Performance testing with production data clone

#### Creating a Branch from Production
```bash
# Clone production data to dev
neonctl branches create --name dev-snapshot --parent main

# Update .env.local with new connection string
# Run migrations/tests
```

#### Resetting Development Database
```bash
# Drop and recreate tables
npm run db:init

# Re-sync from Shopify
npm run db:sync
```

## Environment Variables Reference

### Required for All Environments
- `SHOPIFY_STORE_DOMAIN`
- `SHOPIFY_STOREFRONT_ACCESS_TOKEN`
- `NEXT_PUBLIC_SITE_URL`
- `POSTGRES_URL`

### Required for Admin Features
- `SHOPIFY_ADMIN_ACCESS_TOKEN`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`

### Optional Services
- `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `AWS_SES_FROM_EMAIL` — Amazon SES
- `MOOSEND_API_KEY` - Newsletter integration

## Troubleshooting

### Database Connection Issues

**Problem**: Can't connect to database
```bash
# Test connection
psql $POSTGRES_URL -c "SELECT 1;"

# Check if branch is active (Neon auto-suspends)
neonctl branches list

# Restart compute
neonctl branches restart dev
```

### Stale Data

**Problem**: Products not updating
```bash
# Force re-sync
npm run db:sync

# Check last sync time
npm run db:stats
```

### Port Already in Use

**Problem**: Port 3001 is busy
```bash
# Find process using port
lsof -ti:3001

# Kill process
kill -9 $(lsof -ti:3001)

# Or change port in package.json
"dev": "npm run redirects:generate && next dev -p 3002"
```

### Build Failures

**Problem**: Build fails after pulling changes
```bash
# Clean and rebuild
rm -rf .next node_modules
npm install
npm run build
```

## Best Practices

### Do's ✅
- Always work on `jono-dev` branch for new features
- Test changes locally before pushing
- Sync dev database weekly (or after major catalog changes)
- Use meaningful commit messages
- Create feature branches off `jono-dev` for large features

### Don'ts ❌
- Don't commit `.env.local` (it's gitignored)
- Don't push directly to `main` without testing
- Don't use production database for development
- Don't commit `node_modules` or `.next` folders
- Don't skip the build test before merging to main

## Quick Reference

### Common Commands
```bash
# Switch to dev
git checkout jono-dev

# Start dev server
npm run dev

# Build for production
npm run build

# Sync database
npm run db:sync

# Generate redirects
npm run redirects:generate

# Run linter
npm run lint
```

### Branch Info
- **Main**: Production-ready code only
- **jono-dev**: Active development branch
- **Feature branches**: Create from jono-dev for specific features

### Database Info
- **Production**: Neon main branch
- **Development**: Neon dev branch (separate data)
- **Auto-suspend**: Dev DB suspends after inactivity (free tier)
- **Wake time**: ~2-3 seconds on first request

## Next Steps

1. Set up development database branch in Neon
2. Update `.env.local` with dev database connection
3. Run `npm run db:init && npm run db:sync`
4. Test local development environment
5. See `MORNING-COLD-START.md` for daily startup procedure

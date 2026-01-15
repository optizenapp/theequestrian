# Morning Cold Start Procedure

Quick startup procedure for The Equestrian headless development environment.

## 🌅 Daily Startup (5 minutes)

### 1. Open Terminal & Navigate to Project
```bash
cd ~/Documents/Cursor\ Project/the-equestrian-headless
```

### 2. Check Git Status
```bash
# Verify you're on the right branch
git branch

# Should show: * jono-dev

# If not, switch to dev branch
git checkout jono-dev
```

### 3. Pull Latest Changes
```bash
# Get latest changes from remote
git pull origin jono-dev

# If there are merge conflicts, resolve them
# Or stash your changes first: git stash
```

### 4. Check for Dependency Updates
```bash
# Only if package.json changed
git diff HEAD@{1} package.json

# If changed, reinstall dependencies
npm install
```

### 5. Wake Up Development Database
```bash
# Test database connection (wakes up Neon compute)
npm run db:stats

# Expected output:
# ✅ Total Products: 4,409
# ✅ Available for Sale: 3,800+
```

**Note**: First database query may take 2-3 seconds as Neon wakes from sleep.

### 6. Generate Redirects
```bash
# Generate redirect maps from CSV files
npm run redirects:generate

# Expected output:
# ✅ Generated redirect maps
```

### 7. Start Development Server
```bash
# Start Next.js dev server on port 3001
npm run dev

# Expected output:
# ✓ Ready in [X]s
# ○ Local: http://localhost:3001
```

### 8. Open Browser
```
http://localhost:3001
```

## ✅ Verification Checklist

After startup, verify:
- [ ] Dev server running on http://localhost:3001
- [ ] Homepage loads successfully
- [ ] Database queries work (check console for query times)
- [ ] Products load on category pages
- [ ] Cart functionality works
- [ ] No console errors

## 🚨 Common Issues & Fixes

### Issue 1: Port Already in Use
```bash
# Error: Port 3001 is already in use

# Find and kill process
lsof -ti:3001 | xargs kill -9

# Or change port
npm run dev -- -p 3002
```

### Issue 2: Database Connection Timeout
```bash
# Error: connect ETIMEDOUT

# Check database status in Neon console
# Or restart compute:
neonctl branches restart dev

# Retry connection
npm run db:stats
```

### Issue 3: Stale Product Data
```bash
# Products not showing or outdated

# Re-sync from Shopify (2-5 minutes)
npm run db:sync
```

### Issue 4: Build Errors After Pull
```bash
# Error: Module not found or build fails

# Clean and rebuild
rm -rf .next node_modules
npm install
npm run dev
```

### Issue 5: Git Conflicts
```bash
# Conflict after git pull

# Option 1: Stash and pull
git stash
git pull origin jono-dev
git stash pop

# Option 2: Resolve conflicts manually
# Edit conflicted files
git add .
git commit -m "Resolve merge conflicts"
```

## 🔄 Alternative: One-Command Startup

Create a startup script for even faster cold starts:

### Create `start-dev.sh`:
```bash
#!/bin/bash

echo "🚀 Starting The Equestrian Development Environment..."

# Navigate to project
cd ~/Documents/Cursor\ Project/the-equestrian-headless

# Switch to dev branch
git checkout jono-dev

# Pull latest changes
echo "📥 Pulling latest changes..."
git pull origin jono-dev

# Check if package.json changed
if git diff HEAD@{1} --name-only | grep -q "package.json"; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Wake database
echo "🗄️  Waking up database..."
npm run db:stats

# Generate redirects
echo "🔀 Generating redirects..."
npm run redirects:generate

# Start dev server
echo "🌐 Starting development server..."
npm run dev
```

### Make it executable:
```bash
chmod +x start-dev.sh
```

### Use it:
```bash
./start-dev.sh
```

## 📊 Development Dashboard

Once running, these URLs are available:

### Public Pages
- **Homepage**: http://localhost:3001
- **Cart**: http://localhost:3001/cart
- **Product Example**: http://localhost:3001/horse/boots/product-handle
- **Category**: http://localhost:3001/horse
- **Search**: http://localhost:3001/search

### Admin Pages
- **Review Admin**: http://localhost:3001/admin/reviews
- **Login**: http://localhost:3001/admin/login

### API Routes
- **Product Search**: http://localhost:3001/api/products/search?q=boots
- **Product Status**: http://localhost:3001/api/products/status (POST)
- **Reviews**: http://localhost:3001/api/reviews/[productId]

## 🛠️ Development Tools

### VS Code / Cursor
```bash
# Open in Cursor
cursor .

# Or VS Code
code .
```

### View Logs
```bash
# Development server logs are in terminal
# Watch for:
# - ✓ Compiled successfully
# - [CartPage] logs
# - [getSmartCartRecommendations] logs
```

### Database Query
```bash
# Direct database access
psql $POSTGRES_URL

# Example queries
SELECT COUNT(*) FROM products;
SELECT * FROM products LIMIT 5;
SELECT * FROM sync_log ORDER BY synced_at DESC LIMIT 10;
```

## 📝 Daily Workflow Template

```bash
# Morning routine
git checkout jono-dev
git pull origin jono-dev
npm run db:stats
npm run dev

# [WORK ON FEATURES]

# Before lunch/break
git add .
git commit -m "wip: description"
git push origin jono-dev

# End of day
git add .
git commit -m "feat: completed feature description"
git push origin jono-dev
```

## ⏰ Time Estimates

| Task | Time | Notes |
|------|------|-------|
| Navigate & check status | 30s | Quick verification |
| Pull latest changes | 10s | Unless large files |
| Wake database | 2-3s | First query only |
| Generate redirects | 5-10s | CSV processing |
| Start dev server | 10-20s | Turbopack fast |
| **Total** | **~1-2 min** | From cold start to coding |

## 🎯 Pro Tips

1. **Keep Terminal Open**: Leave dev server running all day
2. **Use Git Branches**: Create feature branches for experiments
3. **Commit Often**: Small, frequent commits are better
4. **Test Locally**: Always test before pushing
5. **Watch Console**: Monitor for errors and warnings
6. **Database Sync**: Run `npm run db:sync` weekly or after major catalog changes

## 📞 Need Help?

If you encounter issues not covered here:
1. Check `DEV-ENVIRONMENT-SETUP.md` for detailed setup
2. Check `TROUBLESHOOTING.md` for common issues
3. Review `README.md` for project overview
4. Check GitHub issues for similar problems

## 🎉 You're Ready!

Your development environment is now running and ready for work. Happy coding!

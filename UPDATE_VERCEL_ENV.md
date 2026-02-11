# Update Vercel Environment Variable for jono-dev

## Issue
The `CUSTOM_DATABASE_URL` for the jono-dev branch is using a **non-pooled** connection string, which may cause connection issues in serverless environments.

## Current Value
```
postgresql://neondb_owner:npg_1Gzor6vnKkdu@ep-square-dawn-a7cjzpyx.ap-southeast-2.aws.neon.tech/neondb?sslmode=require
```

## Correct Value (with pooler)
```
postgresql://neondb_owner:npg_1Gzor6vnKkdu@ep-square-dawn-a7cjzpyx-pooler.ap-southeast-2.aws.neon.tech/neondb?sslmode=require
```

## Steps to Update

### Option 1: Via Vercel Dashboard (Recommended)
1. Go to https://vercel.com/dashboard
2. Select your project: `theequestrian`
3. Go to Settings → Environment Variables
4. Find `CUSTOM_DATABASE_URL`
5. Click Edit
6. Update the value to:
   ```
   postgresql://neondb_owner:npg_1Gzor6vnKkdu@ep-square-dawn-a7cjzpyx-pooler.ap-southeast-2.aws.neon.tech/neondb?sslmode=require
   ```
7. Make sure it's set for:
   - Environment: **Preview**
   - Git Branch: **jono-dev**
8. Save
9. Redeploy the jono-dev branch

### Option 2: Via Vercel CLI
```bash
# Remove the old variable
vercel env rm CUSTOM_DATABASE_URL preview

# Add the new one (when prompted, paste the pooled connection string)
vercel env add CUSTOM_DATABASE_URL preview

# When asked for the value, paste:
postgresql://neondb_owner:npg_1Gzor6vnKkdu@ep-square-dawn-a7cjzpyx-pooler.ap-southeast-2.aws.neon.tech/neondb?sslmode=require

# When asked for git branch, type: jono-dev
```

## Verification
After updating, the logs should show:
```
[DB Client] Connecting to: postgresql://neondb_owner:***@ep-square-dawn-a7cjzpyx-pooler...
[getProductsByCategory] ✅ Found 4807 products allocated to /horse
```

Instead of:
```
[getProductsByCategory] ❌ No products allocated to /horse
```

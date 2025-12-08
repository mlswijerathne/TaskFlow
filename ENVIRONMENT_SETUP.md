# TaskFlow Environment Configuration Guide

## 🚀 Quick Setup

### Development (Localhost)

1. **Copy the example environment file:**
   ```bash
   cp .env.local.example .env.local
   ```

2. **Update `.env.local` with your values:**
   ```env
   # Development URL
   NEXT_PUBLIC_APP_URL=http://localhost:3000

   # Your Supabase credentials
   NEXT_PUBLIC_SUPABASE_URL=https://ygfearxmisoabqrkgxvb.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
   
   # Edge Functions URL
   NEXT_PUBLIC_EDGE_URL=https://ygfearxmisoabqrkgxvb.supabase.co/functions/v1
   
   # Optional
   SENDGRID_API_KEY=your-sendgrid-key-here
   ```

3. **Install dependencies:**
   ```bash
   pnpm install
   ```

4. **Run development server:**
   ```bash
   pnpm dev
   ```

5. **Open browser:**
   Navigate to `http://localhost:3000`

---

## 🌐 Production (Netlify)

### Option 1: Environment Variables in Netlify Dashboard

1. Go to your Netlify site dashboard
2. Navigate to **Site configuration** → **Environment variables**
3. Add the following variables:

   | Variable Name | Value | Scope |
   |--------------|-------|-------|
   | `NEXT_PUBLIC_APP_URL` | `https://your-app.netlify.app` | Production |
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://ygfearxmisoabqrkgxvb.supabase.co` | All |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your anon key | All |
   | `SUPABASE_SERVICE_ROLE_KEY` | Your service role key | All |
   | `NEXT_PUBLIC_EDGE_URL` | `https://ygfearxmisoabqrkgxvb.supabase.co/functions/v1` | All |
   | `SENDGRID_API_KEY` | Your SendGrid key | All |
   | `SECRETS_SCAN_OMIT_KEYS` | `NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY,NEXT_PUBLIC_EDGE_URL` | All |

### Option 2: Create `.env.production` (Not Recommended)

Netlify automatically uses environment variables from the dashboard. Using `.env.production` is less secure.

---

## 📝 Environment Files

### `.env.local` (Development - Gitignored)
- Used for local development
- Never committed to Git
- Contains your local configuration

### `.env.local.example` (Template - Committed)
- Template for other developers
- Contains placeholder values
- Safe to commit to Git

### `.env.production` (Optional - Not Recommended)
- Production-specific overrides
- Should NOT contain secrets
- Netlify dashboard is preferred

---

## 🔐 Security Best Practices

### ✅ Safe to Expose (Public)
- `NEXT_PUBLIC_SUPABASE_URL` - Public by design
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Protected by RLS
- `NEXT_PUBLIC_EDGE_URL` - Public endpoint
- `NEXT_PUBLIC_APP_URL` - Your app URL

### ❌ Keep Secret (Server-side only)
- `SUPABASE_SERVICE_ROLE_KEY` - Full database access
- `SENDGRID_API_KEY` - Email service credentials
- `JWT_SECRET` - Token generation (Supabase functions only)

---

## 🎯 Environment Detection

The app automatically detects the environment:

```typescript
// Automatically uses correct URL
const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// Development
if (process.env.NODE_ENV === 'development') {
  // localhost:3000
}

// Production
if (process.env.NODE_ENV === 'production') {
  // your-app.netlify.app
}
```

---

## 🧪 Testing Different Environments

### Test Development Build Locally
```bash
# Build as production
pnpm build

# Run production build locally
pnpm start
```

This tests the production build but still uses your `.env.local` file.

### Test with Production Environment Variables
```bash
# Set production URL temporarily
NEXT_PUBLIC_APP_URL=https://your-app.netlify.app pnpm dev
```

---

## 🔄 Switching Between Environments

### Development → Production
1. Push your changes to GitHub
2. Netlify automatically detects and deploys
3. Uses environment variables from Netlify dashboard

### Production → Development
1. Pull latest changes from GitHub
2. Make sure `.env.local` exists with correct values
3. Run `pnpm dev`

---

## 📦 Package Scripts

```json
{
  "dev": "next dev",           // Development server (localhost:3000)
  "build": "next build",       // Production build
  "start": "next start",       // Run production build locally
  "lint": "eslint"             // Run linter
}
```

---

## 🐛 Troubleshooting

### Issue: "Cannot connect to Supabase"
**Solution:** Check your `.env.local` file has correct credentials

### Issue: "Edge Functions not working locally"
**Solution:** Edge Functions are deployed to Supabase, not running locally. Use the deployed URL.

### Issue: "Environment variables not updating"
**Solution:** 
1. Restart dev server after changing `.env.local`
2. For Netlify, redeploy after changing environment variables

### Issue: "Build fails on Netlify"
**Solution:**
1. Verify all environment variables are set in Netlify dashboard
2. Check `SECRETS_SCAN_OMIT_KEYS` is configured
3. Review build logs for specific errors

---

## 📊 Current Configuration

### Development (Your Local Machine)
```
URL: http://localhost:3000
Supabase: ygfearxmisoabqrkgxvb.supabase.co
Edge Functions: Deployed (not local)
Database: Shared (same as production)
```

### Production (Netlify)
```
URL: https://taskflow-app.netlify.app (or your domain)
Supabase: ygfearxmisoabqrkgxvb.supabase.co
Edge Functions: Deployed
Database: Shared (same as development)
```

> ⚠️ **Note:** Development and production share the same Supabase database. Be careful when testing data operations!

---

## 🎉 Quick Start Commands

```bash
# Fresh setup
cp .env.local.example .env.local
# Edit .env.local with your values
pnpm install
pnpm dev

# Test production build locally
pnpm build
pnpm start

# Deploy to production
git add .
git commit -m "Your changes"
git push origin main
# Netlify auto-deploys
```

---

## 🔗 Related Files

- `next.config.ts` - Next.js configuration
- `netlify.toml` - Netlify build configuration
- `.env.local.example` - Environment template
- `.gitignore` - Excludes `.env.local`

---

## ✅ Checklist

### For Development
- [ ] `.env.local` file exists
- [ ] All credentials filled in
- [ ] Dependencies installed (`pnpm install`)
- [ ] Dev server running (`pnpm dev`)
- [ ] Can access `http://localhost:3000`

### For Production
- [ ] All environment variables set in Netlify
- [ ] `SECRETS_SCAN_OMIT_KEYS` configured
- [ ] Latest code pushed to GitHub
- [ ] Netlify deployment successful
- [ ] App accessible at production URL

---

**You're all set! 🚀**

Start developing with `pnpm dev` and deploy with `git push`!

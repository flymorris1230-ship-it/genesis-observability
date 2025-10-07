# CI/CD Setup Guide

This guide explains how to configure GitHub Actions for automated testing and deployment of **genesis-observability** components.

## 📋 Overview

We have 3 GitHub Actions workflows:

1. **`obs-edge-ci.yml`** - Test and deploy obs-edge Cloudflare Worker
2. **`obs-dashboard-ci.yml`** - Build and deploy obs-dashboard to Vercel
3. **`test.yml`** - Comprehensive testing, linting, and security audits

---

## 🔧 Required GitHub Secrets

### For obs-edge (Cloudflare Workers)

Go to **Settings → Secrets and variables → Actions** and add:

| Secret Name | Description | Where to Find |
|-------------|-------------|---------------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token with Workers deploy permission | [Cloudflare Dashboard](https://dash.cloudflare.com/profile/api-tokens) → Create Token → Edit Cloudflare Workers |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare Account ID | [Cloudflare Dashboard](https://dash.cloudflare.com/) → Workers & Pages → Overview (right sidebar) |

### For obs-dashboard (Vercel)

| Secret Name | Description | Where to Find |
|-------------|-------------|---------------|
| `VERCEL_TOKEN` | Vercel deployment token | [Vercel Settings](https://vercel.com/account/tokens) → Create Token |
| `VERCEL_ORG_ID` | Vercel organization/team ID | Run `vercel link` locally, check `.vercel/project.json` |
| `VERCEL_PROJECT_ID` | Vercel project ID | Run `vercel link` locally, check `.vercel/project.json` |
| `NEXT_PUBLIC_OBS_EDGE_URL` | obs-edge Worker URL | After deploying obs-edge, e.g., `https://obs-edge.YOUR_SUBDOMAIN.workers.dev` |
| `NEXT_PUBLIC_OBS_EDGE_API_KEY` | API key for obs-edge | Your configured API key from Worker |

---

## 🚀 Setup Instructions

### Step 1: Configure Cloudflare Workers

1. **Create API Token**
   ```bash
   # Go to: https://dash.cloudflare.com/profile/api-tokens
   # Click "Create Token"
   # Use "Edit Cloudflare Workers" template
   # Permissions: Account - Workers Scripts - Edit
   ```

2. **Get Account ID**
   ```bash
   # Go to: https://dash.cloudflare.com/
   # Navigate to Workers & Pages
   # Account ID is shown in the right sidebar
   ```

3. **Add Secrets to GitHub**
   ```bash
   # Settings → Secrets and variables → Actions → New repository secret
   # Add CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID
   ```

### Step 2: Configure Vercel Deployment

1. **Link Vercel Project Locally**
   ```bash
   cd apps/obs-dashboard
   npm install -g vercel
   vercel link
   # Follow prompts to link to your Vercel project
   ```

2. **Get Vercel IDs**
   ```bash
   cat .vercel/project.json
   # Copy "orgId" and "projectId"
   ```

3. **Create Vercel Token**
   ```bash
   # Go to: https://vercel.com/account/tokens
   # Create a new token
   # Scope: Full Account or specific project
   ```

4. **Add Secrets to GitHub**
   ```bash
   # Add VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID
   # Also add NEXT_PUBLIC_OBS_EDGE_URL and NEXT_PUBLIC_OBS_EDGE_API_KEY
   ```

### Step 3: Test Workflows Locally (Optional)

Install [act](https://github.com/nektos/act) to test workflows locally:

```bash
# Install act
brew install act

# Test obs-edge workflow
act -j test -W .github/workflows/obs-edge-ci.yml

# Test dashboard workflow
act -j build -W .github/workflows/obs-dashboard-ci.yml

# Test overall test workflow
act -W .github/workflows/test.yml
```

---

## 🔄 Workflow Triggers

### obs-edge-ci.yml

**Triggers:**
- Push to `main` with changes in `apps/obs-edge/**`
- Pull requests to `main` affecting obs-edge

**Jobs:**
- `test` - Runs on every push/PR
- `deploy` - Only on push to main (after tests pass)

### obs-dashboard-ci.yml

**Triggers:**
- Push to `main` with changes in `apps/obs-dashboard/**`
- Pull requests to `main` affecting dashboard

**Jobs:**
- `build` - Runs on every push/PR
- `deploy-vercel` - Only on push to main (after build succeeds)

### test.yml

**Triggers:**
- Push to `main` or `develop`
- Pull requests to `main` or `develop`

**Jobs:**
- `test-monorepo` - Test all projects
- `lint` - Lint and type-check
- `security` - Dependency audit

---

## 📊 Workflow Outputs

### GitHub Actions UI

After each workflow run, you'll see:

- ✅ **Test Results** - Pass/fail status for each test suite
- 📦 **Build Artifacts** - Uploaded build files
- 🔗 **Deployment URLs** - Links to deployed applications
- 📝 **Job Summaries** - Detailed reports in the workflow summary

### Pull Request Comments

For PRs, the dashboard workflow automatically comments with:
- ✅ Build status
- 🔗 Preview deployment URL

---

## 🐛 Troubleshooting

### Cloudflare Deployment Fails

**Error:** `Authentication error`
```bash
# Solution: Verify CLOUDFLARE_API_TOKEN has correct permissions
# Required: Account - Workers Scripts - Edit
```

**Error:** `Account ID not found`
```bash
# Solution: Double-check CLOUDFLARE_ACCOUNT_ID
# Format: 32-character hex string
```

### Vercel Deployment Fails

**Error:** `Project not found`
```bash
# Solution: Verify VERCEL_ORG_ID and VERCEL_PROJECT_ID
# Re-run: vercel link and check .vercel/project.json
```

**Error:** `Invalid token`
```bash
# Solution: Generate new token at https://vercel.com/account/tokens
# Ensure token has deployment permissions
```

### Build Failures

**Error:** `Type check failed`
```bash
# Run locally first:
cd apps/obs-dashboard
npm run type-check

# Fix errors before pushing
```

**Error:** `Environment variable missing`
```bash
# Add missing secrets to GitHub Actions
# Settings → Secrets and variables → Actions
```

---

## 🔒 Security Best Practices

1. **Use Least Privilege**
   - Cloudflare tokens: Only grant Workers deploy permission
   - Vercel tokens: Scope to specific project if possible

2. **Rotate Tokens Regularly**
   - Update tokens every 90 days
   - Revoke old tokens immediately after rotation

3. **Never Commit Secrets**
   - Use `.env.example` for documentation
   - Add `.env` to `.gitignore`
   - Use GitHub Secrets for sensitive values

4. **Audit Dependencies**
   - The `security` job runs `npm audit`
   - Review and fix moderate+ severity issues

---

## 📝 Workflow Customization

### Change Deployment Branch

Edit `obs-edge-ci.yml`:
```yaml
if: github.ref == 'refs/heads/production' && github.event_name == 'push'
```

### Add Environment-Specific Deployments

Add staging deployment:
```yaml
deploy-staging:
  if: github.ref == 'refs/heads/develop'
  # ... staging deployment steps
```

### Enable Auto-Merge

For dependabot PRs:
```yaml
- name: Enable auto-merge
  if: github.actor == 'dependabot[bot]'
  run: gh pr merge --auto --squash
```

---

## ✅ Verification Checklist

After setup, verify:

- [ ] Push to `main` triggers workflows
- [ ] Tests run and pass
- [ ] obs-edge deploys to Cloudflare Workers
- [ ] obs-dashboard deploys to Vercel
- [ ] Deployment URLs are accessible
- [ ] PR checks run correctly
- [ ] Secrets are properly masked in logs
- [ ] Build artifacts are uploaded

---

## 📚 Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Cloudflare Workers CI/CD](https://developers.cloudflare.com/workers/configuration/deploy/)
- [Vercel GitHub Integration](https://vercel.com/docs/deployments/git/vercel-for-github)
- [Wrangler CLI Reference](https://developers.cloudflare.com/workers/wrangler/commands/)

---

**Last Updated:** 2025-10-07
**Maintained By:** Genesis Observability Team

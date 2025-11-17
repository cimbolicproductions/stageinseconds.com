# Branch Protection Rules

This document outlines the recommended branch protection rules for the `main` branch to ensure code quality and maintain a stable production codebase.

## Recommended Settings

### 1. Require Pull Request Before Merging

**Setting**: Require a pull request before merging
- **Required approvals**: 1
- **Dismiss stale pull request approvals when new commits are pushed**: ✅ Enabled
- **Require review from Code Owners**: ⬜ Optional (enable if you have a CODEOWNERS file)
- **Require approval of the most recent reviewable push**: ✅ Enabled

**Purpose**: Ensures all changes are reviewed before merging, maintaining code quality and knowledge sharing.

### 2. Require Status Checks to Pass

**Setting**: Require status checks to pass before merging
- **Require branches to be up to date before merging**: ✅ Enabled

**Required Status Checks**:
- `test` - Test workflow must pass
- `audit` - Security audit workflow must pass

**Purpose**: Ensures all tests pass and no security vulnerabilities are introduced before merging.

### 3. Require Linear History

**Setting**: Require linear history
- ✅ Enabled

**Purpose**: Keeps the git history clean and easy to understand by preventing merge commits. Use "Squash and merge" or "Rebase and merge" strategies.

### 4. Additional Settings

**Require signed commits**: ⬜ Optional (recommended for enhanced security)
- If enabled, all commits must be signed with GPG keys

**Include administrators**: ✅ Enabled
- Apply these rules to repository administrators as well

**Allow force pushes**: ❌ Disabled
- Prevents force pushes that could rewrite history

**Allow deletions**: ❌ Disabled
- Prevents accidental deletion of the main branch

## How to Configure

1. Go to your GitHub repository
2. Navigate to **Settings** → **Branches**
3. Click **Add rule** or edit existing rule for `main`
4. Configure the settings as outlined above
5. Click **Create** or **Save changes**

## GitHub CLI Method

You can also configure branch protection using the GitHub CLI:

```bash
# Install GitHub CLI if not already installed
# https://cli.github.com/

# Configure branch protection for main
gh api repos/{owner}/{repo}/branches/main/protection \
  --method PUT \
  --field required_status_checks='{"strict":true,"contexts":["test","audit"]}' \
  --field enforce_admins=true \
  --field required_pull_request_reviews='{"dismissal_restrictions":{},"dismiss_stale_reviews":true,"require_code_owner_reviews":false,"required_approving_review_count":1,"require_last_push_approval":true}' \
  --field required_linear_history=true \
  --field allow_force_pushes=false \
  --field allow_deletions=false
```

Replace `{owner}` and `{repo}` with your GitHub username/organization and repository name.

## Best Practices

1. **Always create a feature branch** for new work
   ```bash
   git checkout -b feature/my-feature
   ```

2. **Keep your branch up to date** with main
   ```bash
   git fetch origin
   git rebase origin/main
   ```

3. **Use descriptive commit messages** following conventional commits:
   - `feat: add new feature`
   - `fix: resolve bug in authentication`
   - `chore: update dependencies`
   - `docs: update README`

4. **Request reviews** from team members with relevant expertise

5. **Address review feedback** promptly and thoroughly

6. **Squash commits** when merging to keep history clean
   - Use GitHub's "Squash and merge" button

## Emergency Procedures

In case of critical production issues requiring immediate hotfix:

1. Create a hotfix branch from main
2. Make minimal changes to fix the issue
3. Create PR with "hotfix" label
4. Request expedited review
5. Merge and deploy immediately after approval

**Note**: Even in emergencies, do not bypass branch protection. The review process catches errors and maintains quality.

## Review Checklist

Before approving a pull request, ensure:

- [ ] All status checks pass (tests, linting, security)
- [ ] Code follows project style guidelines
- [ ] Changes are well-documented (comments, README updates)
- [ ] No security vulnerabilities introduced
- [ ] Tests cover new functionality
- [ ] No breaking changes (or properly documented)
- [ ] Commit messages are clear and descriptive

## Questions?

If you have questions about branch protection rules or need temporary exceptions, please:

1. Open an issue in the repository
2. Tag it with `question` label
3. Provide context for why the exception is needed

---

**Last Updated**: 2025-11-17
**Document Owner**: Development Team

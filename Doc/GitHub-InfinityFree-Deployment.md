# GitHub + InfinityFree Deployment Plan

## Architecture

- GitHub: private source-of-truth repository and version history.
- InfinityFree: production/demo PHP + MySQL hosting.
- Serena/remote development: intentionally out of scope for this phase.

## Repository safety

Never commit:
- real passwords
- MySQL passwords
- FTP passwords
- API tokens
- production `.env`
- database dumps containing real member data

Use `.env.example` for configuration templates. Production credentials must be entered through the hosting environment/configuration and never stored in Git.

## Deployment flow

`Local Project -> Git commit -> GitHub -> GitHub Actions -> FTP -> InfinityFree`

Database deployment is separate from file deployment. Export/import SQL only when the schema/data change requires it, and keep production credentials outside the repository.

## Current InfinityFree values

- Site: MSPFASProject.lovestoblog.com
- FTP host: ftpupload.net
- FTP port: 21
- MySQL host: sql207.infinityfree.com
- MySQL port: 3306
- MySQL database: if0_42755650_MSPFASProject
- MySQL username: if0_42755650

Passwords are intentionally not documented here.

## Next manual steps

1. Create a private GitHub repository.
2. Add the GitHub repository as `origin` for this project.
3. Push the current code after reviewing untracked project files.
4. Create GitHub Actions secrets for FTP deployment; do not put credentials in workflow YAML.
5. Add a deployment workflow that uploads only production files and excludes `.git`, `.serena`, `Doc`, `database` tooling, local test artifacts, and local-only configuration.
6. Import the prepared production SQL database separately.
7. Configure production database credentials on the hosting side.
8. Deploy and run smoke tests: login, members, requests, procurement, receiving, delivery, payments, reports.

## Rollback

- Code: revert to a known-good Git commit and redeploy.
- Database: restore the corresponding SQL backup. Do not rely on code rollback alone for schema/data changes.
- Keep local backups outside the web root.

# GitHub + InfinityFree Deployment Plan

## Architecture

- GitHub: private source-of-truth repository and version history.
- InfinityFree: production/demo PHP + MySQL hosting.
- Serena/remote development: intentionally out of scope for this phase.

## Repository safety

Never commit real passwords, MySQL passwords, FTP passwords, API tokens, production `.env`, or database dumps containing real member data.

Use `.env.example` for configuration templates. Production credentials must be entered outside Git and never stored in source control.

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

## GitHub Actions setup

The workflow in `.github/workflows/deploy-infinityfree.yml` deploys on pushes to `master` and can also be started manually from the Actions tab.

Create these Repository secrets in GitHub: `INFINITYFREE_FTP_HOST`, `INFINITYFREE_FTP_USERNAME`, and `INFINITYFREE_FTP_PASSWORD`. The workflow uses FTP port 21 and targets `htdocs/`.

Do not put the FTP password in YAML, source files, commits, or chat messages.

## Next manual steps

1. Add the three FTP repository secrets in GitHub.
2. Confirm the InfinityFree FTP document root is `htdocs/`. If the hosting account shows a different document-root path, update `server-dir` before deploying.
3. Push the workflow commit.
4. Watch the GitHub Actions run and confirm files reach the site.
5. Import the prepared production SQL database separately through InfinityFree's database tools/phpMyAdmin.
6. Configure production database credentials outside Git; do not commit the real password.
7. Deploy and run smoke tests: login, members, requests, procurement, receiving, delivery, payments, reports.

## Rollback

- Code: revert to a known-good Git commit and redeploy.
- Database: restore the corresponding SQL backup. Do not rely on code rollback alone for schema/data changes.
- Keep local backups outside the web root.

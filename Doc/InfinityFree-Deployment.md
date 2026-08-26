# InfinityFree Deployment

## Production database

DB_HOST=sql207.infinityfree.com
DB_NAME=if0_42755650_MSPFASProject
DB_USER=if0_42755650
DB_PORT=3306

Enter the real DB password only in the hosting-side configuration. Never commit it.

## FTP

FTP_HOST=ftpupload.net
FTP_PORT=21
FTP_USERNAME=if0_42755650

The FTP password belongs only in the GitHub repository secret `INFINITYFREE_FTP_PASSWORD` and must never be written here.

## Deployment

GitHub Actions workflow: `.github/workflows/deploy-infinityfree.yml`

Required GitHub Repository secrets:

- `INFINITYFREE_FTP_HOST`
- `INFINITYFREE_FTP_USERNAME`
- `INFINITYFREE_FTP_PASSWORD`

The workflow deploys the web application to `htdocs/` and deliberately excludes documentation, database tooling/dumps, local development files, and credentials.

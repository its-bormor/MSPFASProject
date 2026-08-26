# Village Fund Project — Deployment & Recovery Plan

Date: 2026-08-26
Project: ระบบบริหารจัดการโครงการประชารัฐ ปุ๋ย ยา เมล็ดพันธุ์ กองทุนหมู่บ้านแม่ยางตาล อำเภอร้องกวาง จังหวัดแพร่

## 1. Target architecture

Separate two concerns:

1. Public website: PHP + MySQL/MariaDB on ordinary web hosting.
2. Remote development/Serena: a Linux VM with Git, PHP tooling, database tools and Serena. Serena must not be exposed directly without strong authentication.

Recommended first target: Oracle Cloud Free Tier Always Free VM for remote development because it provides persistent compute suitable for Linux services and supports Arm-based Ampere A1 Always Free resources. A separate free PHP/MySQL host such as InfinityFree can be used for a public demo if needed.

## 2. Why not put Serena on ordinary free PHP hosting

Serena requires a real runtime environment, Python/uv and language-server dependencies. Ordinary PHP shared hosting is not a suitable host for Serena. The current Serena project documentation recommends installation through uv and supports a Streamable HTTP MCP mode for remote clients. Remote HTTP exposure must be authenticated and protected.

## 3. Server layout

/opt/village-fund/
  app/              # Git working tree / project
  backups/          # database and release backups; not web-accessible
  scripts/          # deployment and backup scripts
  serena/           # Serena runtime/config if installed separately

Public web root should point only to the application's intended web-accessible files. Configuration secrets must remain outside the public web root.

## 4. Environment

Production values must be provided through environment/configuration, not committed to Git:

DB_HOST
DB_NAME
DB_USER
DB_PASS

Use a dedicated database user with only the permissions required by the application.

## 5. Backup policy

Before every deployment:

- create a full project archive
- create a database dump
- record Git commit/tag
- record PHP and database versions

Keep at least:

- current release
- previous release
- last known-good release

Test restoration periodically, not only creation of backups.

## 6. Recovery

If deployment fails:

1. Put site in maintenance mode.
2. Restore the previous Git release.
3. Restore database only when the migration is not backward-compatible or data corruption occurred.
4. Verify login, requests, payments and reports.
5. Re-open service only after acceptance checks pass.

Never delete the only copy of a database during a migration.

## 7. Serena installation target

Follow the official Serena Quick Start. Current upstream guidance uses uv and Python 3.13:

    uv tool install -p 3.13 serena-agent
    serena init

For a remote MCP server, use Streamable HTTP and bind to localhost first. Put an authenticated reverse proxy/VPN/tunnel in front of it instead of exposing the raw MCP port publicly.

## 8. Remote access strategy

Preferred order:

A. VPN/private network access if available.
B. Authenticated HTTPS reverse proxy/tunnel with a strong secret if a public endpoint is required.
C. Never expose an unauthenticated Serena endpoint.

## 9. Public demo hosting

A free PHP/MySQL host can be used for the web demo, but it is not the remote development server. Shared hosting limitations, upload restrictions, cron availability, database limits and outbound API restrictions must be verified before production use.

## 10. Deployment checklist

- [ ] Server account created
- [ ] Linux VM created
- [ ] SSH key configured
- [ ] Firewall restricted
- [ ] Automatic security updates configured
- [ ] Git repository installed
- [ ] PHP version verified
- [ ] MySQL/MariaDB installed
- [ ] Application database restored
- [ ] Secrets configured outside Git
- [ ] HTTPS configured
- [ ] Upload directory secured
- [ ] Serena installed and initialized
- [ ] Serena remote access authenticated
- [ ] Backup job configured
- [ ] Restore test completed
- [ ] Full application acceptance test completed

## 11. Current known project gaps before production

See `Functional-Requirements-Audit-2026-08-26.md`. In particular:

- statistical charts
- production LINE integration
- explicit KTB 01–05 document/checklist/signature workflow
- end-to-end financial and special-case tests
- fiscal-year closing acceptance test
- responsive acceptance testing
- production security hardening

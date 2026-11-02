# Deploying SMMuper to the Hostinger VPS (Docker + Traefik)

Requirements: VPS with Docker + Traefik (already installed on your template), DNS for
`smmuper.com` and `www.smmuper.com` pointing to the VPS IPv4.

1. Put this project on the server (git clone, or upload the zip and unzip it).
2. `cd deploy && cp .env.example .env` then fill in `.env`
   (or use the generated `smmuper-server.env` as `deploy/.env`).
3. `docker compose -f docker-compose.traefik.yml up -d --build`
4. Open https://smmuper.com and log in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`.
   Traefik requests the HTTPS certificate automatically once DNS points to the VPS.

Useful commands (run in `deploy/`):
- Logs: `docker compose -f docker-compose.traefik.yml logs -f web`
- Update after code changes: `docker compose -f docker-compose.traefik.yml up -d --build`
- Backup the database: the worker writes backups to the `smmuper-backups` volume.

Security notes: the app listens only inside Docker (port 5000 is not published);
change the admin password from the admin panel after first login; never commit `deploy/.env`.

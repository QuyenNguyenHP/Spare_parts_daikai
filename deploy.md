# Development and deployment

Updated: 2026-10-12. Commands below run in Bash on Ubuntu/Debian (or WSL for development).

Examples use account `r1-edu`, repository `/home/r1-edu/Spare_parts_daikai`, and domain `parts.example.com`. Replace the domain everywhere with your actual domain. Adjust the account and paths if deploying on another machine. The repository must already be checked out at that path, including the required `backend/data` drawings, images, and manuals.

## 1. Install dependencies

```bash
sudo apt update
sudo apt install python3 python3-venv python3-pip nodejs npm
cd /home/r1-edu/Spare_parts_daikai
python3 -m venv .venv
.venv/bin/python -m pip install -r backend/requirements.txt
node --version
npm --version
npm --prefix frontend ci
```

Use a maintained Node.js LTS release supported by the versions in `frontend/package-lock.json`. If the distribution's Node version does not meet the package engine requirements, update Node before running `npm ci`. Create the virtual environment on the target machine; do not copy a Windows virtual environment to Linux. Optional drawing OCR tools also require `tesseract-ocr`.

## 2. Application settings and data

Edit the project-root `.env`; preserve any existing settings:

```bash
cd /home/r1-edu/Spare_parts_daikai
touch .env
chmod 600 .env
nano .env
```

For a fresh installation, set initial administrator credentials before the first login:

```dotenv
SPARE_PARTS_USERNAME=admin
SPARE_PARTS_PASSWORD=REPLACE_WITH_A_STRONG_PASSWORD
```

These variables initialize a new `backend/data/admin-settings.json`; they do not reset an existing user's password. Existing accounts use Account > Change password or the administration page.

For email delivery, add your own SMTP settings:

```dotenv
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_STARTTLS=true
SMTP_USE_SSL=false
SMTP_USERNAME=your-mailbox@example.com
SMTP_FROM_EMAIL=your-mailbox@example.com
SMTP_PASSWORD=REPLACE_WITH_YOUR_APP_PASSWORD
```

The backend automatically loads this `.env` with override enabled, so it takes precedence over inherited variables with the same names. No systemd `EnvironmentFile` is needed. Keep credentials out of Git and the frontend build. Configure sales recipients in Account > Administration.

The service account needs read access to the repository and write access to `backend/data`. Preserve this directory across updates, especially `admin-settings.json`, `saved-orders.json`, and `requests/`. Do not publish the repository or `.env` as Apache's document root; only publish `frontend/dist`.

## 3. Run for development

In terminal 1:

```bash
cd /home/r1-edu/Spare_parts_daikai
.venv/bin/python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

In terminal 2:

```bash
cd /home/r1-edu/Spare_parts_daikai
VITE_API_URL=/api npm --prefix frontend run dev -- --host 127.0.0.1
```

Open `http://localhost:5173`. Vite proxies `/api` to `http://127.0.0.1:8000`, as configured in `frontend/vite.config.js`. API documentation is at `http://127.0.0.1:8000/docs`.

If developing on a remote server, forward the frontend port from your workstation:

```bash
ssh -L 5173:127.0.0.1:5173 r1-edu@daikai
```

Then open `http://localhost:5173` on your workstation. Do not run a development backend alongside production on the same port. Stop the production service only during an intended maintenance period, or use a separate checkout, data directory, backend port, and matching Vite proxy configuration.

## 4. Deploy the backend as a system service

The production unit is `/etc/systemd/system/spare-parts-backend.service`. Manage it with `sudo systemctl`, not `systemctl --user`. System and user units are separate even when their names match. A system service enabled below starts at boot without a user login.

### Check for an existing listener

```bash
sudo ss -ltnp 'sport = :8000'
sudo systemctl status spare-parts-backend.service
sudo systemctl cat spare-parts-backend.service
```

If another process owns port 8000, replace `PID` below with the reported number:

```bash
ps -ww -p PID -o pid,ppid,user,args
sudo systemctl status PID
systemctl --user status PID
```

Stop an identified development process using Ctrl+C in its terminal. If an old user unit exists, disable it before switching to the system unit:

```bash
systemctl --user disable --now spare-parts-backend.service
systemctl --user daemon-reload
```

Skip those two commands if there is no user unit. Do not stop an unrelated process just because it occupies port 8000.

### Install or update the unit

Back up the existing unit if present, then edit it:

```bash
if sudo test -f /etc/systemd/system/spare-parts-backend.service; then
  sudo cp -a /etc/systemd/system/spare-parts-backend.service "/etc/systemd/system/spare-parts-backend.service.bak.$(date +%Y%m%d-%H%M%S)"
fi
sudo nano /etc/systemd/system/spare-parts-backend.service
```

Use this content:

```ini
[Unit]
Description=Spare Parts Daikai backend API
Wants=network-online.target
After=network-online.target

[Service]
Type=simple
User=r1-edu
WorkingDirectory=/home/r1-edu/Spare_parts_daikai
Environment=PYTHONUNBUFFERED=1
ExecStart=/home/r1-edu/Spare_parts_daikai/.venv/bin/uvicorn backend.main:app --host 127.0.0.1 --port 8000 --workers 1 --proxy-headers --forwarded-allow-ips=127.0.0.1
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Keep **one worker**: authentication sessions are currently stored in process memory, and application data uses JSON files. Multiple workers would not share login sessions. The backend listens only on loopback because Apache is on the same machine.

Validate, reload, enable, and restart:

```bash
sudo systemd-analyze verify /etc/systemd/system/spare-parts-backend.service
sudo systemctl daemon-reload
sudo systemctl enable spare-parts-backend.service
sudo systemctl restart spare-parts-backend.service
sudo systemctl status spare-parts-backend.service --no-pager
curl --fail http://127.0.0.1:8000/api/health
```

`daemon-reload` is required after editing the unit. A restart is required after changing backend code or `.env`. Restarting the backend clears login sessions; users must sign in again.

## 5. Build and publish the frontend

```bash
sudo apt install apache2 rsync
cd /home/r1-edu/Spare_parts_daikai
npm --prefix frontend ci
VITE_API_URL=/api npm --prefix frontend run build
sudo install -d -m 755 /var/www/spare-parts
sudo rsync -a --chmod=D755,F644 frontend/dist/ /var/www/spare-parts/
```

Proceed with the copy only if the build succeeds. The trailing slash on `frontend/dist/` copies its contents. Existing hashed assets are retained so already-open browser tabs can finish loading during an update.

`VITE_API_URL=/api` is embedded at build time. It makes the browser call the same domain as the frontend, avoiding a separate production CORS configuration. Do not set it to `http://localhost:8000`: that would refer to each visitor's computer. Production runs from the built files; neither `npm run dev` nor `vite preview` is needed. See [Vite's static deployment guide](https://vite.dev/guide/static-deploy.html).

## 6. Configure Apache2 for your domain

Point the domain's DNS A record to the server's reachable IPv4 address. Set an AAAA record only if IPv6 reaches this server too. For a LAN-only deployment, use your internal DNS. Allow TCP 80 and 443 through the applicable firewall/router; keep port 8000 private. If UFW is already active, allow the Apache profile:

```bash
sudo ufw allow 'Apache Full'
```

Enable the required modules and create a dedicated site:

```bash
sudo a2enmod proxy proxy_http headers
sudo nano /etc/apache2/sites-available/spare-parts.conf
```

Replace `parts.example.com` in this configuration:

```apache
<VirtualHost *:80>
    ServerName parts.example.com
    DocumentRoot /var/www/spare-parts

    ProxyRequests Off
    ProxyPreserveHost On
    ProxyPass        /api/ http://127.0.0.1:8000/api/ timeout=120
    ProxyPassReverse /api/ http://127.0.0.1:8000/api/

    <Directory /var/www/spare-parts>
        Options -Indexes
        AllowOverride None
        Require all granted
        DirectoryIndex index.html
        FallbackResource /index.html
    </Directory>

    <Files "index.html">
        Header set Cache-Control "no-cache"
    </Files>

    ErrorLog ${APACHE_LOG_DIR}/spare-parts-error.log
    CustomLog ${APACHE_LOG_DIR}/spare-parts-access.log combined
</VirtualHost>
```

Apache serves the frontend and forwards `/api/` requests while preserving that prefix. `ProxyPassReverse` adjusts backend redirect headers; `FallbackResource` supports frontend routes. See [Apache reverse proxy configuration](https://httpd.apache.org/docs/2.4/mod/mod_proxy.html) and [FallbackResource](https://httpd.apache.org/docs/current/en/mod/mod_dir.html#fallbackresource).

Enable and check the site before reloading:

```bash
sudo a2ensite spare-parts.conf
sudo apache2ctl configtest
sudo systemctl enable --now apache2
sudo systemctl reload apache2
curl --fail -I -H 'Host: parts.example.com' http://127.0.0.1/
curl --fail -H 'Host: parts.example.com' http://127.0.0.1/api/health
```

Reload only when `configtest` reports `Syntax OK`. Keep unrelated Apache sites enabled. Use `sudo apache2ctl -S` to check which virtual host handles the domain.

## 7. Enable HTTPS

For a public domain resolving to this server, first confirm the HTTP site is reachable externally on port 80. On Ubuntu/Debian with distribution-packaged Certbot:

```bash
sudo apt install certbot python3-certbot-apache
sudo certbot --apache -d parts.example.com --redirect
```

Certbot creates/configures the HTTPS virtual host. Inspect the generated port-443 site and ensure it retains the document root, directory rules, and both `/api/` proxy directives. Inside that HTTPS `<VirtualHost *:443>`, add:

```apache
RequestHeader set X-Forwarded-Proto "https"
```

Then validate and check renewal:

```bash
sudo apache2ctl configtest
sudo systemctl reload apache2
sudo certbot renew --dry-run
systemctl list-timers --all | grep -i certbot
curl --fail https://parts.example.com/api/health
```

Confirm the installed Certbot package has a renewal timer or cron job. For an internal-only domain, use your organization's certificate and trust chain, or DNS validation for a domain you own; the HTTP certificate workflow requires public reachability. See [Certbot's Apache instructions](https://certbot.eff.org/instructions?ws=apache&os=pip) for validation requirements and alternative installation methods.

## 8. Deploy later updates

Use a maintenance window for backend updates. Back up runtime data while the backend is stopped, and keep the backup private:

```bash
cd /home/r1-edu/Spare_parts_daikai
git status --short
sudo systemctl stop spare-parts-backend.service
umask 077
mkdir -p /home/r1-edu/spare-parts-backups
tar -czf "/home/r1-edu/spare-parts-backups/data-$(date +%Y%m%d-%H%M%S).tar.gz" backend/data .env
git pull --ff-only
.venv/bin/python -m pip install -r backend/requirements.txt
npm --prefix frontend ci
VITE_API_URL=/api npm --prefix frontend run build
sudo rsync -a --chmod=D755,F644 frontend/dist/ /var/www/spare-parts/
sudo systemctl restart spare-parts-backend.service
curl --fail http://127.0.0.1:8000/api/health
curl --fail https://parts.example.com/api/health
```

Run each step only after the previous one succeeds. Resolve local source changes before pulling; do not overwrite runtime data or credentials. If a step fails, stop deployment, inspect the error, and restore the previous known-good code/dependencies if needed before restarting. Run `sudo systemctl daemon-reload` before restarting only when the unit changed. Static frontend changes need a rebuild/copy, but do not require an Apache restart. Apache configuration changes require a config test and reload.

After deployment, sign in again if the backend restarted. Check the `Spare Part Portal` login heading, create a test user without vessels/engines, and confirm drawing images and PDF downloads work. Test email delivery only with intended test recipients.

## 9. Troubleshooting commands

### Service state and logs

```bash
sudo systemctl status spare-parts-backend.service --no-pager
sudo systemctl cat spare-parts-backend.service
sudo journalctl -u spare-parts-backend.service -n 100 --no-pager
sudo journalctl -u spare-parts-backend.service -f
```

### Unit not found after daemon-reload

```bash
sudo ls -l /etc/systemd/system/spare-parts-backend.service
sudo systemctl list-unit-files | grep -i spare
systemctl --user list-unit-files | grep -i spare
```

`/etc/systemd/system/` is the system manager's unit directory. `~/.config/systemd/user/` belongs to the user manager. Use the matching manager. A missing file or broken symlink may appear loaded from cache until `daemon-reload`; restore the file in the correct directory, reload that manager, and restart. Use the singular suffix `.service`.

### Port 8000 already in use or backend startup failed

```bash
sudo ss -ltnp 'sport = :8000'
sudo journalctl -u spare-parts-backend.service -n 100 --no-pager
```

Identify the owner using the PID commands in section 4. A Python process may be an existing backend started manually or by another unit. The journal traceback explains startup failures; an exit status alone does not identify their cause. For `Permission denied`, check the service account's access to `.env`, `.venv`, and `backend/data`.

### Apache 502/503, wrong site, or stale frontend

```bash
curl --fail http://127.0.0.1:8000/api/health
sudo apache2ctl configtest
sudo apache2ctl -S
sudo tail -n 100 /var/log/apache2/spare-parts-error.log
```

If the direct backend check fails, fix the backend first. If it succeeds, inspect the active domain virtual host and `/api/` proxy rules, including the HTTPS virtual host. If API requests return HTML instead of JSON, confirm the proxy handles `/api/` before the frontend fallback. If the browser still shows old content, rebuild/copy the frontend and hard-refresh with Ctrl+Shift+R. A 403 after a backend restart can mean an expired session: sign out and sign in again.

This guide has been checked against the repository configuration; the commands have not been executed on the deployment server.

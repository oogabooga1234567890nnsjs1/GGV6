# GGV6

Run the site locally with the authentication server:

```bash
cd /workspaces/GGV6 && node server.js
```

Then open:

```text
http://localhost:4000
```

Accounts are stored in `data/users.json`, while active login sessions live in the running server process. For people on different computers to use the same site, deploy this project to a server with a public URL and share that URL. Do not use `python3 -m http.server` for the account features because it cannot process sign-ups or logins.

## Safe local reverse proxy

Run the fixed-target proxy in a second terminal:

```bash
cd /workspaces/GGV6 && node proxy-server.js
```

Open `http://localhost:4100`. The proxy forwards only to this project's server at `127.0.0.1:4000`; it does not accept arbitrary destinations. Its health check is available at `http://localhost:4100/__proxy/health`.
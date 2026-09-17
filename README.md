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
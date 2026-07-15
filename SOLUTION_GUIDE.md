# CosmicLuck.gg 502 Bad Gateway — Fix Guide (Dokploy)

## Overview
CosmicLuck.gg resolves to `132.145.140.111` (Oracle Cloud, Ashburn VA).
The site is deployed on **Dokploy** (self-hosted PaaS using Docker containers).
A reverse proxy (likely Traefik or nginx via Dokploy) is responding but the **Docker container running your app is either crashed, unhealthy, or not responding**.

---

## Step 1: Access Dokploy Dashboard

Open your Dokploy admin panel in a browser — usually at:
```
http://<your-server-ip>:3000
```
or the domain you configured for Dokploy.

Check if the application shows:
- **Status: Running** → if yes, skip to Step 3
- **Status: Stopped / Error / Restarting** → go to Step 2

---

## Step 2: Restart from Dokploy Dashboard

In the Dokploy UI for your application:
1. Click **"Deploy"** or **"Redeploy"** button
2. Wait for the deployment to complete
3. Check the **Deployment Logs** tab for errors during build/start

### Alternatively, restart via SSH:

```bash
# SSH into the server
ssh opc@132.145.140.111

# List all Docker containers
docker ps -a | grep cosmicluck

# Check container status
docker inspect <container-id> --format '{{.State.Status}}'

# View container logs (most important step!)
docker logs <container-id> --tail 100

# Restart the container
docker restart <container-id>

# Or if using docker-compose via Dokploy
cd /path/to/dokploy/applications/cosmicluck
docker-compose restart
```

---

## Step 3: Check Container Logs for Errors

This is the **most critical step**. The 502 means the proxy can't reach the app inside the container. Run:

```bash
docker logs <container-id> --tail 200
```

### Common errors to look for:

| Error | Meaning | Fix |
|-------|---------|-----|
| `Error: listen EADDRINUSE` | Port conflict inside container | Check your app's port config |
| `Error: connect ECONNREFUSED 127.0.0.1:3306` | Can't connect to MySQL/DB | Check DB_HOST env var, ensure DB container is running |
| `Error: Module not found` | Missing npm dependency | Rebuild the Docker image |
| `Killed` / `Exit code 137` | Out of memory (OOM) | Increase container memory limit in Dokploy |
| `sharp: Installation error` | Native module build failure | Adjust Dockerfile or use Node 18+ |
| `Error: Cannot find module '...'` | Missing dependency | Run `npm install` inside container or rebuild |

---

## Step 4: Check if the App is Binding to the Right Address

Inside Docker, your app MUST listen on `0.0.0.0` (not `127.0.0.1` or `localhost`).

```bash
# Check what the app is binding to
docker exec <container-id> netstat -tlnp 2>/dev/null || docker exec <container-id> ss -tlnp

# Or check the app logs for what port it starts on
docker logs <container-id> | grep -i "listening\|port\|started"
```

**If your `app.js` has:**
```js
app.listen(3000);              // ❌ Binds to 127.0.0.1:3000 by default
```
**Change it to:**
```js
app.listen(3000, '0.0.0.0');  // ✅ Binds to all interfaces
```

Then rebuild/redeploy.

---

## Step 5: Check Dokploy Configuration

In Dokploy dashboard, verify these settings for your application:

1. **Port mapping** — The internal container port must match your app's port (e.g., `3000`)
2. **Health check** — If configured, ensure the health check endpoint exists and responds `200 OK`
3. **Environment variables** — Verify `NODE_ENV`, `DATABASE_URL`, `DB_HOST`, etc. are set correctly
4. **Memory limit** — If too low, the container will be OOM-killed

---

## Step 6: Check Dependent Services (Database, Redis, etc.)

```bash
# List all running containers
docker ps

# Check if your database container is running
docker ps | grep -E "mysql|mariadb|postgres|redis"

# Check database container logs
docker logs <db-container-id> --tail 20

# Test DB connectivity from inside your app container
docker exec <app-container-id> ping <db-container-name>
docker exec <app-container-id> curl http://<db-container-name>:3306
```

---

## Step 7: Quick Fix — Full Redeploy

1. In Dokploy dashboard, go to your application
2. Click **"Redeploy"** (this rebuilds the Docker image and restarts)
3. Watch the **Deployment Logs** for any build/start errors
4. Once done, check status and test:

```bash
curl -I https://cosmicluck.gg/
```

---

## Step 8: If Still Broken — Rebuild Locally & Debug

If the Dokploy dashboard doesn't show enough detail:

```bash
# SSH into server
ssh opc@132.145.140.111

# Find your Docker compose or Dokploy config
find / -name "docker-compose.yml" -path "*cosmicluck*" 2>/dev/null
find / -name "Dockerfile" -path "*cosmicluck*" 2>/dev/null

# View the Dockerfile
cat /path/to/cosmicluck/Dockerfile

# Manually rebuild and test
cd /path/to/cosmicluck
docker build -t cosmicluck-test .
docker run -p 3000:3000 --env-file .env cosmicluck-test
```

---

## Most Likely Cause on Dokploy

1. **Container crashed on startup** — due to DB connection failure, missing env vars, or port conflict
2. **App binds to `127.0.0.1` instead of `0.0.0.0`** — Docker can't route traffic to it
3. **OOM kill** — container needs more memory
4. **Health check failing** — Dokploy marks it as unhealthy and stops routing

### Quickstart SSH Fix:

```bash
ssh opc@132.145.140.111

# 1. Find the container
docker ps -a | head -20

# 2. Check logs
docker logs <container-id> --tail 50

# 3. Restart it
docker restart <container-id>

# 4. Check if it's listening
docker exec <container-id> ss -tlnp
#!/bin/bash
# One-shot fix for CosmicLuck.gg 502 on Dokploy
# Run this on the Dokploy server via SSH or Dokploy terminal

set -e

echo "========================================="
echo " CosmicLuck.gg 502 Fix Script (Dokploy)"
echo "========================================="
echo ""

# 1. Find the cosmicluck container
CONTAINER=$(docker ps -a --format '{{.ID}} {{.Names}} {{.Image}}' | grep -i "cosmicluck\|vadedcasino" | head -1 | awk '{print $1}')

if [ -z "$CONTAINER" ]; then
    echo "❌ No cosmicluck container found."
    echo "   Available containers:"
    docker ps -a --format 'table {{.ID}}\t{{.Names}}\t{{.Status}}' | head -20
    exit 1
fi

CONTAINER_NAME=$(docker inspect $CONTAINER --format '{{.Name}}' | sed 's/\///')
echo "✅ Found container: $CONTAINER_NAME ($CONTAINER)"

# 2. Show container status
STATUS=$(docker inspect $CONTAINER --format '{{.State.Status}}')
HEALTH=$(docker inspect $CONTAINER --format '{{.State.Health.Status}}' 2>/dev/null || echo "N/A")
echo "   Status: $STATUS | Health: $HEALTH"
echo ""

# 3. Check if container is OOMKilled
OOM=$(docker inspect $CONTAINER --format '{{.State.OOMKilled}}')
EXIT_CODE=$(docker inspect $CONTAINER --format '{{.State.ExitCode}}')
if [ "$OOM" = "true" ]; then
    echo "⚠️  Container was OOMKilled (exit code $EXIT_CODE) — OUT OF MEMORY!"
    echo "   → Increase memory limit in Dokploy settings"
    echo ""
fi

# 4. Show recent logs with error highlights
echo "--- Last 50 lines of container logs ---"
docker logs $CONTAINER --tail 50 2>&1 || echo "(no logs available)"
echo ""

# 5. Check for common error patterns in logs
LOGS=$(docker logs $CONTAINER --tail 100 2>&1 || true)

if echo "$LOGS" | grep -qi "ECONNREFUSED\|ER_ACCESS_DENIED\|connect ETIMEDOUT.*3306\|connect ECONNREFUSED.*3306"; then
    echo "⚠️  DETECTED: Database connection error!"
    echo "   → Check if MySQL/MariaDB container is running:"
    docker ps | grep -E "mysql|mariadb|postgres" || echo "   → No database container found running!"
    echo "   → Check DB_HOST env var (should be container name, not localhost)"
    docker inspect $CONTAINER --format '{{range .Config.Env}}{{println .}}{{end}}' 2>/dev/null | grep -i "DB_HOST\|DATABASE_URL\|MYSQL"
    echo ""
elif echo "$LOGS" | grep -qi "EADDRINUSE"; then
    echo "⚠️  DETECTED: Port conflict (EADDRINUSE)"
    echo ""
elif echo "$LOGS" | grep -qi "Module not found\|Cannot find module"; then
    echo "⚠️  DETECTED: Missing npm dependencies"
    echo "   → Need to rebuild Docker image"
    echo ""
elif echo "$LOGS" | grep -qi "Killed\|exit code 137\|exit code 139"; then
    echo "⚠️  DETECTED: Container was killed (OOM or signal)"
    echo "   → Increase memory limit in Dokploy"
    echo ""
fi

# 6. Check what port the app binds to inside container
echo "--- Checking app listening address ---"
BIND=$(docker exec $CONTAINER sh -c "ss -tlnp 2>/dev/null || netstat -tlnp 2>/dev/null || echo 'no net tools'" 2>&1 || echo "exec failed")
echo "$BIND"

if echo "$BIND" | grep -q "127.0.0.1:"; then
    echo "⚠️  WARNING: App is binding to 127.0.0.1 — needs to bind to 0.0.0.0 inside Docker!"
    echo "   → Fix in app.js: change app.listen(port) to app.listen(port, '0.0.0.0')"
    echo ""
fi
echo ""

# 7. Check if container is not running — restart it
if [ "$STATUS" != "running" ]; then
    echo "--- Container is not running. Restarting... ---"
    docker start $CONTAINER || docker restart $CONTAINER
    sleep 3
    
    NEW_STATUS=$(docker inspect $CONTAINER --format '{{.State.Status}}')
    if [ "$NEW_STATUS" = "running" ]; then
        echo "✅ Container is now running!"
    else
        echo "❌ Container failed to start. Check logs above for errors."
        exit 1
    fi
    echo ""
fi

# 8. Verify it's listening
echo "--- Verifying app is listening ---"
sleep 2
docker exec $CONTAINER sh -c "ss -tlnp 2>/dev/null || netstat -tlnp 2>/dev/null" 2>&1 || echo "  (could not verify)"

# 9. Test internal response
echo ""
echo "--- Testing app response from inside container ---"
APP_PORT=$(docker inspect $CONTAINER --format '{{range .Config.Env}}{{if eq "PORT" (slice . 0 4)}}{{slice . 5}}{{end}}{{end}}' 2>/dev/null)
if [ -z "$APP_PORT" ]; then
    APP_PORT="3000"
fi

HTTP_CODE=$(docker exec $CONTAINER sh -c "wget -qO- --timeout=5 http://127.0.0.1:$APP_PORT/ 2>/dev/null || curl -s -o /dev/null -w '%{http_code}' --max-time 5 http://127.0.0.1:$APP_PORT/ 2>/dev/null || echo 'failed'" 2>&1 || echo "failed")

if [ "$HTTP_CODE" = "failed" ] || [ -z "$HTTP_CODE" ]; then
    echo "⚠️  Could not verify internal HTTP response (no curl/wget in container)"
else
    echo "   Internal HTTP status: $HTTP_CODE"
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "301" ] || [ "$HTTP_CODE" = "302" ]; then
        echo "✅ App is responding correctly internally!"
    else
        echo "⚠️  App returned $HTTP_CODE — may still be unhealthy"
    fi
fi

echo ""
echo "========================================="
echo " Done! Test externally with:"
echo "   curl -I https://cosmicluck.gg/"
echo "========================================="
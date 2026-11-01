#!/usr/bin/env bash
# Serve the games at http://localhost:8777 — handy for testing and for playing
# on another device on the same wifi. The games also work by just opening
# index.html directly, no server needed.
set -euo pipefail
PORT="${1:-8777}"
cd "$(dirname "$0")"
echo "Aisha's Games → http://localhost:${PORT}/  (ctrl-c to stop)"
exec python3 -m http.server "$PORT"

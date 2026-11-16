#!/usr/bin/env bash
# Branch-aware local Jekyll preview.
#
# Each git branch gets a deterministic local port (4000-4099) derived from its
# name, so multiple branches/worktrees can be previewed side by side without
# port collisions. Override with PORT=... if needed.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo detached)"
safe_branch="${branch//[^a-zA-Z0-9._-]/-}"

image="${JEKYLL_IMAGE:-23skdu-jekyll:local}"

if [[ -n "${PORT:-}" ]]; then
  port="$PORT"
else
  hash="$(printf '%s' "$branch" | cksum | awk '{print $1}')"
  port=$((4000 + (hash % 100)))
  # Avoid clashing with a port already in use.
  while ss -ltn 2>/dev/null | awk '{print $4}' | grep -qE "[:.]${port}$"; do
    port=$((port + 1))
    if (( port > 4099 )); then
      echo "No free port in 4000-4099" >&2
      exit 1
    fi
  done
fi

echo "Building Jekyll image (cached)..."
docker build -t "$image" -f "$ROOT_DIR/Dockerfile" "$ROOT_DIR" >/dev/null

container="jekyll-${safe_branch}"
docker rm -f "$container" >/dev/null 2>&1 || true

echo "Serving branch '${branch}' at http://localhost:${port}"
docker run --rm --name "$container" \
  -p "${port}:4000" \
  -v "$ROOT_DIR:/srv/jekyll" \
  "$image"

#!/usr/bin/env bash
set -euo pipefail
branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo detached)"
hash="$(printf '%s' "$branch" | cksum | awk '{print $1}')"
echo $((4000 + (hash % 100)))

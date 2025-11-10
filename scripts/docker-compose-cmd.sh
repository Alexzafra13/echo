#!/usr/bin/env bash

# Helper script to detect docker compose command
# Returns "docker compose" or "docker-compose" depending on what's available

if docker compose version &> /dev/null 2>&1; then
  echo "docker compose"
elif command -v docker-compose &> /dev/null; then
  echo "docker-compose"
else
  echo "Error: Docker Compose not found" >&2
  exit 1
fi

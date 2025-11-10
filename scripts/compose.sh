#!/usr/bin/env bash

# Wrapper script for docker compose commands
# Auto-detects whether to use "docker compose" or "docker-compose"

set -e

# Detect which command to use
if docker compose version &> /dev/null 2>&1; then
  COMPOSE_CMD="docker compose"
elif command -v docker-compose &> /dev/null; then
  COMPOSE_CMD="docker-compose"
else
  echo "Error: Docker Compose not found"
  echo "Install with: sudo apt install docker-compose-plugin (Ubuntu)"
  echo "Or install Docker Desktop from: https://docker.com"
  exit 1
fi

# Change to server directory
cd server

# Execute the compose command with all arguments
$COMPOSE_CMD "$@"

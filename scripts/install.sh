#!/usr/bin/env bash

# ============================================
# Echo Music Server - Bare-Metal Installer
# ============================================
# Installs Echo without Docker on Linux systems.
#
# Supported: Debian/Ubuntu, Fedora/RHEL, Arch Linux
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/Alexzafra13/echo/main/scripts/install.sh | sudo bash
#
# Or locally:
#   sudo ./scripts/install.sh
#
# Update:
#   sudo ./scripts/install.sh --update
#
# Uninstall:
#   sudo ./scripts/install.sh --uninstall
# ============================================

set -euo pipefail

# ============================================
# Configuration
# ============================================
# Run as the user who invoked sudo (not root)
ECHO_USER="${SUDO_USER:-$(whoami)}"
ECHO_GROUP="$(id -gn "$ECHO_USER")"
INSTALL_DIR="/opt/echo"
DATA_DIR="/var/lib/echo"
MUSIC_DIR="/srv/music"
PORT=4567
NODE_MAJOR=22
PNPM_VERSION="10.18.3"

# Generated during install
DB_PASSWORD=""
REDIS_PASSWORD=""
JWT_SECRET=""
JWT_REFRESH_SECRET=""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
ORANGE='\033[38;5;209m'
BOLD='\033[1m'
NC='\033[0m'

# ============================================
# Helper functions
# ============================================
log_info()    { echo -e "${BLUE}[INFO]${NC}    $1"; }
log_success() { echo -e "${GREEN}[OK]${NC}      $1"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC}    $1"; }
log_error()   { echo -e "${RED}[ERROR]${NC}   $1" >&2; }

abort() {
  log_error "$1"
  exit 1
}

# Prompt that works when script is piped via `curl | sudo bash`.
# Reads from /dev/tty if stdin is not a terminal. Falls back to $2 when
# no terminal is available (or when ECHO_ASSUME_YES=1 is set).
prompt_confirm() {
  local prompt="$1"
  local default="${2:-}"

  if [ "${ECHO_ASSUME_YES:-0}" = "1" ] && [ -n "$default" ]; then
    REPLY="$default"
    echo "${prompt}${default} (ECHO_ASSUME_YES)"
    return 0
  fi

  if [ -t 0 ]; then
    read -p "$prompt" -r
  elif [ -r /dev/tty ]; then
    read -p "$prompt" -r < /dev/tty
  else
    REPLY="$default"
    echo "${prompt}${default:-<no default>} (non-interactive)"
  fi
  REPLY="${REPLY:-$default}"
}

# Run a command with a spinner + elapsed-time indicator. Captures output
# to a temp file and only prints it on failure. Keeps the screen tidy
# during long pnpm install/build steps.
run_with_spinner() {
  local label="$1"; shift
  local log_file
  log_file=$(mktemp)
  local start=$SECONDS
  local rc=0

  ( "$@" ) >"$log_file" 2>&1 &
  local pid=$!

  if [ -t 1 ]; then
    local frames=('-' '\' '|' '/')
    local i=0
    while kill -0 "$pid" 2>/dev/null; do
      local elapsed=$((SECONDS - start))
      printf "\r\033[K  ${BLUE}[%s]${NC}    %s (%ds)" "${frames[$((i % 4))]}" "$label" "$elapsed"
      i=$((i + 1))
      sleep 0.2
    done
    printf "\r\033[K"
  fi

  wait "$pid" || rc=$?
  local elapsed=$((SECONDS - start))

  if [ $rc -ne 0 ]; then
    log_error "$label failed after ${elapsed}s"
    echo "---- output ----" >&2
    cat "$log_file" >&2
    echo "----------------" >&2
    rm -f "$log_file"
    return $rc
  fi

  rm -f "$log_file"
  log_success "$label (${elapsed}s)"
  return 0
}

need_root() {
  if [ "$(id -u)" -ne 0 ]; then
    abort "This script must be run as root. Use: sudo $0"
  fi
}

gen_password() {
  head -c 32 /dev/urandom | base64 | tr -d '\n/+='
}

# ============================================
# Preflight checks
# ============================================
preflight_checks() {
  log_info "Running preflight checks..."

  local arch
  arch=$(uname -m)
  case "$arch" in
    x86_64|aarch64|arm64) ;;
    *) abort "Unsupported architecture: $arch. Supported: x86_64, aarch64." ;;
  esac
  log_success "Architecture: $arch"

  local install_parent
  install_parent=$(dirname "$INSTALL_DIR")
  local available_kb
  available_kb=$(df -k "$install_parent" 2>/dev/null | awk 'NR==2 {print $4}')
  if [ -n "$available_kb" ] && [ "$available_kb" -lt 1048576 ]; then
    abort "Not enough disk space. Need at least 1GB free in $install_parent (available: $((available_kb / 1024))MB)"
  fi
  log_success "Disk space: $((available_kb / 1024))MB available"

  local total_mem_kb
  total_mem_kb=$(grep MemTotal /proc/meminfo 2>/dev/null | awk '{print $2}')
  if [ -n "$total_mem_kb" ] && [ "$total_mem_kb" -lt 1048576 ]; then
    log_warn "Less than 1GB RAM detected ($((total_mem_kb / 1024))MB). Echo may run slowly."
  else
    log_success "Memory: $((total_mem_kb / 1024))MB"
  fi

  log_success "Will run as user: $ECHO_USER ($ECHO_GROUP)"
}

# ============================================
# Detect distro
# ============================================
detect_distro() {
  if [ -f /etc/os-release ]; then
    . /etc/os-release
    DISTRO_ID="$ID"
    DISTRO_LIKE="${ID_LIKE:-$ID}"
    DISTRO_NAME="${PRETTY_NAME:-$ID}"
  else
    abort "Cannot detect Linux distribution. /etc/os-release not found."
  fi

  case "$DISTRO_ID" in
    ubuntu|debian|raspbian|linuxmint|pop)
      PKG_FAMILY="debian" ;;
    fedora|rhel|centos|rocky|alma)
      PKG_FAMILY="fedora" ;;
    arch|manjaro|endeavouros)
      PKG_FAMILY="arch" ;;
    *)
      case "$DISTRO_LIKE" in
        *debian*|*ubuntu*) PKG_FAMILY="debian" ;;
        *fedora*|*rhel*)   PKG_FAMILY="fedora" ;;
        *arch*)            PKG_FAMILY="arch" ;;
        *) abort "Unsupported distribution: $DISTRO_NAME" ;;
      esac
      ;;
  esac

  log_info "Detected: $DISTRO_NAME ($PKG_FAMILY family)"
}

# ============================================
# Install system dependencies
# ============================================
install_deps_debian() {
  log_info "Installing system packages (apt)..."
  apt-get update -qq

  # Node.js 22 repo (nodesource)
  local node_version=""
  if command -v node &>/dev/null; then
    node_version=$(node -v | cut -d. -f1 | tr -d v)
  fi

  if [ -z "$node_version" ] || [ "$node_version" -lt "$NODE_MAJOR" ]; then
    apt-get install -y -qq ca-certificates curl gnupg
    mkdir -p /etc/apt/keyrings
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key \
      | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg 2>/dev/null
    echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_${NODE_MAJOR}.x nodistro main" \
      > /etc/apt/sources.list.d/nodesource.list
    apt-get update -qq
  fi

  apt-get install -y -qq \
    nodejs \
    postgresql \
    redis-server \
    ffmpeg \
    git \
    build-essential

  # Verify Node.js version
  local installed_version
  installed_version=$(node -v | cut -d. -f1 | tr -d v)
  if [ "$installed_version" -lt "$NODE_MAJOR" ]; then
    abort "Node.js $NODE_MAJOR required but got v$(node -v). Remove old Node.js and retry."
  fi

  log_success "System packages installed (Node.js $(node -v))"
}

install_deps_fedora() {
  log_info "Installing system packages (dnf)..."

  if ! command -v node &>/dev/null || [ "$(node -v | cut -d. -f1 | tr -d v)" -lt "$NODE_MAJOR" ]; then
    dnf install -y -q https://rpm.nodesource.com/pub_${NODE_MAJOR}.x/nodistro/repo/nodesource-release-nodistro-1.noarch.rpm 2>/dev/null || true
  fi

  dnf install -y -q \
    nodejs \
    postgresql-server postgresql \
    redis \
    ffmpeg \
    git \
    gcc-c++ make

  if [ ! -f /var/lib/pgsql/data/PG_VERSION ]; then
    postgresql-setup --initdb 2>/dev/null || true
  fi

  log_success "System packages installed (Node.js $(node -v))"
}

install_deps_arch() {
  log_info "Installing system packages (pacman)..."

  pacman -Sy --noconfirm --needed \
    nodejs npm \
    postgresql \
    redis \
    ffmpeg \
    git \
    base-devel

  if [ ! -d /var/lib/postgres/data/base ]; then
    su - postgres -c "initdb -D /var/lib/postgres/data" 2>/dev/null || true
  fi

  log_success "System packages installed (Node.js $(node -v))"
}

install_system_deps() {
  case "$PKG_FAMILY" in
    debian) install_deps_debian ;;
    fedora) install_deps_fedora ;;
    arch)   install_deps_arch ;;
  esac
}

# ============================================
# Install pnpm (via corepack, built into Node 22)
# ============================================
install_pnpm() {
  log_info "Enabling pnpm $PNPM_VERSION via corepack..."
  corepack enable 2>/dev/null || true
  corepack prepare "pnpm@${PNPM_VERSION}" --activate 2>/dev/null || {
    # Fallback: npm global install if corepack is not available
    log_warn "corepack not available, installing pnpm via npm..."
    npm install -g "pnpm@${PNPM_VERSION}" --silent
  }
  log_success "pnpm $(pnpm -v) ready"
}

# ============================================
# Configure PostgreSQL
# ============================================
setup_postgresql() {
  log_info "Configuring PostgreSQL..."

  systemctl enable postgresql --now 2>/dev/null || systemctl start postgresql 2>/dev/null

  local retries=0
  while ! su - postgres -c "pg_isready" &>/dev/null; do
    retries=$((retries + 1))
    if [ $retries -gt 30 ]; then
      abort "PostgreSQL failed to start. Check: sudo journalctl -u postgresql -n 20"
    fi
    sleep 1
  done

  DB_PASSWORD=$(gen_password)

  su - postgres -c "psql -v ON_ERROR_STOP=0" <<SQL 2>/dev/null
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '${ECHO_USER}') THEN
    CREATE ROLE ${ECHO_USER} WITH LOGIN PASSWORD '${DB_PASSWORD}';
  ELSE
    ALTER ROLE ${ECHO_USER} WITH PASSWORD '${DB_PASSWORD}';
  END IF;
END
\$\$;

SELECT 'CREATE DATABASE echo OWNER ${ECHO_USER}'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'echo')\gexec
SQL

  # Ensure pg_hba.conf allows password auth for local connections
  local pg_hba
  pg_hba=$(su - postgres -c "psql -t -c 'SHOW hba_file'" 2>/dev/null | tr -d ' ')
  if [ -n "$pg_hba" ] && [ -f "$pg_hba" ]; then
    if ! grep -q "host.*echo.*${ECHO_USER}.*md5\|host.*echo.*${ECHO_USER}.*scram" "$pg_hba" 2>/dev/null; then
      # Add password auth rule before the first existing rule
      sed -i "1s|^|host echo ${ECHO_USER} 127.0.0.1/32 scram-sha-256\nhost echo ${ECHO_USER} ::1/128 scram-sha-256\n|" "$pg_hba"
      systemctl reload postgresql 2>/dev/null || true
    fi
  fi

  export DATABASE_URL="postgresql://${ECHO_USER}:${DB_PASSWORD}@localhost:5432/echo"
  log_success "PostgreSQL configured (user: $ECHO_USER, db: echo)"
}

# ============================================
# Configure Redis
# ============================================
setup_redis() {
  log_info "Configuring Redis..."

  REDIS_PASSWORD=$(gen_password)

  local redis_conf=""
  for path in /etc/redis/redis.conf /etc/redis.conf /etc/redis/6379.conf; do
    if [ -f "$path" ]; then
      redis_conf="$path"
      break
    fi
  done

  if [ -n "$redis_conf" ]; then
    sed -i '/^requirepass /d' "$redis_conf"
    echo "requirepass ${REDIS_PASSWORD}" >> "$redis_conf"

    # Limit memory usage (same as Docker config)
    if ! grep -q '^maxmemory ' "$redis_conf"; then
      echo "maxmemory 128mb" >> "$redis_conf"
      echo "maxmemory-policy allkeys-lru" >> "$redis_conf"
    fi
  fi

  # Enable and restart (not just start) to apply new password
  systemctl enable redis-server 2>/dev/null || systemctl enable redis 2>/dev/null || true
  systemctl restart redis-server 2>/dev/null || systemctl restart redis 2>/dev/null || true

  log_success "Redis configured"
}

# ============================================
# Clone and build
# ============================================
build_app() {
  log_info "Downloading Echo..."

  if [ -d "$INSTALL_DIR/.git" ]; then
    cd "$INSTALL_DIR"
    git pull --quiet
  else
    local tmp_dir
    tmp_dir=$(mktemp -d)
    git clone --quiet --depth 1 https://github.com/Alexzafra13/echo.git "$tmp_dir"
    mkdir -p "$INSTALL_DIR"
    cp -a "$tmp_dir/." "$INSTALL_DIR/"
    rm -rf "$tmp_dir"
  fi

  chown -R "$ECHO_USER":"$ECHO_GROUP" "$INSTALL_DIR"
  log_success "Source code ready"

  cd "$INSTALL_DIR"
  run_with_spinner "Installing dependencies" \
    su -s /bin/bash "$ECHO_USER" -c "pnpm install --frozen-lockfile --silent 2>/dev/null || pnpm install --silent"

  run_with_spinner "Building application" \
    su -s /bin/bash "$ECHO_USER" -c "pnpm build"
}

# ============================================
# Configure application
# ============================================
configure_app() {
  log_info "Configuring Echo..."

  mkdir -p "$DATA_DIR"/{metadata,covers,uploads,logs}
  mkdir -p "$MUSIC_DIR"
  chown -R "$ECHO_USER":"$ECHO_GROUP" "$DATA_DIR"

  JWT_SECRET=$(head -c 64 /dev/urandom | base64 | tr -d '\n')
  JWT_REFRESH_SECRET=$(head -c 64 /dev/urandom | base64 | tr -d '\n')

  local env_file="$INSTALL_DIR/api/.env"

  # Backup existing .env if present
  if [ -f "$env_file" ]; then
    cp "$env_file" "${env_file}.bak.$(date +%Y%m%d%H%M%S)"
    log_info "Previous config backed up to ${env_file}.bak.*"
  fi

  cat > "$env_file" <<EOF
# Echo Music Server — Auto-generated $(date -u +"%Y-%m-%d %H:%M:%S UTC")
# All values are auto-configured. Edit only if needed.

NODE_ENV=production
PORT=${PORT}

# Database (auto-generated, do not share)
DATABASE_URL=postgresql://${ECHO_USER}:${DB_PASSWORD}@localhost:5432/echo

# Redis (auto-generated)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=${REDIS_PASSWORD}

# Auth (auto-generated, do not share)
JWT_SECRET=${JWT_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}

# Storage
DATA_PATH=${DATA_DIR}

# Music library
LIBRARY_PATH=${MUSIC_DIR}
ALLOWED_MUSIC_PATHS=${MUSIC_DIR},/mnt,/media,/home
EOF

  chmod 600 "$env_file"
  chown "$ECHO_USER":"$ECHO_GROUP" "$env_file"

  log_success "Configuration created"

  log_info "Running database migrations..."
  cd "$INSTALL_DIR/api"
  su -s /bin/bash "$ECHO_USER" -c "DATABASE_URL='${DATABASE_URL}' node scripts/run-migrations.js"
  log_success "Database ready"
}

# ============================================
# Create systemd service
# ============================================
create_service() {
  log_info "Creating systemd service..."

  # Detect redis service name for this distro
  local redis_service="redis-server.service"
  if systemctl list-unit-files redis.service &>/dev/null && ! systemctl list-unit-files redis-server.service &>/dev/null; then
    redis_service="redis.service"
  fi

  cat > /etc/systemd/system/echo.service <<EOF
[Unit]
Description=Echo Music Server
Documentation=https://github.com/Alexzafra13/echo
After=network.target postgresql.service ${redis_service}
Requires=postgresql.service
Wants=${redis_service}

[Service]
Type=simple
User=${ECHO_USER}
Group=${ECHO_GROUP}
WorkingDirectory=${INSTALL_DIR}/api
EnvironmentFile=${INSTALL_DIR}/api/.env
ExecStart=/usr/bin/node ${INSTALL_DIR}/api/dist/src/main.js
Restart=on-failure
RestartSec=10
StartLimitIntervalSec=300
StartLimitBurst=5

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=echo

# Security hardening
NoNewPrivileges=true
ProtectSystem=strict
PrivateTmp=true
PrivateDevices=true
ReadWritePaths=${DATA_DIR}
ReadOnlyPaths=${INSTALL_DIR} ${MUSIC_DIR} /mnt /media /home

[Install]
WantedBy=multi-user.target
EOF

  systemctl daemon-reload
  systemctl enable echo --now

  # Wait and verify
  local retries=0
  while [ $retries -lt 10 ]; do
    if systemctl is-active echo &>/dev/null; then
      log_success "Service started"
      return
    fi
    retries=$((retries + 1))
    sleep 1
  done

  log_warn "Service may not have started correctly"
  log_info "Check: sudo journalctl -u echo -n 20"
}

# ============================================
# Uninstall
# ============================================
uninstall() {
  need_root

  echo -e "${YELLOW}"
  echo "════════════════════════════════════════"
  echo "  Echo Music Server - Uninstall"
  echo "════════════════════════════════════════"
  echo -e "${NC}"
  echo ""
  echo "This will remove:"
  echo "  - Systemd service"
  echo "  - Application files ($INSTALL_DIR)"
  echo ""
  echo "This will NOT remove:"
  echo "  - Your data ($DATA_DIR)"
  echo "  - Your music ($MUSIC_DIR)"
  echo "  - PostgreSQL, Redis, Node.js"
  echo ""
  prompt_confirm "Continue? (yes/NO): " ""
  if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "Uninstall cancelled."
    exit 0
  fi

  echo ""

  if systemctl is-active echo &>/dev/null; then
    systemctl stop echo
    log_success "Service stopped"
  fi
  systemctl disable echo 2>/dev/null || true
  rm -f /etc/systemd/system/echo.service
  systemctl daemon-reload
  log_success "Service removed"

  rm -rf "$INSTALL_DIR"
  log_success "Application files removed"

  su - postgres -c "psql -c 'DROP DATABASE IF EXISTS echo'" 2>/dev/null || true
  su - postgres -c "psql -c 'DROP ROLE IF EXISTS ${ECHO_USER}'" 2>/dev/null || true
  log_success "Database removed"

  echo ""
  log_success "Uninstall complete"
  log_info "Your data is preserved at: $DATA_DIR"
  log_info "Remove it manually if no longer needed: sudo rm -rf $DATA_DIR"
}

# ============================================
# Update
# ============================================
update() {
  need_root

  echo -e "${BLUE}"
  echo "════════════════════════════════════════"
  echo "  Echo Music Server - Update"
  echo "════════════════════════════════════════"
  echo -e "${NC}"
  echo ""

  if [ ! -d "$INSTALL_DIR/.git" ]; then
    abort "Echo is not installed at $INSTALL_DIR"
  fi

  local env_file="$INSTALL_DIR/api/.env"
  if [ ! -f "$env_file" ]; then
    abort "Configuration not found at $env_file"
  fi

  log_info "Checking for updates..."
  cd "$INSTALL_DIR"

  git fetch --quiet origin main

  local local_hash remote_hash
  local_hash=$(git rev-parse HEAD)
  remote_hash=$(git rev-parse origin/main)

  if [ "$local_hash" = "$remote_hash" ]; then
    log_success "Already up to date."
    exit 0
  fi

  log_info "$(git rev-list --count HEAD..origin/main) new commit(s) available"

  # Backup current build before updating
  log_info "Backing up current build..."
  local backup_dir="$INSTALL_DIR/.build-backup"
  rm -rf "$backup_dir"
  mkdir -p "$backup_dir"
  if [ -d "$INSTALL_DIR/api/dist" ]; then
    cp -a "$INSTALL_DIR/api/dist" "$backup_dir/api-dist"
  fi
  if [ -d "$INSTALL_DIR/web/dist" ]; then
    cp -a "$INSTALL_DIR/web/dist" "$backup_dir/web-dist"
  fi

  log_info "Stopping Echo..."
  systemctl stop echo

  log_info "Downloading update..."
  git pull --quiet origin main
  chown -R "$ECHO_USER":"$ECHO_GROUP" "$INSTALL_DIR"

  run_with_spinner "Installing dependencies" \
    su -s /bin/bash "$ECHO_USER" -c "pnpm install --frozen-lockfile --silent 2>/dev/null || pnpm install --silent"

  if ! run_with_spinner "Building application" \
    su -s /bin/bash "$ECHO_USER" -c "pnpm build"; then
    log_error "Build failed! Restoring previous build..."
    if [ -d "$backup_dir/api-dist" ]; then
      rm -rf "$INSTALL_DIR/api/dist"
      cp -a "$backup_dir/api-dist" "$INSTALL_DIR/api/dist"
    fi
    if [ -d "$backup_dir/web-dist" ]; then
      rm -rf "$INSTALL_DIR/web/dist"
      cp -a "$backup_dir/web-dist" "$INSTALL_DIR/web/dist"
    fi
    systemctl start echo
    abort "Update failed but previous version has been restored. Echo is running."
  fi

  # Clean up backup
  rm -rf "$backup_dir"

  log_info "Running database migrations..."
  cd "$INSTALL_DIR/api"
  # Read DATABASE_URL from .env safely (grep + cut, no shell eval)
  local db_url
  db_url=$(grep '^DATABASE_URL=' "$env_file" | cut -d= -f2-)
  if [ -z "$db_url" ]; then
    abort "DATABASE_URL not found in $env_file"
  fi
  su -s /bin/bash "$ECHO_USER" -c "DATABASE_URL='${db_url}' node scripts/run-migrations.js"

  log_info "Starting Echo..."
  systemctl start echo

  echo ""
  log_success "Update complete!"
  log_info "Check status: sudo systemctl status echo"
}

# ============================================
# Print summary
# ============================================
print_summary() {
  local ip
  ip=$(hostname -I 2>/dev/null | awk '{print $1}')

  echo ""
  echo -e "${GREEN}"
  echo "════════════════════════════════════════════════"
  echo "  Echo Music Server - Installation Complete"
  echo "════════════════════════════════════════════════"
  echo -e "${NC}"
  echo ""
  echo "  Open your browser:"
  echo -e "    ${BOLD}http://localhost:${PORT}${NC}"
  if [ -n "$ip" ]; then
  echo -e "    ${BOLD}http://${ip}:${PORT}${NC}"
  fi
  echo ""
  echo "  Add your music:"
  echo "    Copy files to $MUSIC_DIR"
  echo "    Or edit $INSTALL_DIR/api/.env to change paths"
  echo ""
  echo "  Manage the service:"
  echo "    sudo systemctl status echo"
  echo "    sudo systemctl restart echo"
  echo "    sudo journalctl -u echo -f"
  echo ""
  echo "  Update:    sudo $0 --update"
  echo "  Uninstall: sudo $0 --uninstall"
  echo ""
  echo "  Config: $INSTALL_DIR/api/.env"
  echo "  Data:   $DATA_DIR"
  echo "  Music:  $MUSIC_DIR"
  echo ""
}

# ============================================
# Main
# ============================================
main() {
  case "${1:-}" in
    --uninstall) uninstall; exit 0 ;;
    --update)    update; exit 0 ;;
  esac

  need_root

  echo -e "${ORANGE}"
  echo "                                          ▄▄█████████████▄▄"
  echo "  ███████╗ ██████╗██╗  ██╗ ██████╗      ▄█▀░░░░░░░░░░░░░░░▀█▄"
  echo "  ██╔════╝██╔════╝██║  ██║██╔═══██╗    ██░░░▄███████████▄░░░██"
  echo "  █████╗  ██║     ███████║██║   ██║    ██░░░██░░░░●░░░░██░░░██"
  echo "  ██╔══╝  ██║     ██╔══██║██║   ██║    ██░░░▀███████████▀░░░██"
  echo "  ███████╗╚██████╗██║  ██║╚██████╔╝     ▀█▄░░░░░░░░░░░░░░░▄█▀"
  echo "  ╚══════╝ ╚═════╝╚═╝  ╚═╝ ╚═════╝       ▀▀█████████████▀▀"
  echo -e "${NC}"
  echo -e "  ${BOLD}Bare-Metal Installer${NC}"
  echo ""

  detect_distro
  preflight_checks

  echo ""
  echo "This will install Echo Music Server with:"
  echo "  - Node.js ${NODE_MAJOR}, PostgreSQL, Redis, FFmpeg"
  echo "  - Install to: $INSTALL_DIR"
  echo "  - Data in: $DATA_DIR"
  echo "  - Port: $PORT"
  echo ""
  echo "  All passwords and secrets are generated automatically."
  echo ""
  prompt_confirm "Continue? (Y/n): " "Y"
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Installation cancelled."
    exit 0
  fi

  echo ""
  log_info "Starting installation..."
  echo ""

  install_system_deps
  install_pnpm
  setup_postgresql
  setup_redis
  build_app
  configure_app
  create_service
  print_summary
}

main "$@"

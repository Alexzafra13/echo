#!/usr/bin/env bash

# ============================================
# Echo Music Server - Bare-Metal Installer
# ============================================
# Installs Echo without Docker on Linux systems.
#
# Supported: Debian/Ubuntu, Fedora/RHEL, Arch Linux
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/Alexzafra13/echo/main/scripts/install.sh | bash
#
# Or locally:
#   ./scripts/install.sh
#
# Update:
#   ./scripts/install.sh --update
#
# Uninstall:
#   ./scripts/install.sh --uninstall
# ============================================

set -euo pipefail

# ============================================
# Configuration
# ============================================
ECHO_USER="echo"
ECHO_GROUP="echo"
INSTALL_DIR="/opt/echo"
DATA_DIR="/var/lib/echo"
MUSIC_DIR="/srv/music"
PORT=4567
NODE_MAJOR=22
PNPM_VERSION="10.18.3"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

need_root() {
  if [ "$(id -u)" -ne 0 ]; then
    abort "This script must be run as root. Use: sudo $0"
  fi
}

# ============================================
# Preflight checks
# ============================================
preflight_checks() {
  log_info "Running preflight checks..."

  # Architecture
  local arch
  arch=$(uname -m)
  case "$arch" in
    x86_64|aarch64|arm64) ;;
    *) abort "Unsupported architecture: $arch. Supported: x86_64, aarch64." ;;
  esac
  log_success "Architecture: $arch"

  # Disk space (need at least 1GB for install dir, 500MB for data)
  local install_parent
  install_parent=$(dirname "$INSTALL_DIR")
  local available_kb
  available_kb=$(df -k "$install_parent" 2>/dev/null | awk 'NR==2 {print $4}')
  if [ -n "$available_kb" ] && [ "$available_kb" -lt 1048576 ]; then
    abort "Not enough disk space. Need at least 1GB free in $install_parent (available: $((available_kb / 1024))MB)"
  fi
  log_success "Disk space: $((available_kb / 1024))MB available"

  # RAM (warn if less than 1GB)
  local total_mem_kb
  total_mem_kb=$(grep MemTotal /proc/meminfo 2>/dev/null | awk '{print $2}')
  if [ -n "$total_mem_kb" ] && [ "$total_mem_kb" -lt 1048576 ]; then
    log_warn "Less than 1GB RAM detected ($((total_mem_kb / 1024))MB). Echo may run slowly."
  else
    log_success "Memory: $((total_mem_kb / 1024))MB"
  fi
}

# ============================================
# Detect distro
# ============================================
detect_distro() {
  if [ -f /etc/os-release ]; then
    . /etc/os-release
    DISTRO_ID="$ID"
    DISTRO_LIKE="${ID_LIKE:-$ID}"
    DISTRO_VERSION="${VERSION_ID:-}"
    DISTRO_NAME="${PRETTY_NAME:-$ID}"
  else
    abort "Cannot detect Linux distribution. /etc/os-release not found."
  fi

  # Normalize to package manager family
  case "$DISTRO_ID" in
    ubuntu|debian|raspbian|linuxmint|pop)
      PKG_FAMILY="debian"
      ;;
    fedora|rhel|centos|rocky|alma)
      PKG_FAMILY="fedora"
      ;;
    arch|manjaro|endeavouros)
      PKG_FAMILY="arch"
      ;;
    *)
      # Try ID_LIKE as fallback
      case "$DISTRO_LIKE" in
        *debian*|*ubuntu*) PKG_FAMILY="debian" ;;
        *fedora*|*rhel*)   PKG_FAMILY="fedora" ;;
        *arch*)            PKG_FAMILY="arch" ;;
        *) abort "Unsupported distribution: $DISTRO_NAME. Supported: Debian/Ubuntu, Fedora/RHEL, Arch." ;;
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

  # Node.js repo
  if ! command -v node &>/dev/null || [ "$(node -v | cut -d. -f1 | tr -d v)" -lt "$NODE_MAJOR" ]; then
    apt-get install -y -qq ca-certificates curl gnupg
    mkdir -p /etc/apt/keyrings
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg 2>/dev/null
    echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_${NODE_MAJOR}.x nodistro main" > /etc/apt/sources.list.d/nodesource.list
    apt-get update -qq
  fi

  apt-get install -y -qq \
    nodejs \
    postgresql \
    redis-server \
    ffmpeg \
    git \
    build-essential

  log_success "System packages installed"
}

install_deps_fedora() {
  log_info "Installing system packages (dnf)..."

  # Node.js repo
  if ! command -v node &>/dev/null || [ "$(node -v | cut -d. -f1 | tr -d v)" -lt "$NODE_MAJOR" ]; then
    dnf install -y -q https://rpm.nodesource.com/pub_${NODE_MAJOR}.x/nodistro/repo/nodesource-release-nodistro-1.noarch.rpm 2>/dev/null || true
  fi

  dnf install -y -q \
    nodejs \
    postgresql-server \
    postgresql \
    redis \
    ffmpeg \
    git \
    gcc-c++ make

  # Initialize PostgreSQL if needed
  if [ ! -f /var/lib/pgsql/data/PG_VERSION ]; then
    postgresql-setup --initdb 2>/dev/null || true
  fi

  log_success "System packages installed"
}

install_deps_arch() {
  log_info "Installing system packages (pacman)..."

  pacman -Sy --noconfirm --needed \
    nodejs \
    npm \
    postgresql \
    redis \
    ffmpeg \
    git \
    base-devel

  # Initialize PostgreSQL if needed
  if [ ! -d /var/lib/postgres/data/base ]; then
    su - postgres -c "initdb -D /var/lib/postgres/data" 2>/dev/null || true
  fi

  log_success "System packages installed"
}

install_system_deps() {
  case "$PKG_FAMILY" in
    debian) install_deps_debian ;;
    fedora) install_deps_fedora ;;
    arch)   install_deps_arch ;;
  esac
}

# ============================================
# Install pnpm
# ============================================
install_pnpm() {
  if command -v pnpm &>/dev/null; then
    local current_version
    current_version=$(pnpm -v 2>/dev/null)
    log_info "pnpm $current_version already installed"
    return
  fi

  log_info "Installing pnpm $PNPM_VERSION..."
  npm install -g "pnpm@${PNPM_VERSION}" --silent
  log_success "pnpm installed"
}

# ============================================
# Start and configure PostgreSQL
# ============================================
setup_postgresql() {
  log_info "Configuring PostgreSQL..."

  # Start PostgreSQL
  systemctl enable postgresql --now 2>/dev/null || systemctl start postgresql 2>/dev/null

  # Wait for PostgreSQL to be ready
  local retries=0
  while ! su - postgres -c "pg_isready" &>/dev/null; do
    retries=$((retries + 1))
    if [ $retries -gt 15 ]; then
      abort "PostgreSQL failed to start"
    fi
    sleep 1
  done

  # Generate secure password
  DB_PASSWORD=$(head -c 32 /dev/urandom | base64 | tr -d '\n/+=')

  # Create user and database (ignore errors if already exist)
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

SELECT 'CREATE DATABASE ${ECHO_USER} OWNER ${ECHO_USER}'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${ECHO_USER}')\gexec
SQL

  log_success "PostgreSQL configured (user: $ECHO_USER, db: $ECHO_USER)"
}

# ============================================
# Start and configure Redis
# ============================================
setup_redis() {
  log_info "Configuring Redis..."

  REDIS_PASSWORD=$(head -c 32 /dev/urandom | base64 | tr -d '\n/+=')

  # Set Redis password
  local redis_conf=""
  for path in /etc/redis/redis.conf /etc/redis.conf /etc/redis/6379.conf; do
    if [ -f "$path" ]; then
      redis_conf="$path"
      break
    fi
  done

  if [ -n "$redis_conf" ]; then
    # Remove existing requirepass lines and add new one
    sed -i '/^requirepass /d' "$redis_conf"
    echo "requirepass ${REDIS_PASSWORD}" >> "$redis_conf"
  fi

  # Start Redis
  systemctl enable redis-server --now 2>/dev/null || \
  systemctl enable redis --now 2>/dev/null || \
  systemctl start redis 2>/dev/null

  log_success "Redis configured"
}

# ============================================
# Create system user
# ============================================
create_user() {
  if id "$ECHO_USER" &>/dev/null; then
    log_info "User '$ECHO_USER' already exists"
    return
  fi

  log_info "Creating system user '$ECHO_USER'..."
  useradd --system --shell /usr/sbin/nologin --home-dir "$INSTALL_DIR" --create-home "$ECHO_USER"
  log_success "User created"
}

# ============================================
# Clone and build
# ============================================
build_app() {
  log_info "Downloading Echo..."

  if [ -d "$INSTALL_DIR/.git" ]; then
    cd "$INSTALL_DIR"
    su -s /bin/bash "$ECHO_USER" -c "git pull --quiet"
  else
    # Clone into temp and move (in case INSTALL_DIR already exists as home dir)
    local tmp_dir
    tmp_dir=$(mktemp -d)
    git clone --quiet --depth 1 https://github.com/Alexzafra13/echo.git "$tmp_dir"
    cp -a "$tmp_dir/." "$INSTALL_DIR/"
    rm -rf "$tmp_dir"
    chown -R "$ECHO_USER":"$ECHO_GROUP" "$INSTALL_DIR"
  fi

  log_success "Source code ready"

  log_info "Installing dependencies (this may take a few minutes)..."
  cd "$INSTALL_DIR"
  su -s /bin/bash "$ECHO_USER" -c "pnpm install --frozen-lockfile --silent 2>/dev/null || pnpm install --silent"
  log_success "Dependencies installed"

  log_info "Building application..."
  su -s /bin/bash "$ECHO_USER" -c "pnpm build"
  log_success "Build complete"
}

# ============================================
# Configure application
# ============================================
configure_app() {
  log_info "Configuring Echo..."

  # Create data directories
  mkdir -p "$DATA_DIR"/{metadata,covers,uploads,logs}
  mkdir -p "$MUSIC_DIR"
  chown -R "$ECHO_USER":"$ECHO_GROUP" "$DATA_DIR"

  # Generate JWT secrets
  JWT_SECRET=$(head -c 64 /dev/urandom | base64 | tr -d '\n')
  JWT_REFRESH_SECRET=$(head -c 64 /dev/urandom | base64 | tr -d '\n')

  # Create .env for the API
  cat > "$INSTALL_DIR/api/.env" <<EOF
# ============================================
# Echo Music Server - Production Configuration
# ============================================
# Auto-generated by install.sh on $(date -u +"%Y-%m-%d %H:%M:%S UTC")

NODE_ENV=production
PORT=${PORT}
API_PREFIX=api

# Database
DATABASE_URL=postgresql://${ECHO_USER}:${DB_PASSWORD}@localhost:5432/${ECHO_USER}

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=${REDIS_PASSWORD}

# JWT (auto-generated)
JWT_SECRET=${JWT_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
JWT_EXPIRATION=7d
JWT_REFRESH_EXPIRATION=30d

# Security
BCRYPT_ROUNDS=12

# CORS (auto-detected at startup, set explicitly if behind a reverse proxy)
# CORS_ORIGINS=https://music.example.com

# Storage
DATA_PATH=${DATA_DIR}
UPLOAD_PATH=${DATA_DIR}/uploads
COVERS_PATH=${DATA_DIR}/covers
METADATA_PATH=${DATA_DIR}/metadata

# Music library
LIBRARY_PATH=${MUSIC_DIR}
ALLOWED_MUSIC_PATHS=${MUSIC_DIR},/mnt,/media
EOF

  chmod 600 "$INSTALL_DIR/api/.env"
  chown "$ECHO_USER":"$ECHO_GROUP" "$INSTALL_DIR/api/.env"

  log_success "Configuration created"

  # Run migrations
  log_info "Running database migrations..."
  cd "$INSTALL_DIR/api"
  su -s /bin/bash "$ECHO_USER" -c "node scripts/run-migrations.js"
  log_success "Database ready"
}

# ============================================
# Create systemd service
# ============================================
create_service() {
  log_info "Creating systemd service..."

  cat > /etc/systemd/system/echo.service <<EOF
[Unit]
Description=Echo Music Server
Documentation=https://github.com/Alexzafra13/echo
After=network.target postgresql.service redis-server.service redis.service
Requires=postgresql.service

[Service]
Type=simple
User=${ECHO_USER}
Group=${ECHO_GROUP}
WorkingDirectory=${INSTALL_DIR}/api
ExecStart=/usr/bin/node ${INSTALL_DIR}/api/dist/src/main.js
Restart=on-failure
RestartSec=5

# Environment
Environment=NODE_ENV=production
Environment=PORT=${PORT}
EnvironmentFile=${INSTALL_DIR}/api/.env

# Security hardening
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true
PrivateDevices=true
ProtectClock=true
ProtectKernelTunables=true
ProtectKernelModules=true
ProtectKernelLogs=true
ProtectControlGroups=true
RestrictNamespaces=true
RestrictRealtime=true
RestrictSUIDSGID=true
CapabilityBoundingSet=
LockPersonality=true
SystemCallFilter=@system-service
SystemCallErrorNumber=EPERM
ReadWritePaths=${DATA_DIR}
ReadOnlyPaths=${INSTALL_DIR} ${MUSIC_DIR} /mnt /media

[Install]
WantedBy=multi-user.target
EOF

  systemctl daemon-reload
  systemctl enable echo --now

  log_success "Service created and started"
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
  echo "  - System user ($ECHO_USER)"
  echo ""
  echo "This will NOT remove:"
  echo "  - Your data ($DATA_DIR)"
  echo "  - Your music ($MUSIC_DIR)"
  echo "  - PostgreSQL, Redis, Node.js"
  echo ""
  read -p "Continue? (yes/NO): " -r
  if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "Uninstall cancelled."
    exit 0
  fi

  echo ""

  # Stop and remove service
  if systemctl is-active echo &>/dev/null; then
    systemctl stop echo
    log_success "Service stopped"
  fi
  systemctl disable echo 2>/dev/null || true
  rm -f /etc/systemd/system/echo.service
  systemctl daemon-reload
  log_success "Service removed"

  # Remove app directory
  rm -rf "$INSTALL_DIR"
  log_success "Application files removed"

  # Remove user
  userdel "$ECHO_USER" 2>/dev/null || true
  log_success "User removed"

  # Drop database and user
  su - postgres -c "psql -c 'DROP DATABASE IF EXISTS ${ECHO_USER}'" 2>/dev/null || true
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
    abort "Echo is not installed at $INSTALL_DIR or was not installed via git."
  fi

  log_info "Checking for updates..."
  cd "$INSTALL_DIR"

  # Fetch latest changes
  su -s /bin/bash "$ECHO_USER" -c "git fetch --quiet origin main"

  local local_hash remote_hash
  local_hash=$(git rev-parse HEAD)
  remote_hash=$(git rev-parse origin/main)

  if [ "$local_hash" = "$remote_hash" ]; then
    log_success "Already up to date."
    exit 0
  fi

  local commits_behind
  commits_behind=$(git rev-list --count HEAD..origin/main)
  log_info "$commits_behind new commit(s) available"
  echo ""

  # Stop service
  log_info "Stopping Echo..."
  systemctl stop echo
  log_success "Service stopped"

  # Pull changes
  log_info "Downloading update..."
  su -s /bin/bash "$ECHO_USER" -c "git pull --quiet origin main"
  log_success "Source updated"

  # Rebuild
  log_info "Installing dependencies..."
  su -s /bin/bash "$ECHO_USER" -c "pnpm install --frozen-lockfile --silent 2>/dev/null || pnpm install --silent"
  log_success "Dependencies installed"

  log_info "Building application..."
  su -s /bin/bash "$ECHO_USER" -c "pnpm build"
  log_success "Build complete"

  # Run migrations
  log_info "Running database migrations..."
  cd "$INSTALL_DIR/api"
  su -s /bin/bash "$ECHO_USER" -c "node scripts/run-migrations.js"
  log_success "Database ready"

  # Restart service
  log_info "Starting Echo..."
  systemctl start echo
  log_success "Service started"

  echo ""
  log_success "Update complete!"
  log_info "Check status: sudo systemctl status echo"
  log_info "View logs: sudo journalctl -u echo -f"
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
  echo "    sudo systemctl status echo      # Check status"
  echo "    sudo systemctl restart echo     # Restart"
  echo "    sudo systemctl stop echo        # Stop"
  echo "    sudo journalctl -u echo -f      # View logs"
  echo ""
  echo "  Update:"
  echo "    sudo $INSTALL_DIR/scripts/install.sh --update"
  echo ""
  echo "  Uninstall:"
  echo "    sudo $INSTALL_DIR/scripts/install.sh --uninstall"
  echo ""
  echo "  Config file: $INSTALL_DIR/api/.env"
  echo "  Data:        $DATA_DIR"
  echo "  Music:       $MUSIC_DIR"
  echo ""
}

# ============================================
# Main
# ============================================
main() {
  # Handle flags
  case "${1:-}" in
    --uninstall) uninstall; exit 0 ;;
    --update)    update; exit 0 ;;
  esac

  need_root

  echo -e "${BLUE}"
  echo "  ███████╗ ██████╗██╗  ██╗ ██████╗ "
  echo "  ██╔════╝██╔════╝██║  ██║██╔═══██╗"
  echo "  █████╗  ██║     ███████║██║   ██║"
  echo "  ██╔══╝  ██║     ██╔══██║██║   ██║"
  echo "  ███████╗╚██████╗██║  ██║╚██████╔╝"
  echo "  ╚══════╝ ╚═════╝╚═╝  ╚═╝ ╚═════╝ "
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
  echo "  - Music in: $MUSIC_DIR"
  echo "  - Port: $PORT"
  echo ""
  read -p "Continue? (Y/n): " -r
  REPLY=${REPLY:-Y}
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Installation cancelled."
    exit 0
  fi

  echo ""
  log_info "Starting installation..."
  echo ""

  install_system_deps
  install_pnpm
  create_user
  setup_postgresql
  setup_redis
  build_app
  configure_app
  create_service
  print_summary
}

main "$@"

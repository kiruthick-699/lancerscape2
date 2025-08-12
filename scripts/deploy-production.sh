#!/bin/bash

# Production Deployment Script for Lancerscape2
# This script handles secure, zero-downtime deployment to production

set -euo pipefail

# Configuration
APP_NAME="lancerscape2"
DEPLOYMENT_DIR="/opt/lancerscape2"
BACKUP_DIR="/opt/backups/lancerscape2"
LOG_FILE="/var/log/lancerscape2/deployment.log"
HEALTH_CHECK_URL="https://lancerscape2.com/health"
ROLLBACK_VERSION=""
DEPLOYMENT_TIMEOUT=300

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] SUCCESS:${NC} $1" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" | tee -a "$LOG_FILE"
}

# Error handling
trap 'handle_error $? $LINENO' ERR

handle_error() {
    local exit_code=$1
    local line_no=$2
    log_error "Error occurred in line $line_no: exit code $exit_code"
    log_error "Deployment failed. Initiating rollback..."
    rollback_deployment
    exit $exit_code
}

# Pre-deployment checks
pre_deployment_checks() {
    log "Starting pre-deployment checks..."
    
    # Check if running as root or with sudo
    if [[ $EUID -eq 0 ]]; then
        log_error "This script should not be run as root"
        exit 1
    fi
    
    # Check if user is in docker group
    if ! groups $USER | grep -q docker; then
        log_error "User $USER is not in docker group"
        exit 1
    fi
    
    # Check if required tools are installed
    local required_tools=("docker" "docker-compose" "git" "curl" "jq")
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            log_error "Required tool '$tool' is not installed"
            exit 1
        fi
    done
    
    # Check if deployment directory exists
    if [[ ! -d "$DEPLOYMENT_DIR" ]]; then
        log_error "Deployment directory $DEPLOYMENT_DIR does not exist"
        exit 1
    fi
    
    # Check if backup directory exists
    if [[ ! -d "$BACKUP_DIR" ]]; then
        log_warning "Backup directory $BACKUP_DIR does not exist, creating..."
        sudo mkdir -p "$BACKUP_DIR"
        sudo chown $USER:$USER "$BACKUP_DIR"
    fi
    
    # Check if log directory exists
    if [[ ! -d "$(dirname "$LOG_FILE")" ]]; then
        sudo mkdir -p "$(dirname "$LOG_FILE")"
        sudo chown $USER:$USER "$(dirname "$LOG_FILE")"
    fi
    
    log_success "Pre-deployment checks completed"
}

# Create backup
create_backup() {
    log "Creating backup of current deployment..."
    
    local backup_name="${APP_NAME}_backup_$(date +'%Y%m%d_%H%M%S')"
    local backup_path="$BACKUP_DIR/$backup_name"
    
    # Create backup directory
    mkdir -p "$backup_path"
    
    # Backup current deployment
    if [[ -d "$DEPLOYMENT_DIR" ]]; then
        cp -r "$DEPLOYMENT_DIR"/* "$backup_path/"
        log_success "Backup created at $backup_path"
    else
        log_warning "No current deployment to backup"
    fi
    
    # Store backup path for rollback
    echo "$backup_path" > "$BACKUP_DIR/latest_backup"
}

# Update code
update_code() {
    log "Updating application code..."
    
    cd "$DEPLOYMENT_DIR"
    
    # Stash any local changes
    git stash -u || true
    
    # Fetch latest changes
    git fetch origin main
    
    # Check if there are new changes
    local current_commit=$(git rev-parse HEAD)
    local remote_commit=$(git rev-parse origin/main)
    
    if [[ "$current_commit" == "$remote_commit" ]]; then
        log_warning "No new changes to deploy"
        return 0
    fi
    
    # Store current version for rollback
    ROLLBACK_VERSION="$current_commit"
    
    # Pull latest changes
    git pull origin main
    
    # Update submodules if any
    git submodule update --init --recursive
    
    log_success "Code updated successfully"
}

# Build application
build_application() {
    log "Building application..."
    
    cd "$DEPLOYMENT_DIR"
    
    # Build backend
    log "Building backend..."
    cd backend
    docker-compose build --no-cache --pull
    
    # Build frontend
    log "Building frontend..."
    cd ../frontend
    docker-compose build --no-cache --pull
    
    log_success "Application built successfully"
}

# Run tests
run_tests() {
    log "Running tests..."
    
    cd "$DEPLOYMENT_DIR"
    
    # Run backend tests
    log "Running backend tests..."
    cd backend
    docker-compose run --rm app npm test || {
        log_error "Backend tests failed"
        return 1
    }
    
    # Run frontend tests
    log "Running frontend tests..."
    cd ../frontend
    docker-compose run --rm app npm test || {
        log_error "Frontend tests failed"
        return 1
    }
    
    log_success "All tests passed"
}

# Deploy application
deploy_application() {
    log "Deploying application..."
    
    cd "$DEPLOYMENT_DIR"
    
    # Stop current services
    log "Stopping current services..."
    docker-compose down || true
    
    # Start services with new images
    log "Starting services with new images..."
    docker-compose up -d --remove-orphans
    
    # Wait for services to be ready
    log "Waiting for services to be ready..."
    wait_for_services
    
    log_success "Application deployed successfully"
}

# Wait for services to be ready
wait_for_services() {
    local timeout=$DEPLOYMENT_TIMEOUT
    local interval=10
    local elapsed=0
    
    while [[ $elapsed -lt $timeout ]]; do
        if health_check; then
            log_success "Services are healthy"
            return 0
        fi
        
        log "Waiting for services to be healthy... ($elapsed/$timeout seconds)"
        sleep $interval
        elapsed=$((elapsed + interval))
    done
    
    log_error "Services did not become healthy within $timeout seconds"
    return 1
}

# Health check
health_check() {
    local max_retries=3
    local retry_count=0
    
    while [[ $retry_count -lt $max_retries ]]; do
        if curl -f -s "$HEALTH_CHECK_URL" > /dev/null 2>&1; then
            return 0
        fi
        
        retry_count=$((retry_count + 1))
        sleep 5
    done
    
    return 1
}

# Post-deployment checks
post_deployment_checks() {
    log "Running post-deployment checks..."
    
    # Check service status
    cd "$DEPLOYMENT_DIR"
    docker-compose ps
    
    # Check logs for errors
    log "Checking service logs for errors..."
    if docker-compose logs --tail=100 | grep -i "error\|exception\|fatal" > /dev/null; then
        log_warning "Found errors in service logs"
        docker-compose logs --tail=100 | grep -i "error\|exception\|fatal"
    else
        log_success "No errors found in service logs"
    fi
    
    # Check resource usage
    log "Checking resource usage..."
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}"
    
    # Check database connectivity
    log "Checking database connectivity..."
    if docker-compose exec -T db pg_isready -U postgres > /dev/null 2>&1; then
        log_success "Database is accessible"
    else
        log_error "Database is not accessible"
        return 1
    fi
    
    # Check Redis connectivity
    log "Checking Redis connectivity..."
    if docker-compose exec -T redis redis-cli ping > /dev/null 2>&1; then
        log_success "Redis is accessible"
    else
        log_error "Redis is not accessible"
        return 1
    fi
    
    log_success "Post-deployment checks completed"
}

# Rollback deployment
rollback_deployment() {
    log "Rolling back deployment..."
    
    if [[ -z "$ROLLBACK_VERSION" ]]; then
        log_error "No rollback version available"
        return 1
    fi
    
    # Stop current services
    cd "$DEPLOYMENT_DIR"
    docker-compose down || true
    
    # Restore from backup
    if [[ -f "$BACKUP_DIR/latest_backup" ]]; then
        local backup_path=$(cat "$BACKUP_DIR/latest_backup")
        if [[ -d "$backup_path" ]]; then
            log "Restoring from backup: $backup_path"
            rm -rf "$DEPLOYMENT_DIR"/*
            cp -r "$backup_path"/* "$DEPLOYMENT_DIR/"
            
            # Restart services
            docker-compose up -d
            
            # Wait for services to be ready
            wait_for_services
            
            log_success "Rollback completed successfully"
        else
            log_error "Backup directory not found: $backup_path"
        fi
    else
        log_error "No backup information available"
    fi
}

# Cleanup old backups
cleanup_old_backups() {
    log "Cleaning up old backups..."
    
    # Keep only last 5 backups
    local backup_count=$(ls -1 "$BACKUP_DIR" | grep -c "${APP_NAME}_backup_" || echo "0")
    
    if [[ $backup_count -gt 5 ]]; then
        local backups_to_remove=$(ls -1t "$BACKUP_DIR" | grep "${APP_NAME}_backup_" | tail -n +6)
        
        for backup in $backups_to_remove; do
            log "Removing old backup: $backup"
            rm -rf "$BACKUP_DIR/$backup"
        done
        
        log_success "Old backups cleaned up"
    else
        log "No old backups to clean up"
    fi
}

# Main deployment function
main() {
    log "Starting production deployment of $APP_NAME..."
    
    # Check if deployment is already in progress
    if [[ -f "/tmp/${APP_NAME}_deploying" ]]; then
        log_error "Deployment already in progress"
        exit 1
    fi
    
    # Create deployment lock file
    touch "/tmp/${APP_NAME}_deploying"
    
    # Ensure lock file is removed on exit
    trap 'rm -f /tmp/${APP_NAME}_deploying' EXIT
    
    try {
        pre_deployment_checks
        create_backup
        update_code
        build_application
        run_tests
        deploy_application
        post_deployment_checks
        cleanup_old_backups
        
        log_success "Production deployment completed successfully!"
        
        # Send success notification
        send_notification "success" "Production deployment completed successfully"
        
    } catch {
        log_error "Deployment failed"
        
        # Send failure notification
        send_notification "failure" "Production deployment failed"
        
        # Rollback if possible
        rollback_deployment
        
        exit 1
    }
}

# Send notification
send_notification() {
    local status=$1
    local message=$2
    
    # Example: Send to Slack
    if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
        local color="good"
        if [[ "$status" == "failure" ]]; then
            color="danger"
        fi
        
        local payload=$(cat <<EOF
{
    "attachments": [
        {
            "color": "$color",
            "title": "Lancerscape2 Production Deployment",
            "text": "$message",
            "fields": [
                {
                    "title": "Environment",
                    "value": "Production",
                    "short": true
                },
                {
                    "title": "Status",
                    "value": "$status",
                    "short": true
                },
                {
                    "title": "Timestamp",
                    "value": "$(date -u +'%Y-%m-%d %H:%M:%S UTC')",
                    "short": false
                }
            ]
        }
    ]
}
EOF
        )
        
        curl -X POST -H 'Content-type: application/json' --data "$payload" "$SLACK_WEBHOOK_URL" || true
    fi
    
    # Example: Send email
    if [[ -n "${SMTP_HOST:-}" ]]; then
        echo "Subject: Lancerscape2 Production Deployment - $status" | \
        mail -s "Lancerscape2 Production Deployment - $status" \
             -S "smtp=$SMTP_HOST" \
             -S "smtp-auth=login" \
             -S "smtp-auth-user=$SMTP_USER" \
             -S "smtp-auth-password=$SMTP_PASS" \
             "$ADMIN_EMAIL" <<< "$message" || true
    fi
}

# Parse command line arguments
case "${1:-}" in
    --help|-h)
        echo "Usage: $0 [OPTIONS]"
        echo ""
        echo "Options:"
        echo "  --help, -h     Show this help message"
        echo "  --rollback     Rollback to previous version"
        echo "  --cleanup      Clean up old backups only"
        echo ""
        echo "Examples:"
        echo "  $0              # Deploy application"
        echo "  $0 --rollback   # Rollback deployment"
        echo "  $0 --cleanup    # Clean up old backups"
        exit 0
        ;;
    --rollback)
        rollback_deployment
        exit 0
        ;;
    --cleanup)
        cleanup_old_backups
        exit 0
        ;;
    "")
        main
        ;;
    *)
        log_error "Unknown option: $1"
        echo "Use --help for usage information"
        exit 1
        ;;
esac

#!/bin/bash

set -euo pipefail

APP_NAME="lancerscape2"
DEPLOYMENT_DIR="/opt/lancerscape2"
BACKUP_DIR="/opt/backups/lancerscape2"
LOG_FILE="/var/log/lancerscape2/deployment.log"
HEALTH_CHECK_URL="https://lancerscape2.com/health"
ROLLBACK_VERSION=""
DEPLOYMENT_TIMEOUT=300

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

trap 'handle_error $? $LINENO' ERR

handle_error() {
    local exit_code=$1
    local line_no=$2
    log_error "Error occurred in line $line_no: exit code $exit_code"
    log_error "Deployment failed. Initiating rollback..."
    rollback_deployment
    exit $exit_code
}

pre_deployment_checks() {
    log "Starting pre-deployment checks..."
    
    if [[ $EUID -eq 0 ]]; then
        log_error "This script should not be run as root"
        exit 1
    fi
    
    if ! groups $USER | grep -q docker; then
        log_error "User $USER is not in docker group"
        exit 1
    fi
    
    local required_tools=("docker" "docker-compose" "git" "curl" "jq")
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            log_error "Required tool '$tool' is not installed"
            exit 1
        fi
    done
    
    if [[ ! -d "$DEPLOYMENT_DIR" ]]; then
        log_error "Deployment directory $DEPLOYMENT_DIR does not exist"
        exit 1
    fi
    
    if [[ ! -d "$BACKUP_DIR" ]]; then
        log_warning "Backup directory $BACKUP_DIR does not exist, creating..."
        sudo mkdir -p "$BACKUP_DIR"
        sudo chown $USER:$USER "$BACKUP_DIR"
    fi
    
    if [[ ! -d "$(dirname "$LOG_FILE")" ]]; then
        sudo mkdir -p "$(dirname "$LOG_FILE")"
        sudo chown $USER:$USER "$(dirname "$LOG_FILE")"
    fi
    
    log_success "Pre-deployment checks completed"
}

create_backup() {
    log "Creating backup of current deployment..."
    
    local backup_name="${APP_NAME}_backup_$(date +'%Y%m%d_%H%M%S')"
    local backup_path="$BACKUP_DIR/$backup_name"
    
    mkdir -p "$backup_path"
    
    if [[ -d "$DEPLOYMENT_DIR" ]]; then
        cp -r "$DEPLOYMENT_DIR"/* "$backup_path/"
        log_success "Backup created at $backup_path"
    else
        log_warning "No current deployment to backup"
    fi
    
    echo "$backup_path" > "$BACKUP_DIR/latest_backup"
}

update_code() {
    log "Updating application code..."
    
    cd "$DEPLOYMENT_DIR"
    
    git stash -u || true
    git fetch origin main
    
    local current_commit=$(git rev-parse HEAD)
    local remote_commit=$(git rev-parse origin/main)
    
    if [[ "$current_commit" == "$remote_commit" ]]; then
        log_warning "No new changes to deploy"
        return 0
    fi
    
    ROLLBACK_VERSION="$current_commit"
    git pull origin main
    git submodule update --init --recursive
    
    log_success "Code updated successfully"
}

build_application() {
    log "Building application..."
    
    cd "$DEPLOYMENT_DIR"
    
    log "Building backend..."
    cd backend
    docker-compose build --no-cache --pull
    
    log "Building frontend..."
    cd ../frontend
    docker-compose build --no-cache --pull
    
    log_success "Application built successfully"
}

run_tests() {
    log "Running tests..."
    
    cd "$DEPLOYMENT_DIR"
    
    log "Running backend tests..."
    cd backend
    docker-compose run --rm app npm test || {
        log_error "Backend tests failed"
        return 1
    }
    
    log "Running frontend tests..."
    cd ../frontend
    docker-compose run --rm app npm test || {
        log_error "Frontend tests failed"
        return 1
    }
    
    log_success "All tests passed"
}

deploy_application() {
    log "Deploying application..."
    
    cd "$DEPLOYMENT_DIR"
    
    log "Stopping current services..."
    docker-compose down || true
    
    log "Starting services with new images..."
    docker-compose up -d --remove-orphans
    
    log "Waiting for services to be ready..."
    wait_for_services
    
    log_success "Application deployed successfully"
}

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

post_deployment_checks() {
    log "Running post-deployment checks..."
    
    cd "$DEPLOYMENT_DIR"
    docker-compose ps
    
    log "Checking service logs for errors..."
    if docker-compose logs --tail=100 | grep -i "error\|exception\|fatal" > /dev/null; then
        log_warning "Found errors in service logs"
        docker-compose logs --tail=100 | grep -i "error\|exception\|fatal"
    else
        log_success "No errors found in service logs"
    fi
    
    log "Checking resource usage..."
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}"
    
    log "Checking database connectivity..."
    if docker-compose exec -T db pg_isready -U postgres > /dev/null 2>&1; then
        log_success "Database is accessible"
    else
        log_error "Database is not accessible"
        return 1
    fi
    
    log "Checking Redis connectivity..."
    if docker-compose exec -T redis redis-cli ping > /dev/null 2>&1; then
        log_success "Redis is accessible"
    else
        log_error "Redis is not accessible"
        return 1
    fi
    
    log_success "Post-deployment checks completed"
}

rollback_deployment() {
    log "Rolling back deployment..."
    
    if [[ -z "$ROLLBACK_VERSION" ]]; then
        log_error "No rollback version available"
        return 1
    fi
    
    cd "$DEPLOYMENT_DIR"
    docker-compose down || true
    
    if [[ -f "$BACKUP_DIR/latest_backup" ]]; then
        local backup_path=$(cat "$BACKUP_DIR/latest_backup")
        if [[ -d "$backup_path" ]]; then
            log "Restoring from backup: $backup_path"
            rm -rf "$DEPLOYMENT_DIR"/*
            cp -r "$backup_path"/* "$DEPLOYMENT_DIR/"
            
            docker-compose up -d
            wait_for_services
            
            log_success "Rollback completed successfully"
        else
            log_error "Backup directory not found: $backup_path"
        fi
    else
        log_error "No backup information available"
    fi
}

cleanup_old_backups() {
    log "Cleaning up old backups..."
    
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

main() {
    log "Starting deployment of $APP_NAME..."
    
    if [[ -f "/tmp/${APP_NAME}_deploying" ]]; then
        log_error "Deployment already in progress"
        exit 1
    fi
    
    touch "/tmp/${APP_NAME}_deploying"
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
        
        log_success "Deployment completed successfully!"
        send_notification "success" "Deployment completed successfully"
        
    } catch {
        log_error "Deployment failed"
        send_notification "failure" "Deployment failed"
        rollback_deployment
        exit 1
    }
}

send_notification() {
    local status=$1
    local message=$2
    
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
            "title": "Lancerscape2 Deployment",
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
    
    if [[ -n "${SMTP_HOST:-}" ]]; then
        echo "Subject: Lancerscape2 Deployment - $status" | \
        mail -s "Lancerscape2 Deployment - $status" \
             -S "smtp=$SMTP_HOST" \
             -S "smtp-auth=login" \
             -S "smtp-auth-user=$SMTP_USER" \
             -S "smtp-auth-password=$SMTP_PASS" \
             "$ADMIN_EMAIL" <<< "$message" || true
    fi
}

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

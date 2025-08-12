#!/bin/bash

# Lancerscape2 Backend Setup Script
# This script sets up the complete backend infrastructure

set -e

echo "🚀 Starting Lancerscape2 Backend Setup..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_dependencies() {
    print_status "Checking dependencies..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+ first."
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm first."
        exit 1
    fi
    
    # Check Docker (optional)
    if ! command -v docker &> /dev/null; then
        print_warning "Docker is not installed. Some services will need to be installed manually."
    fi
    
    # Check PostgreSQL
    if ! command -v psql &> /dev/null; then
        print_warning "PostgreSQL is not installed. Please install PostgreSQL or use Docker."
    fi
    
    # Check Redis
    if ! command -v redis-cli &> /dev/null; then
        print_warning "Redis is not installed. Please install Redis or use Docker."
    fi
    
    print_success "Dependencies check completed"
}

# Setup environment variables
setup_environment() {
    print_status "Setting up environment variables..."
    
    if [ ! -f .env ]; then
        cp env.example .env
        print_success "Created .env file from template"
        print_warning "Please update .env file with your actual configuration values"
    else
        print_warning ".env file already exists. Skipping creation."
    fi
}

# Install dependencies
install_dependencies() {
    print_status "Installing Node.js dependencies..."
    npm install
    print_success "Dependencies installed successfully"
}

# Setup database
setup_database() {
    print_status "Setting up database..."
    
    # Check if PostgreSQL is running
    if command -v psql &> /dev/null; then
        # Try to connect to PostgreSQL
        if psql -h localhost -U postgres -c "SELECT 1;" &> /dev/null; then
            print_success "PostgreSQL is running"
            
            # Create database if it doesn't exist
            if ! psql -h localhost -U postgres -lqt | cut -d \| -f 1 | grep -qw lancerscape2; then
                print_status "Creating database 'lancerscape2'..."
                createdb -h localhost -U postgres lancerscape2
                print_success "Database 'lancerscape2' created"
            else
                print_warning "Database 'lancerscape2' already exists"
            fi
        else
            print_error "Cannot connect to PostgreSQL. Please ensure PostgreSQL is running and accessible."
            print_warning "You can start PostgreSQL with: sudo service postgresql start"
        fi
    else
        print_warning "PostgreSQL not found. Please install PostgreSQL or use Docker."
    fi
}

# Setup Redis
setup_redis() {
    print_status "Setting up Redis..."
    
    if command -v redis-cli &> /dev/null; then
        if redis-cli ping &> /dev/null; then
            print_success "Redis is running"
        else
            print_warning "Redis is not running. Please start Redis with: sudo service redis start"
        fi
    else
        print_warning "Redis not found. Please install Redis or use Docker."
    fi
}

# Run database migrations
run_migrations() {
    print_status "Running database migrations..."
    
    if npm run migrate &> /dev/null; then
        print_success "Database migrations completed"
    else
        print_error "Failed to run migrations. Please check your database connection."
        print_warning "You can run migrations manually with: npm run migrate"
    fi
}

# Run database seeds
run_seeds() {
    print_status "Running database seeds..."
    
    if npm run seed &> /dev/null; then
        print_success "Database seeds completed"
    else
        print_warning "Failed to run seeds. You can run them manually with: npm run seed"
    fi
}

# Build the application
build_application() {
    print_status "Building the application..."
    npm run build
    print_success "Application built successfully"
}

# Setup Docker services (optional)
setup_docker() {
    if command -v docker &> /dev/null; then
        print_status "Setting up Docker services..."
        
        # Check if docker-compose.yml exists
        if [ -f docker-compose.yml ]; then
            print_status "Starting Docker services..."
            docker-compose up -d
            print_success "Docker services started"
        else
            print_warning "docker-compose.yml not found. Skipping Docker setup."
        fi
    fi
}

# Create PM2 ecosystem file
setup_pm2() {
    print_status "Setting up PM2 configuration..."
    
    if [ ! -f ecosystem.config.js ]; then
        cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'lancerscape2-backend',
    script: 'dist/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
EOF
        print_success "PM2 configuration created"
    fi
}

# Create logs directory
create_logs_directory() {
    print_status "Creating logs directory..."
    mkdir -p logs
    print_success "Logs directory created"
}

# Main setup function
main() {
    echo "=========================================="
    echo "🚀 Lancerscape2 Backend Setup"
    echo "=========================================="
    
    check_dependencies
    setup_environment
    install_dependencies
    setup_database
    setup_redis
    run_migrations
    run_seeds
    build_application
    setup_docker
    setup_pm2
    create_logs_directory
    
    echo ""
    echo "=========================================="
    print_success "Setup completed successfully!"
    echo "=========================================="
    echo ""
    echo "Next steps:"
    echo "1. Update .env file with your actual configuration values"
    echo "2. Start the server with: npm run dev (development) or npm start (production)"
    echo "3. Access the API at: http://localhost:3000"
    echo "4. Check the documentation at: http://localhost:3000/api-docs"
    echo ""
    echo "For production deployment:"
    echo "1. Set NODE_ENV=production in .env"
    echo "2. Use PM2: pm2 start ecosystem.config.js"
    echo "3. Set up reverse proxy (nginx) for SSL termination"
    echo ""
}

# Run main function
main "$@" 
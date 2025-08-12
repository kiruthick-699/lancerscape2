#!/bin/bash

# Lancerscape2 Quick Start Script
# This script sets up the complete application in one go

set -e

echo "🚀 Lancerscape2 Quick Start"
echo "============================"

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

# Check if Docker is available
check_docker() {
    if command -v docker &> /dev/null; then
        return 0
    else
        return 1
    fi
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
    
    print_success "Dependencies check completed"
}

# Setup environment files
setup_environment() {
    print_status "Setting up environment files..."
    
    # Backend environment
    if [ ! -f backend/.env ]; then
        cp backend/env.example backend/.env
        print_success "Created backend/.env"
    fi
    
    # Frontend environment
    if [ ! -f .env ]; then
        cp env.example .env
        print_success "Created .env"
    fi
    
    print_warning "Please update the environment files with your actual configuration values"
}

# Start Docker services
start_docker_services() {
    if check_docker; then
        print_status "Starting Docker services..."
        cd backend
        docker-compose up -d postgres redis
        cd ..
        print_success "Docker services started"
        
        # Wait for services to be ready
        print_status "Waiting for services to be ready..."
        sleep 30
    else
        print_warning "Docker not found. Please ensure PostgreSQL and Redis are running manually."
    fi
}

# Setup backend
setup_backend() {
    print_status "Setting up backend..."
    cd backend
    
    # Install dependencies
    print_status "Installing backend dependencies..."
    npm install
    
    # Run setup script if it exists
    if [ -f scripts/setup.sh ]; then
        chmod +x scripts/setup.sh
        ./scripts/setup.sh
    else
        # Manual setup
        print_status "Running database migrations..."
        npm run migrate || print_warning "Migrations failed - you may need to set up the database manually"
        
        print_status "Running database seeds..."
        npm run seed || print_warning "Seeds failed - you may need to run them manually"
    fi
    
    cd ..
    print_success "Backend setup completed"
}

# Setup frontend
setup_frontend() {
    print_status "Setting up frontend..."
    
    # Install dependencies
    print_status "Installing frontend dependencies..."
    npm install
    
    print_success "Frontend setup completed"
}

# Start the application
start_application() {
    print_status "Starting the application..."
    
    # Start backend in background
    print_status "Starting backend server..."
    cd backend
    npm run dev &
    BACKEND_PID=$!
    cd ..
    
    # Wait for backend to be ready
    print_status "Waiting for backend to be ready..."
    sleep 10
    
    # Start frontend
    print_status "Starting frontend..."
    npm start &
    FRONTEND_PID=$!
    
    print_success "Application started!"
    echo ""
    echo "=========================================="
    echo "🎉 Lancerscape2 is now running!"
    echo "=========================================="
    echo ""
    echo "Backend API: http://localhost:3000"
    echo "Frontend: http://localhost:19006 (Expo)"
    echo "API Documentation: http://localhost:3000/api-docs"
    echo ""
    echo "To stop the application:"
    echo "1. Press Ctrl+C in this terminal"
    echo "2. Or run: kill $BACKEND_PID $FRONTEND_PID"
    echo ""
    echo "Next steps:"
    echo "1. Update .env files with your configuration"
    echo "2. Connect your wallet in the app"
    echo "3. Create a test account"
    echo "4. Post your first job!"
    echo ""
    
    # Wait for user to stop
    wait
}

# Main function
main() {
    check_dependencies
    setup_environment
    start_docker_services
    setup_backend
    setup_frontend
    start_application
}

# Handle script interruption
trap 'echo ""; print_warning "Stopping application..."; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0' INT

# Run main function
main "$@" 
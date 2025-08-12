#!/bin/bash

# Lancerscape2 Test Setup Script
# This script tests all components to ensure everything is working correctly

set -e

echo "🧪 Lancerscape2 Test Setup"
echo "=========================="

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

# Test database connection
test_database() {
    print_status "Testing database connection..."
    
    if command -v psql &> /dev/null; then
        if psql -h localhost -U postgres -d lancerscape2 -c "SELECT 1;" &> /dev/null; then
            print_success "Database connection successful"
            return 0
        else
            print_error "Database connection failed"
            return 1
        fi
    else
        print_warning "PostgreSQL not found, skipping database test"
        return 0
    fi
}

# Test Redis connection
test_redis() {
    print_status "Testing Redis connection..."
    
    if command -v redis-cli &> /dev/null; then
        if redis-cli ping &> /dev/null; then
            print_success "Redis connection successful"
            return 0
        else
            print_error "Redis connection failed"
            return 1
        fi
    else
        print_warning "Redis not found, skipping Redis test"
        return 0
    fi
}

# Test backend API
test_backend() {
    print_status "Testing backend API..."
    
    # Check if backend is running
    if curl -s http://localhost:3000/health &> /dev/null; then
        print_success "Backend API is running"
        
        # Test health endpoint
        response=$(curl -s http://localhost:3000/health)
        if echo "$response" | grep -q "healthy"; then
            print_success "Backend health check passed"
        else
            print_error "Backend health check failed"
            return 1
        fi
    else
        print_error "Backend API is not running"
        return 1
    fi
}

# Test frontend
test_frontend() {
    print_status "Testing frontend..."
    
    # Check if Expo is running
    if curl -s http://localhost:19006 &> /dev/null; then
        print_success "Frontend (Expo) is running"
    else
        print_warning "Frontend (Expo) is not running"
    fi
}

# Test environment variables
test_environment() {
    print_status "Testing environment variables..."
    
    # Check backend .env
    if [ -f backend/.env ]; then
        print_success "Backend .env file exists"
    else
        print_error "Backend .env file missing"
        return 1
    fi
    
    # Check frontend .env
    if [ -f .env ]; then
        print_success "Frontend .env file exists"
    else
        print_error "Frontend .env file missing"
        return 1
    fi
}

# Test dependencies
test_dependencies() {
    print_status "Testing dependencies..."
    
    # Check Node.js
    if command -v node &> /dev/null; then
        node_version=$(node --version)
        print_success "Node.js version: $node_version"
    else
        print_error "Node.js not found"
        return 1
    fi
    
    # Check npm
    if command -v npm &> /dev/null; then
        npm_version=$(npm --version)
        print_success "npm version: $npm_version"
    else
        print_error "npm not found"
        return 1
    fi
}

# Test blockchain configuration
test_blockchain() {
    print_status "Testing blockchain configuration..."
    
    # Check if RPC URL is configured
    if grep -q "YOUR_PROJECT_ID" .env; then
        print_warning "Blockchain RPC URL not configured (using demo mode)"
    else
        print_success "Blockchain RPC URL configured"
    fi
    
    # Check if contract addresses are configured
    if grep -q "0x..." .env; then
        print_warning "Contract addresses not configured (using demo mode)"
    else
        print_success "Contract addresses configured"
    fi
}

# Test authentication flow
test_authentication() {
    print_status "Testing authentication flow..."
    
    # Test registration endpoint
    if curl -s -X POST http://localhost:3000/api/auth/register \
        -H "Content-Type: application/json" \
        -d '{"email":"test@example.com","username":"testuser","firstName":"Test","lastName":"User","password":"password123","userType":"client"}' \
        &> /dev/null; then
        print_success "Registration endpoint accessible"
    else
        print_error "Registration endpoint not accessible"
        return 1
    fi
}

# Test job posting
test_job_posting() {
    print_status "Testing job posting functionality..."
    
    # This would require authentication, so we'll just check if the endpoint exists
    if curl -s -X GET http://localhost:3000/api/jobs &> /dev/null; then
        print_success "Jobs endpoint accessible"
    else
        print_error "Jobs endpoint not accessible"
        return 1
    fi
}

# Main test function
main() {
    echo "=========================================="
    echo "🧪 Lancerscape2 Component Testing"
    echo "=========================================="
    
    local exit_code=0
    
    # Run all tests
    test_dependencies || exit_code=1
    test_environment || exit_code=1
    test_database || exit_code=1
    test_redis || exit_code=1
    test_backend || exit_code=1
    test_frontend || exit_code=1
    test_blockchain || exit_code=1
    test_authentication || exit_code=1
    test_job_posting || exit_code=1
    
    echo ""
    echo "=========================================="
    if [ $exit_code -eq 0 ]; then
        print_success "All tests passed! 🎉"
        echo ""
        echo "Your Lancerscape2 application is ready to use!"
        echo ""
        echo "Next steps:"
        echo "1. Open http://localhost:19006 in your browser"
        echo "2. Register a new account"
        echo "3. Connect your wallet"
        echo "4. Post your first job!"
    else
        print_error "Some tests failed! ❌"
        echo ""
        echo "Please check the errors above and fix them before proceeding."
        echo ""
        echo "Common issues:"
        echo "1. Database not running: sudo service postgresql start"
        echo "2. Redis not running: sudo service redis start"
        echo "3. Backend not running: cd backend && npm run dev"
        echo "4. Frontend not running: npm start"
    fi
    echo "=========================================="
    
    exit $exit_code
}

# Run main function
main "$@" 
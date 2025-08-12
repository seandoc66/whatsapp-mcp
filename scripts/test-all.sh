#!/bin/bash

# WhatsApp Reply Assistant - Test Runner Script
# Runs all tests for the project

set -e  # Exit on any error

echo "🧪 Running WhatsApp Reply Assistant Test Suite"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "CLAUDE.md" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

# Function to run tests for a component
run_component_tests() {
    local component=$1
    local directory=$2
    
    print_status "Testing $component..."
    
    if [ ! -d "$directory" ]; then
        print_warning "$component directory not found, skipping..."
        return 0
    fi
    
    cd "$directory"
    
    # Check if package.json exists
    if [ ! -f "package.json" ]; then
        print_warning "No package.json found in $directory, skipping..."
        cd ..
        return 0
    fi
    
    # Install dependencies if node_modules doesn't exist
    if [ ! -d "node_modules" ]; then
        print_status "Installing $component dependencies..."
        npm install
    fi
    
    # Run tests
    if npm test -- --watchAll=false --coverage; then
        print_success "$component tests passed"
    else
        print_error "$component tests failed"
        cd ..
        return 1
    fi
    
    cd ..
    return 0
}

# Main test execution
main() {
    local exit_code=0
    
    print_status "Starting test suite..."
    
    # Backend Tests
    if ! run_component_tests "Backend" "backend"; then
        exit_code=1
    fi
    
    echo ""
    
    # Frontend Tests  
    if ! run_component_tests "Frontend" "frontend"; then
        exit_code=1
    fi
    
    echo ""
    echo "=============================================="
    
    if [ $exit_code -eq 0 ]; then
        print_success "All tests passed! 🎉"
        echo ""
        print_status "Test Coverage Reports:"
        [ -d "backend/coverage" ] && echo "  📊 Backend: backend/coverage/index.html"
        [ -d "frontend/coverage" ] && echo "  📊 Frontend: frontend/coverage/lcov-report/index.html"
    else
        print_error "Some tests failed. Please check the output above."
    fi
    
    return $exit_code
}

# Handle script interruption
trap 'print_warning "Test run interrupted"; exit 130' INT

# Run main function
main "$@"
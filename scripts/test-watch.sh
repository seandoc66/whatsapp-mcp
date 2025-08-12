#!/bin/bash

# WhatsApp Reply Assistant - Development Test Watcher
# Runs tests in watch mode for development

set -e

echo "👀 Starting WhatsApp Reply Assistant Development Test Watcher"
echo "==========================================================="

# Colors for output
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"
}

# Check component argument
COMPONENT=${1:-"backend"}

case $COMPONENT in
    "backend"|"be")
        print_status "Starting backend tests in watch mode..."
        cd backend
        npm test -- --watch
        ;;
    "frontend"|"fe")
        print_status "Starting frontend tests in watch mode..."
        cd frontend
        npm test
        ;;
    *)
        echo "Usage: $0 [backend|frontend]"
        echo "  backend, be  - Run backend tests in watch mode"
        echo "  frontend, fe - Run frontend tests in watch mode"
        exit 1
        ;;
esac
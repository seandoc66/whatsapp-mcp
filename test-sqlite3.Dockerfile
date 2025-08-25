FROM node:18-alpine

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Create minimal package.json
RUN echo '{"name": "sqlite3-test", "dependencies": {"sqlite3": "^5.1.6"}}' > package.json

# Install and rebuild sqlite3
RUN npm install && npm rebuild sqlite3

# Test script
RUN echo 'const sqlite3 = require("sqlite3"); console.log("✅ sqlite3 loaded successfully");' > test.js

# Run test
CMD ["node", "test.js"]
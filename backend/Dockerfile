FROM node:18-alpine

WORKDIR /app

# Install build dependencies for native modules (ARM64/M1 compatible)
RUN apk add --no-cache python3 py3-setuptools make g++ sqlite sqlite-dev libc6-compat

# Copy package files
COPY package*.json ./

# Install dependencies fresh with ARM64 support
RUN npm ci --only=production && \
    npm cache clean --force

# Copy source code (excluding node_modules)
COPY src ./src
COPY *.js ./

# Expose port
EXPOSE 3001

# Start the application
CMD ["npm", "start"]
FROM node:18-alpine

WORKDIR /app

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install dependencies fresh (no node_modules from host)
RUN npm ci --only=production && npm rebuild sqlite3 && npm cache clean --force

# Copy source code (excluding node_modules)
COPY src ./src
COPY *.js ./

# Expose port
EXPOSE 3001

# Start the application
CMD ["npm", "start"]
FROM n8nio/n8n:latest

# Switch to root to install packages
USER root

# Install SQLite and Python dependencies for the workflows
RUN apk add --no-cache \
    sqlite \
    python3 \
    py3-pip \
    nodejs \
    npm

# Install required Python packages for ChromaDB operations
RUN pip3 install --no-cache-dir --break-system-packages \
    chromadb

# Install required Node.js packages for SQLite operations  
RUN npm install -g sqlite3

# Switch back to node user
USER node

# Set working directory
WORKDIR /home/node

# Default command
CMD ["n8n"]
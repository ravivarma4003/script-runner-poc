# Use Node.js 20 Alpine for smaller image size
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install build dependencies for isolated-vm
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    linux-headers

# Copy package files
COPY package*.json ./

# Copy application code
COPY . .

# Install dependencies (this ensures native modules are compiled for the container architecture)
RUN npm ci --only=production

# Create scripts directory if it doesn't exist
RUN mkdir -p scripts

# Expose port
EXPOSE 3000


# Run the server
CMD ["node", "--no-node-snapshot", "server.js"]

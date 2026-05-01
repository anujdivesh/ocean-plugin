# Multi-stage build: Build with Node.js, serve with nginx
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files first (for better caching)
COPY package*.json ./

# Install dependencies: try npm ci first; if lock file is out of sync, fall back to npm install
RUN if [ -f package-lock.json ] || [ -f npm-shrinkwrap.json ]; then \
        echo "Lock file detected. Attempting npm ci..."; \
        (npm ci --omit=dev && echo "npm ci succeeded") || \
        (echo "npm ci failed (lock file out of sync). Falling back to npm install..." && npm install --omit=dev); \
    else \
        echo "No lock file found; using npm install (non-reproducible)" && npm install --omit=dev; \
    fi

# Copy all source files
COPY . .

# Build the React application (allow warnings)
RUN CI=false DISABLE_ESLINT_PLUGIN=true npm run build

# Production stage: Use nginx to serve the built files
FROM nginx:alpine

# Copy built files from builder stage
COPY --from=builder /app/build /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install git (required for some npm packages)
RUN apk add --no-cache git

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production --no-optional

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy node_modules from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy application code
COPY --chown=nodejs:nodejs . .

# Create necessary directories with proper ownership
# Must be done AFTER COPY to ensure correct permissions
# Run as root to ensure permissions are set correctly
RUN mkdir -p /app/sessions /app/logs /app/uploads/temp /app/uploads/media /app/uploads/avatars && \
    chmod -R 775 /app/sessions /app/logs /app/uploads && \
    chown -R nodejs:nodejs /app/sessions /app/logs /app/uploads

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Start application with dumb-init
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/app.js"]

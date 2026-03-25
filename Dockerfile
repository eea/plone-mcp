# Stage 1: Build the application
FROM node:22-alpine AS builder

WORKDIR /app

# Copy pnpm-lock.yaml and package.json to leverage Docker cache
COPY package.json pnpm-lock.yaml ./

# Install pnpm and then install dependencies
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Copy the rest of the application code
COPY . .

# Build the application
RUN pnpm run build

# Stage 2: Run the application
FROM node:22-alpine AS runner

WORKDIR /app

# Copy pnpm-lock.yaml and package.json for production dependencies
COPY package.json pnpm-lock.yaml ./

# Install pnpm and then install only production dependencies
RUN npm install -g pnpm && pnpm install --prod --frozen-lockfile

# Copy the built application from the builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/blocks.json ./src/blocks.json
COPY --from=builder /app/typescript-sdk ./typescript-sdk

# Expose the port for the HTTP server
EXPOSE 3001

# Command to run the application (HTTP server by default)
CMD ["node", "dist/http-server.js"]

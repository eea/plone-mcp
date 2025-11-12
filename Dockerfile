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

# Expose the port if the application listens on one (e.g., 3000 for a web server)
# This is a CLI tool, so it might not listen on a port, but it's good practice
# if it were to evolve into a server.
# EXPOSE 3000

# Command to run the application
CMD ["node", "dist/index.js"]

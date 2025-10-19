# syntax=docker/dockerfile:1.7

############################################
# Base image: Node with PNPM
############################################
FROM node:22-alpine AS base
WORKDIR /app

# Enable pnpm via corepack (pinned for reproducibility)
RUN corepack enable && corepack prepare pnpm@9.12.3 --activate

# Install deps using lockfile
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

############################################
# Development stage: Vite dev server
############################################
FROM base AS dev
ENV NODE_ENV=development
WORKDIR /app

# Copy project sources
COPY . .

# Vite dev server
EXPOSE 5173

# Reliable file watching inside containers (Windows/macOS)
ENV CHOKIDAR_USEPOLLING=true

# Start Vite dev server bound to 0.0.0.0
CMD ["pnpm", "dev", "--", "--host", "0.0.0.0", "--strictPort", "--port", "5173"]

############################################
# Build stage
############################################
FROM base AS build
ENV NODE_ENV=production
WORKDIR /app

COPY . .
RUN pnpm build

############################################
# Production stage: serve built assets with Vite preview
############################################
FROM base AS prod
ENV NODE_ENV=production
WORKDIR /app

# Only dist is needed at runtime; node_modules contain vite CLI to preview
COPY --from=build /app/dist /app/dist

# Serve on port 80 inside the container
EXPOSE 80
CMD ["pnpm", "preview", "--host", "0.0.0.0", "--port", "80", "--strictPort"]

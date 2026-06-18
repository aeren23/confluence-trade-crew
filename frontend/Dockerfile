# Stage 1: Build
FROM node:20-alpine AS build
WORKDIR /app

# Copy package files first (layer caching)
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy source and build
COPY . .

# VITE_API_BASE_URL is injected at build time via environment variable
ARG VITE_API_BASE_URL=http://localhost:5000
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

RUN npm run build

# Stage 2: Serve with lightweight HTTP server
FROM node:20-alpine AS runtime
WORKDIR /app

# Install serve globally for the static build
RUN npm install -g serve

# Create non-root user
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser
USER appuser

COPY --from=build /app/dist ./dist

EXPOSE 3000

CMD ["serve", "-s", "dist", "-l", "3000"]

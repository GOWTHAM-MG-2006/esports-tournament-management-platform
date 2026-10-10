# Frontend image: Vite build + nginx serving SPA, /api proxied to backend.
# Build context is the REPO ROOT.
FROM node:22-alpine AS build

WORKDIR /app
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci
COPY frontend/ ./
# Force same-origin /api (proxied by nginx below). Without this, a stale
# VITE_API_URL baked in at build time would point browsers at an
# unreachable host and every API call would fail with Network Error.
ARG VITE_API_URL=/api
RUN VITE_API_URL=$VITE_API_URL npm run build

FROM nginx:alpine
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80

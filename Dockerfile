# The "web" image: the built SPA, served by nginx, which is also the gateway
# to every backend. See nginx.conf for why the browser only ever sees one origin.

# ---------------------------------------------------------------- build
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Every service URL is a same-origin relative path, routed by nginx.conf.
# Vite inlines VITE_* at build time, so these are build args, not runtime env:
# changing one means rebuilding this image (`docker compose build web`).
#
#   /api        -> backend/        (Express)      - http.ts hardcodes it already
#   /svc/adk    -> Elze-backend    (ADK API :8300)
#   /svc/mojo   -> Mojo agent      (:8080)
#
# Not /agent or /api for Mojo: /agent/:id is a client-side route, and /api
# belongs to the Express backend.
ARG VITE_ADK_API_BASE_URL=/svc/adk
ARG VITE_AGENT_API_BASE_URL=/svc/mojo
ARG VITE_CONTEXT_API_URL=
ARG VITE_ADK_API_KEY=
ENV VITE_ADK_API_BASE_URL=$VITE_ADK_API_BASE_URL \
    VITE_AGENT_API_BASE_URL=$VITE_AGENT_API_BASE_URL \
    VITE_CONTEXT_API_URL=$VITE_CONTEXT_API_URL \
    VITE_ADK_API_KEY=$VITE_ADK_API_KEY

RUN npm run build

# ---------------------------------------------------------------- serve
FROM nginx:1.29-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80

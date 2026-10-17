# Imagem de produção: build estático com Bun, servido pelo nginx.
# Usada no deploy pela Coolify (build pack "Dockerfile", porta 80).

# --- Estágio 1: build ---
FROM oven/bun:1.3.14-alpine AS build
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

# --- Estágio 2: servidor estático ---
FROM nginx:1.27-alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1

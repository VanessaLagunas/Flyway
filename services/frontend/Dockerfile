# Etapa 1: Compilación de la SPA con Node 20
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
ARG VITE_BFF_URL=/api/v1
ARG VITE_GOOGLE_CLIENT_ID=""
ENV VITE_BFF_URL=$VITE_BFF_URL
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
RUN npm run build

# Etapa 2: Servidor estático y Reverse Proxy Nginx hacia BFF
FROM nginx:alpine
ENV NGINX_ENTRYPOINT_LOCAL_RESOLVERS=1
ENV NGINX_ENVSUBST_FILTER="^(NGINX_LOCAL_RESOLVERS|BFF_UPSTREAM)$"
COPY --from=builder /app/dist /usr/share/nginx/html
COPY 18-bff-upstream.envsh /docker-entrypoint.d/18-bff-upstream.envsh
COPY nginx.conf /etc/nginx/templates/default.conf.template
RUN sed -i 's/\r$//' /docker-entrypoint.d/18-bff-upstream.envsh /etc/nginx/templates/default.conf.template \
    && chmod +x /docker-entrypoint.d/18-bff-upstream.envsh
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

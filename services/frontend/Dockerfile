# Etapa 1: Compilación de la SPA con Node 20
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
ARG VITE_BFF_URL=http://localhost:4000/api/v1
ENV VITE_BFF_URL=$VITE_BFF_URL
RUN npm run build

# Etapa 2: Servidor estático Nginx de alta eficiencia
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

# ✈️ Flyway · Planificador Inteligente de Rutas e Itinerarios (Microservices Edition)

**Flyway** es una plataforma distribuida basada en **Microservicios y Contenedores Docker** bajo un esquema **Monorepo**, diseñada para generar itinerarios de viaje cronológicos, realistas y personalizados. Cuenta con cobertura especializada en destinos y comunas de **Chile** (gastronomía típica, traslados locales y cálculo de presupuestos en **CLP**) y del **mundo**, impulsada por modelos de IA con un motor de resiliencia local (*Offline Fallback*) y fotografía de alta resolución.

## 🏗️ Arquitectura del Sistema y Microservicios

El proyecto se desacopla en **5 contenedores independientes** orquestados mediante **Docker Compose** sobre una red privada interna (`flyway-net`):

| 

| **Servicio / Contenedor** | **Puerto** | **Tecnología Principal** | **Rol en la Arquitectura** | 
| **Servicio / Contenedor** | **Puerto** | **Tecnología Principal** | **Rol en la Arquitectura** | 
| **`frontend`** | `3000:80` *(Público)* | React 19, Vite 8, Tailwind v4, Nginx | Interfaz de usuario (SPA) compilada y servida en estáticos de alto rendimiento con `nginx:alpine`. | 
| **`bff-service`** | `4000:4000` *(Público)* | Node.js 20, Express, TypeScript | **Backend For Frontend / API Gateway**. Único punto de entrada para el cliente, validación y enrutamiento interno. | 
| **`ai-service`** | `4001` *(Interno)* | Express, Gemini SDK, OpenRouter | Generación de itinerarios con IA y activación automática del **Motor Local / Offline** de respaldo. | 
| **`catalog-service`** | `4002` *(Interno)* | Express, Node-Postgres (`pg`), Pexels | Gestión del catálogo de destinos (Chile/Mundo), caché fotográfico y persistencia de rutas guardadas. | 
| **`postgres-db`** | `5432` *(Interno)* | PostgreSQL 16 (`postgres:16-alpine`) | Base de datos relacional y documental (`JSONB`) con volumen persistente (`pgdata`). | 

## 🛠️ Stack Tecnológico, QA y DevOps

* **Frontend:** React 19, Vite 8, Tailwind CSS v4, TypeScript, Lucide React, Motion v12, Nginx.

* **Microservicios Backend:** Node.js (`node:20-alpine`), Express.js, Esbuild, TypeScript.

* **Base de Datos:** PostgreSQL 16 (Tablas relacionales + columnas `JSONB` para itinerarios dinámicos y caché de Pexels).

* **Integraciones Externas:** Google Gemini SDK (`@google/genai`), OpenRouter API y Pexels API.

* **API Testing as Code (QA):** **Bruno** (`.bru`) y **Bruno CLI** (`@usebruno/cli`) para pruebas de contrato, tiempos de respuesta y resiliencia.

* **Infraestructura y CI/CD:** Entorno **Linux (WSL2 - Ubuntu)**, Docker & Docker Compose, **GitHub Actions** y **GitHub Container Registry (GHCR)**.

## 📋 Requisitos Previos

Para levantar la arquitectura completa en tu entorno local, asegúrate de contar con:

1. **WSL2 con Ubuntu** (Windows Subsystem for Linux) o entorno Linux nativo.

2. **Docker Desktop** (con la opción *Settings > Resources > WSL Integration > Ubuntu* activada) o **Docker Engine + Docker Compose**.

3. **Node.js 20+** y **npm** (opcional en el host, requerido para ejecutar Bruno CLI localmente).

Verifica tu entorno en la terminal de Ubuntu (WSL2) ejecutando:

```
docker -v
docker compose version
node -v

```

## 🚀 Instalación y Puesta en Marcha Paso a Paso (Docker + WSL2)

### 1. Clonar y acceder al repositorio en tu entorno Linux (WSL2)

Abre tu terminal de **Ubuntu (WSL2)** y sitúate en la carpeta del proyecto:

```
git clone https://github.com/tu-usuario/flyway.git
cd flyway

```

### 2. Configurar las Variables de Entorno (`.env`)

El proyecto incluye una plantilla `.env.example` en la raíz para inyectar las credenciales a los contenedores:

```
cp .env.example .env

```

Edita el archivo `.env` (`nano .env`) con tus claves (opcionales gracias al modo offline):

```
# --- Claves de IA y Multimedia (Opcionales) ---
GEMINI_API_KEY=tu_clave_gemini_aqui
OPENROUTER_API_KEY=tu_clave_openrouter_aqui
PEXELS_API_KEY=tu_clave_pexels_aqui

# --- Credenciales de Base de Datos PostgreSQL ---
POSTGRES_USER=flyway_user
POSTGRES_PASSWORD=flyway_secret_pass
POSTGRES_DB=flyway_db
DATABASE_URL=postgresql://flyway_user:flyway_secret_pass@postgres-db:5432/flyway_db

# --- Comunicación de Red ---
VITE_BFF_URL=http://localhost:4000/api/v1

```

> 💡 **Modo Offline / Respaldo Activo:** Si dejas vacías las claves de Gemini, OpenRouter o Pexels, el microservicio `ai-service` y `catalog-service` activarán automáticamente el motor local con datos preintegrados de Chile y el mundo.

### 3. Construir y levantar los 5 microservicios con Docker Compose

Ejecuta el siguiente comando en la raíz del proyecto para compilar las imágenes *multi-stage*, inicializar la base de datos con `database/init.sql` y encender toda la red:

```
docker compose up --build -d

```

### 4. Verificar el estado de los contenedores

Comprueba que los 5 servicios estén corriendo correctamente (`Up`):

```
docker compose ps

```

Accesos disponibles en tu navegador y entorno local:

* 🌐 **Aplicación Web (Frontend Nginx):** <http://localhost:3000>

* 🔌 **API Gateway (BFF Healthcheck):** <http://localhost:4000/api/v1/health>

## 🧪 Ejecución de Pruebas Automatizadas de API (Bruno)

El repositorio incluye una colección de pruebas bajo el enfoque **API Testing as Code** dentro del directorio `/bruno`.

### Opción A: Ejecución por Consola (Bruno CLI en WSL2)

Instala el CLI de Bruno globalmente y ejecuta la batería de pruebas apuntando al entorno Docker local:

```
# Instalar Bruno CLI (solo la primera vez)
npm install -g @usebruno/cli

# Ejecutar todos los tests y assertions contra el BFF
cd bruno
bru run --env local

```

### Opción B: Ejecución en Interfaz Gráfica (Bruno Desktop)

1. Abre la aplicación de escritorio **Bruno**.

2. Selecciona **Open Collection** y elige la carpeta `flyway/bruno`.

3. En la esquina superior derecha, selecciona el entorno **`local`** (`http://localhost:4000`) o **`cloud`** y ejecuta las peticiones.

## 📜 Comandos Útiles de Operación y Desarrollo

| **Comando** | **Descripción** | 
| `docker compose up --build -d` | Construye y levanta los 5 microservicios en segundo plano | 
| `docker compose ps` | Lista los contenedores activos, sus estados y puertos | 
| `docker compose logs -f` | Muestra los logs en tiempo real de todos los microservicios | 
| `docker compose logs -f bff-service ai-service` | Muestra los logs únicamente del BFF y del servicio de IA | 
| `docker compose down` | Detiene y elimina los contenedores conservando los datos de PostgreSQL | 
| `docker compose down -v` | Detiene los contenedores y reinicia desde cero el volumen de PostgreSQL (`pgdata`) | 
| `cd bruno && bru run --env local` | Ejecuta las pruebas automatizadas de contrato y rendimiento con Bruno CLI | 

## 🔄 Flujo de Trabajo Git y Pipeline CI/CD

El proyecto implementa integración y despliegue continuo en **`.github/workflows/ci-cd.yml`**:

1. **Ramas de trabajo:** `main` (producción), `develop` (integración) y `feature/*` (desarrollo por microservicio).

2. **Etapa 1 - CI (Linting):** Valida el tipado estático de TypeScript (`tsc --noEmit`) en cada microservicio al crear un *Push* o *Pull Request*.

3. **Etapa 2 - Automated QA:** Levanta los 5 contenedores en el runner de Ubuntu de GitHub Actions y ejecuta `bru run --env local` con Bruno CLI.

4. **Etapa 3 - Docker Registry:** Construye las imágenes productivas y las publica en **GitHub Container Registry (GHCR)**.

5. **Etapa 4 - CD (Cloud Deploy):** Conecta vía SSH a la instancia VPS en la nube y actualiza los contenedores mediante `docker compose pull && docker compose up -d`.

## 📁 Estructura del Proyecto (Monorepo)

```
flyway/
├── services/
│   ├── frontend/              # Microservicio Frontend (React 19 + Vite 8 + Tailwind v4 + Nginx)
│   │   ├── src/               # Pantallas, componentes UI, tipos y estilos
│   │   ├── nginx.conf         # Configuración SPA para contenedor de producción
│   │   ├── package.json
│   │   └── Dockerfile         # Multi-stage build (Node 20 -> Nginx Alpine)
│   ├── bff/                   # Microservicio API Gateway (Express.js - Puerto 4000)
│   │   ├── src/server.ts      # Enrutador y orquestador hacia servicios internos
│   │   ├── package.json
│   │   └── Dockerfile         # Multi-stage build con esbuild (Node 20 Alpine)
│   ├── ai-service/            # Microservicio de IA e Itinerarios (Puerto 4001)
│   │   ├── src/               # aiPlanner.ts (Gemini/OpenRouter) + Generador Offline CLP
│   │   ├── package.json
│   │   └── Dockerfile
│   └── catalog-service/       # Microservicio de Catálogo, Pexels y DB (Puerto 4002)
│       ├── src/               # Conexión PostgreSQL, destinos Chile/Mundo y caché Pexels
│       ├── package.json
│       └── Dockerfile
├── database/
│   └── init.sql               # Esquema DDL (users, destinations, saved_itineraries, photo_cache) + Seed
├── bruno/                     # Colección de pruebas automatizadas de API (Archivos .bru)
│   ├── bruno.json
│   ├── environments/          # Entornos local.bru y cloud.bru
│   └── tests/                 # Casos de prueba y assertions (Health, Destinos, IA Fallback)
├── .github/
│   └── workflows/
│       └── ci-cd.yml          # Pipeline automatizado CI/CD en GitHub Actions
├── .env.example               # Plantilla de variables de entorno
└── docker-compose.yml         # Orquestador de los 5 contenedores, volúmenes y red interna

```
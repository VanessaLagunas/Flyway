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

* **Integraciones Externas:** Google Gemini SDK (`@google/genai`), OpenRouter API (`openrouter/free`), Pexels API y **Open-Meteo API** (Geocodificación y Clima en tiempo real/histórico sin API Key).

* **API Testing as Code (QA):** **Bruno** (`.bru`) y **Bruno CLI** (`@usebruno/cli`) para pruebas de contrato, tiempos de respuesta y resiliencia.

* **Infraestructura y CI/CD:** Entorno **Linux (WSL2 - Ubuntu)**, Docker & Docker Compose, **GitHub Actions** y **GitHub Container Registry (GHCR)**.

## 🌦️ Sistema Meteorológico y Recomendación de Vestimenta

El microservicio `ai-service` cuenta con un motor meteorológico híbrido (`services/ai-service/src/utils/weatherUtils.ts`) que opera de forma paralela a la generación de itinerarios para alimentar tanto a los modelos de IA como a la interfaz de usuario:

1. **Resolución Geográfica (Geocoding):**
   * Consulta una caché interna de coordenadas conocidas para destinos turísticos comunes de Chile y el mundo.
   * Si el destino no está en caché, consulta dinámicamente la **API de Geocodificación de Open-Meteo** (`geocoding-api.open-meteo.com`) para obtener latitud, longitud y hemisferio (Norte/Sur).
2. **Estrategia de Pronóstico Meteorológico Inteligente:**
   * **Viajes próximos (dentro de los próximos 14 días):** Consulta el pronóstico en tiempo real mediante **Open-Meteo Forecast API** (`api.open-meteo.com/v1/forecast`), extrayendo mínimas/máximas diarias, probabilidad de lluvia, nieve y viento.
   * **Viajes a futuro lejano (+14 días):** Consulta la climatología exacta de las mismas fechas en el último año disponible a través de **Open-Meteo Archive API** (`archive-api.open-meteo.com/v1/archive`), garantizando coherencia estacional astronómica según el hemisferio.
   * **Fallback Climatológico Local:** Si las llamadas externas sufren un timeout (4.5s), activa un modelo predictivo offline por latitud y estación.
3. **Generación de Vestimenta y Consejos de Viaje:**
   * Evalúa temperatura mínima/máxima, presencia de nieve (`snowfall_sum`), lluvias (`precipitation_sum`) y ráfagas de viento.
   * Sugiere automáticamente la lista de prendas recomendadas (`clothingItems`) y recomendaciones de viaje (`clothingTip`) adecuadas para cada destino.
4. **Sin API Key ni Costos:**
   * Open-Meteo es de libre acceso y no requiere token ni tarjeta de crédito, lo que garantiza disponibilidad permanente sin costo de operación.

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
├── k8s/                       # Manifiestos de Kubernetes para despliegue en Google Cloud (GCP / GKE)
│   ├── configmap.yaml         # Variables de configuración interna y URLs DNS
│   ├── secret.example.yaml    # Plantilla de secretos (JWT, API Keys, DB Pass)
│   ├── postgres.yaml          # StatefulSet/Deployment + PVC persistente para PostgreSQL
│   ├── auth-service.yaml      # Deployment + ClusterIP para Auth Service
│   ├── ai-service.yaml        # Deployment + ClusterIP para AI Service
│   ├── catalog-service.yaml   # Deployment + ClusterIP para Catalog Service
│   ├── bff-service.yaml       # Deployment + ClusterIP para BFF Gateway
│   ├── frontend.yaml          # Deployment + Service LoadBalancer para UI React
│   └── ingress.yaml           # Ingress HTTP(S) opcional para GCP Load Balancer
├── .github/
│   └── workflows/
│       └── ci-cd.yml          # Pipeline automatizado CI/CD en GitHub Actions (Build, Test, Push GHCR, Deploy GKE)
├── .env.example               # Plantilla de variables de entorno
└── docker-compose.yml         # Orquestador local de los 6 contenedores, volúmenes y red interna

```

## ☸️ Guía Completa de Despliegue en Google Cloud Platform (GKE - Kubernetes)

Sigue estos pasos en orden para levantar la plataforma por primera vez en GCP:

---

### Paso 1: Crear el Clúster de Kubernetes en Google Cloud (GKE)

Puedes crearlo desde la consola de GCP o mediante la terminal con `gcloud`:

```bash
# Definir variables de tu entorno
export PROJECT_ID="tu-gcp-project-id"
export CLUSTER_NAME="flyway-cluster"
export REGION="us-central1" # O "southamerica-west1" (Santiago, Chile)

# 1. Configurar el proyecto
gcloud config set project $PROJECT_ID

# 2. Habilitar las APIs requeridas
gcloud services enable container.googleapis.com containerregistry.googleapis.com

# 3. Crear el clúster GKE (Modo Autopilot recomendado: menor costo y administración automática)
gcloud container clusters create-auto $CLUSTER_NAME \
  --region $REGION \
  --project $PROJECT_ID
```

*(Si prefieres hacerlo por la Consola Web de GCP: Ve a **Kubernetes Engine > Clústeres > Crear**, selecciona **GKE Autopilot**, elige tu región y haz clic en **Crear**).*

---

### Paso 2: Crear la Service Account para GitHub Actions

GitHub Actions necesita permisos para conectarse a tu clúster de Kubernetes:

```bash
# 1. Crear la Service Account
gcloud iam service-accounts create github-actions-gke \
  --description="Service Account para despliegues CI/CD desde GitHub Actions" \
  --display-name="github-actions-gke"

# 2. Asignarle el rol de desarrollador de Kubernetes Engine
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions-gke@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/container.developer"

# 3. Generar y descargar la clave JSON de autenticación
gcloud iam service-accounts keys create gcp-key.json \
  --iam-account=github-actions-gke@${PROJECT_ID}.iam.gserviceaccount.com
```

> [!CAUTION]
> El archivo `gcp-key.json` contiene credenciales de acceso. **No lo subas al repositorio git**. Cópialo a los Secrets de GitHub y luego elimínalo de tu disco local.

---

### Paso 3: Configurar Secretos y Variables en GitHub

En tu repositorio de GitHub, dirígete a **Settings > Secrets and variables > Actions**:

#### A. En la pestaña "Secrets" (Repository Secrets):
1. **`GCP_SA_KEY`**: Abre el archivo `gcp-key.json`, copia todo su contenido de texto y pégalo aquí.

#### B. En la pestaña "Variables" (Repository Variables):
1. **`GKE_CLUSTER_NAME`**: Nombre de tu clúster (ejemplo: `flyway-cluster`).
2. **`GKE_REGION`**: Región de tu clúster (ejemplo: `us-central1` o `southamerica-west1`).
3. **`GCP_PROJECT_ID`**: ID de tu proyecto en Google Cloud (ejemplo: `mi-proyecto-12345`).

---

### Paso 4: Inicialización Única en el Clúster (Secretos de BD y Esquema SQL)

Antes del primer despliegue, conecta tu terminal al clúster para cargar los secretos de aplicación y las tablas de PostgreSQL:

```bash
# 1. Conectar tu terminal local a GKE
gcloud container clusters get-credentials $CLUSTER_NAME --region $REGION --project $PROJECT_ID

# 2. Configurar los Secretos de la Aplicación
cp k8s/secret.example.yaml k8s/secret.yaml
```

Edita `k8s/secret.yaml` con tus contraseñas y claves de API reales:
* `POSTGRES_PASSWORD`: Contraseña segura para PostgreSQL.
* `JWT_SECRET`: Llave secreta para firmar tokens JWT.
* `GEMINI_API_KEY`: Tu API Key de Google Gemini.
* `OPENROUTER_API_KEY`: Tu API Key de OpenRouter (opcional).
* `OPENAI_API_KEY`: Tu API Key de OpenAI (opcional).
* `PEXELS_API_KEY`: Tu API Key de Pexels para fotos (opcional).

Luego aplícalo al clúster:
```bash
kubectl apply -f k8s/secret.yaml

# 3. Cargar el script DDL e inicialización de la Base de Datos (init.sql)
kubectl create configmap postgres-init-sql --from-file=database/init.sql
```

---

### Paso 5: Despliegue de los Microservicios

Tienes dos formas de desplegar:

#### Opción A: Despliegue Automático con CI/CD (Recomendado)
Haz un commit y push a la rama principal:
```bash
git add .
git commit -m "feat: configuracion gke y pipeline de despliegue"
git push origin main
```
El pipeline de GitHub Actions compilará las 5 imágenes Docker, ejecutará las pruebas en Bruno, las subirá a GHCR y desplegará automáticamente en GKE.

#### Opción B: Despliegue Manual con Kubectl
```bash
kubectl apply -f k8s/
```

---

### Paso 6: Verificar el Estado y Obtener la URL Pública

```bash
# 1. Revisar que los 6 Pods estén en estado Running
kubectl get pods

# 2. Obtener la IP pública externa asignada al Frontend
kubectl get service frontend
```

En la salida de `kubectl get service frontend`, verás la columna `EXTERNAL-IP`:
```text
NAME       TYPE           CLUSTER-IP     EXTERNAL-IP     PORT(S)
frontend   LoadBalancer   10.128.5.20    34.120.45.67    80:31234/TCP
```

Abre tu navegador en `http://<EXTERNAL-IP>` (ejemplo: `http://34.120.45.67`) y Flyway estará completamente operativo en Google Cloud.

#### Comandos útiles para monitoreo:
```bash
# Ver logs en tiempo real de cualquier servicio:
kubectl logs -l app=bff-service -f
kubectl logs -l app=ai-service -f
kubectl logs -l app=catalog-service -f
kubectl logs -l app=postgres-db -f

# Reiniciar un servicio si cambiaste variables:
kubectl rollout restart deployment/bff-service
```
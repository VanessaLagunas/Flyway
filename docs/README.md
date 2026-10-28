# 📚 Documentación Técnica de Arquitectura y Datos · Flyway

Bienvenido al directorio de documentación técnica del proyecto **Flyway**. En esta carpeta se concentran los diagramas arquitectónicos, las especificaciones de topología de red en la nube (**Google Cloud Platform**), la orquestación en contenedores y el diseño del modelo de datos relacional/documental.

---

## 📑 Índice de Documentos

### 1. [Diagrama de Arquitectura, Contenedores y Topología de Red](diagrama_de_arquitectura_mermaid_flyway.md)
* **Topología Cloud en Google Cloud Platform (GCP / GKE):**
  - Perímetro de red con Cloud DNS, External HTTP(S) Load Balancer (GCLB) y GKE Ingress (`kubernetes.io/ingress.class: gce`).
  - Configuración de **GCP BackendConfig** (`bff-backend-config`) con `timeoutSec: 240` y sondeo HTTP `/healthz`.
  - Desacoplamiento de los **6 microservicios/contenedores** en Pods de Kubernetes y servicios `ClusterIP`.
  - Almacenamiento persistente en **Google Compute Engine Persistent Disks (`standard-rwo`)** mediante `PersistentVolumeClaim` con `fsGroup: 70`.
  - Integración de DevOps y CI/CD con **GitHub Actions**, **GitHub Container Registry (GHCR)** y **GCP IAM Service Account (`github-actions-gke`)**.
  - Integraciones con APIs externas: Google Gemini SDK (`gemini-3.8-flash`), Google Identity Services (OAuth 2.0), Open-Meteo API (Forecast, Archive, Geocoding), OpenRouter API y Pexels API.
* **Topología Local en Docker Compose:**
  - Red privada interna tipo puente (`flyway-net`), mapeo de puertos y volúmenes locales (`flyway-pgdata`).
* **Diagramas de Secuencia:**
  - Flujo de autenticación híbrida (Bcrypt/JWT y Google OAuth 2.0 con validación por `google-auth-library`).
  - Orquestación BFF con BackendConfig y generación resiliente de itinerarios con meteorología y motor offline en CLP.
  - Persistencia de rutas y patrón Cache-Aside con Pexels en PostgreSQL.
* **Matriz Comparativa:**
  - Diferencias técnicas entre el entorno local (Docker Compose) y el de producción (GCP GKE).
* **Políticas de Seguridad y Resiliencia en Red:**
  - Segregación de puertos, alineación de timeouts en cascada y probes de salud.

---

### 2. [Modelo de Base de Datos y Persistencia](modelobd.md)
* **Diagrama Entidad-Relación (Mermaid ERD):**
  - Modelado fiel al esquema DDL `init.sql` de PostgreSQL 16.
* **Diccionario de Datos:**
  - `users`: Soporte dual para autenticación local (`password_hash`) y Google OAuth (`auth_provider`, `avatar_url`).
  - `destinations`: Catálogo turístico con comunas, regiones, presupuestos diarios en CLP y tags en formato `JSONB`.
  - `saved_itineraries`: Persistencia de itinerarios generados por IA asociados a la cuenta del usuario (`ON DELETE CASCADE`).
  - `photo_cache`: Caché fotográfico de alta resolución con patrón Cache-Aside para la API de Pexels.
* **Estrategia de Índices:**
  - Índices B-Tree para búsquedas insensibles a mayúsculas (`LOWER(name)`), país y orden cronológico.
  - Índice GIN (*Generalized Inverted Index*) sobre columnas `JSONB` para consultas de contención ultra rápidas en tags.
* **Configuración en Google Cloud Platform:**
  - Ajustes de `fsGroup: 70`, prevención de conflicto con `lost+found` mediante `PGDATA` y `startupProbe` de 300 segundos.
* **Catálogo de Semillas (Seed Data):**
  - Usuario de demostración preconfigurado (`demo@flyway.cl`) y 14 destinos turísticos sembrados en Chile y el mundo.

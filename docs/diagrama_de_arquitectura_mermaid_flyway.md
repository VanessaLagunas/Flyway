# 🗺️ Diagrama de Arquitectura y Topología de Red · Flyway

Este documento contiene los diagramas en **Mermaid** que representan la interacción entre los **6 contenedores** del proyecto Flyway, la segregación de red en Docker y el flujo de llamadas entre microservicios, clientes y servicios externos.

---

## 1. Diagrama de Contenedores y Topología de Red (Docker)

```mermaid
graph TB
    %% Clientes y Herramientas Externas
    subgraph CLIENTS [" 🌐 Clientes y Automatizacion "]
        User["👤 Usuario / Navegador Web"]
        QA["🧪 Bruno Desktop / Bruno CLI CI/CD"]
    end

    %% Capa Host / Puertos Públicos
    subgraph DOCKER_HOST [" 🐳 Docker Host Linux WSL2 / VPS Oracle Cloud "]
        
        subgraph PUBLIC_ZONE [" 🔓 Zona Publica - Puertos Expuestos "]
            Frontend["📦 frontend<br/>Nginx Alpine<br/>Puerto Host 3000 a 80"]
            BFF["📦 bff-service<br/>Express Gateway<br/>Puerto Host 4000 a 4000"]
        end

        %% Red Privada Interna Docker
        subgraph FLYWAY_NET [" 🔒 Red Privada Interna: flyway-net "]
            
            AuthSvc["📦 auth-service<br/>Node 20 Alpine<br/>Puerto Interno 4003<br/>• Bcrypt.js Hashing<br/>• JWT Sign / Verify"]
            
            AISvc["📦 ai-service<br/>Node 20 Alpine<br/>Puerto Interno 4001<br/>• Generador de Itinerarios<br/>• Motor Local Fallback CLP"]
            
            CatalogSvc["📦 catalog-service<br/>Node 20 Alpine<br/>Puerto Interno 4002<br/>• Destinos Chile y Mundo<br/>• Cache Pexels<br/>• Itinerarios Guardados"]
            
            PostgresDB[("🗄️ postgres-db<br/>PostgreSQL 16 Alpine<br/>Puerto Interno 5432<br/>• users / destinations<br/>• photo_cache / saved_itineraries")]
            
            VolData[("💾 Docker Volume<br/>pgdata")]
        end
    end

    %% Servicios y APIs Externas
    subgraph EXTERNAL_SERVICES [" ☁️ Servicios Cloud Externos "]
        GeminiAPI["🤖 OpenIA API"]
        OpenRouterAPI["🌐 OpenRouter API"]
        PexelsAPI["📷 Pexels API"]
    end

    %% Conexiones Clientes
    User -->|"HTTP / Navegacion :3000"| Frontend
    User -->|"REST / JSON :4000"| BFF
    QA -->|"REST API Tests :4000"| BFF

    %% Frontend hacia BFF
    Frontend -.->|"Consumo APIs VITE_BFF_URL"| BFF

    %% Orquestación BFF hacia Microservicios Internos
    BFF -->|"POST /login, /register, /me :4003"| AuthSvc
    BFF -->|"POST /itinerary/generate :4001"| AISvc
    BFF -->|"GET /destinations, /photos :4002"| CatalogSvc
    BFF -->|"GET/POST /saved Bearer JWT :4002"| CatalogSvc

    %% Conexiones con Base de Datos
    AuthSvc -->|"Gestion usuarios :5432"| PostgresDB
    CatalogSvc -->|"Catalogo y persistencia JSONB :5432"| PostgresDB
    PostgresDB --- VolData

    %% Conexiones Microservicios con APIs Externas
    AISvc -->|"Generacion IA Primaria"| GeminiAPI
    AISvc -->|"IA Alternativa"| OpenRouterAPI
    CatalogSvc -->|"Busqueda Fotografia HD"| PexelsAPI

    %% Estilos Visuales
    classDef clientStyle fill:#e1f5fe,stroke:#0288d1,stroke-width:2px,color:#01579b;
    classDef publicStyle fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px,color:#1b5e20;
    classDef internalStyle fill:#fff3e0,stroke:#ef6c00,stroke-width:2px,color:#e65100;
    classDef dbStyle fill:#ede7f6,stroke:#512da8,stroke-width:2px,color:#311b92;
    classDef extStyle fill:#eceff1,stroke:#455a64,stroke-width:2px,stroke-dasharray: 5 5,color:#263238;

    class User,QA clientStyle;
    class Frontend,BFF publicStyle;
    class AuthSvc,AISvc,CatalogSvc internalStyle;
    class PostgresDB,VolData dbStyle;
    class GeminiAPI,OpenRouterAPI,PexelsAPI extStyle;
```

---

## 2. Diagrama de Secuencia: Flujo de Autenticación y Generación de Itinerarios

Este diagrama ilustra la interacción paso a paso entre los servicios cuando un usuario inicia sesión y solicita un itinerario protegido:

```mermaid
sequenceDiagram
    autonumber
    actor User as Usuario / Frontend
    participant BFF as BFF / Gateway (4000)
    participant Auth as auth-service (4003)
    participant AI as ai-service (4001)
    participant Catalog as catalog-service (4002)
    participant DB as postgres-db (5432)
    participant Cloud as Gemini / Pexels APIs

    %% 1. Autenticación Local
    rect rgb(235, 248, 255)
        Note over User, DB: 1. Flujo de Login Local (JWT + Bcrypt)
        User->>BFF: POST /api/v1/auth/login { email, password }
        BFF->>Auth: POST /login { email, password }
        Auth->>DB: SELECT * FROM users WHERE email = ?
        DB-->>Auth: Retorna user (con password_hash)
        Auth->>Auth: bcrypt.compare(password, password_hash)
        Auth->>Auth: jwt.sign({ id, email }, JWT_SECRET, 24h)
        Auth-->>BFF: { token: "JWT...", user: { id, email, name } }
        BFF-->>User: HTTP 200 { token, user } (guardado en localStorage)
    end

    %% 2. Generación de Itinerario con Fallback
    rect rgb(255, 248, 225)
        Note over User, Cloud: 2. Generación Inteligente de Itinerario
        User->>BFF: POST /api/v1/itinerary/generate { destination, days, budget }
        BFF->>AI: POST /generate { destination, days, budget }
        alt Conexión con IA disponible
            AI->>Cloud: Petición a Gemini SDK / OpenRouter
            Cloud-->>AI: Itinerario enriquecido
        else Cuota agotada o sin internet
            AI->>AI: Ejecuta Motor Local Offline (Fallback en CLP)
        end
        AI-->>BFF: JSON { destination, currency: "CLP", days: [...] }
        BFF-->>User: HTTP 200 { itinerary }
    end

    %% 3. Guardar Itinerario Protegido
    rect rgb(232, 245, 233)
        Note over User, DB: 3. Persistencia de Itinerario (Ruta Protegida)
        User->>BFF: POST /api/v1/saved [Header Authorization: Bearer JWT]
        BFF->>BFF: Verifica firma de token JWT
        BFF->>Catalog: POST /saved { userId, destinationName, itineraryData }
        Catalog->>DB: INSERT INTO saved_itineraries (user_id, itinerary_data JSONB)
        DB-->>Catalog: Confirmación ID
        Catalog-->>BFF: HTTP 201 { success: true, id }
        BFF-->>User: HTTP 201 Itinerario Guardado Exitosamente
    end
```

---

## 3. Resumen de Seguridad y Segregación de Red

1. **Sin exposición innecesaria:** Ni `auth-service`, ni `ai-service`, ni `catalog-service`, ni `postgres-db` exponen puertos al exterior en el `docker-compose.prod.yml`. Solo el puerto `3000` (Frontend) y el `4000` (BFF) son accesibles.
2. **Defensa perimetral:** El **BFF** valida el encabezado `Authorization: Bearer <token>` antes de transferir datos al `catalog-service`.
3. **Resiliencia desacoplada:** Si la base de datos se satura o la API de Gemini agota cuota, `ai-service` mantiene vivo el servicio mediante su motor determinista en pesos chilenos (CLP).
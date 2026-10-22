erDiagram
    USERS --o{ REFRESH_TOKENS : "posee"
    USERS --o{ SAVED_ITINERARIES : "crea y guarda"
    DESTINATIONS --o{ SAVED_ITINERARIES : "es planificado en"
    DESTINATIONS --o| PHOTO_CACHE : "resuelve imagen por slug"

    USERS {
        uuid id PK "Identificador unico"
        varchar email "UK - Correo electronico unico"
        varchar password_hash "Hash Bcrypt cost 10"
        varchar full_name "Nombre completo"
        varchar role "Rol de acceso user o admin"
        boolean is_active "Estado de la cuenta"
        timestamp created_at "Fecha de registro"
        timestamp updated_at "Ultima modificacion"
    }

    REFRESH_TOKENS {
        uuid id PK "Identificador del token"
        uuid user_id FK "Usuario propietario CASCADE"
        varchar token_hash "Hash del refresh token emitido"
        timestamp expires_at "Fecha y hora de expiracion"
        boolean is_revoked "Indicador de revocacion activa"
        timestamp created_at "Fecha de emision"
    }

    DESTINATIONS {
        serial id PK "Identificador autoincremental"
        varchar name "Nombre oficial ej Pucon"
        varchar slug "UK - Clave canonica normalizada"
        varchar country "Pais ej Chile"
        varchar region "Region o division administrativa"
        text description "Resena o descripcion generada"
        integer estimated_daily_budget "Presupuesto diario promedio CLP"
        jsonb tags "Etiquetas tematicas"
        boolean is_dynamic "Origen seed o descubierto por IA"
        timestamp created_at "Fecha de creacion"
        timestamp updated_at "Fecha de actualizacion"
    }

    PHOTO_CACHE {
        serial id PK "Identificador autoincremental"
        varchar query_term "UK - Termino de busqueda normalizado"
        text photo_url "URL CDN de la fotografia en Pexels"
        varchar alt_text "Texto descriptivo para accesibilidad"
        varchar photographer "Credito del autor"
        varchar photographer_url "Perfil del fotografo en Pexels"
        integer pexels_id "Identificador de origen en Pexels"
        timestamp created_at "Momento de guardado en cache"
    }

    SAVED_ITINERARIES {
        uuid id PK "Identificador unico del itinerario"
        uuid user_id FK "Usuario creador CASCADE"
        integer destination_id FK "Destino asociado SET NULL"
        varchar title "Titulo descriptivo del viaje"
        integer duration_days "Duracion total en dias"
        integer total_budget_clp "Presupuesto total en CLP"
        varchar source "Origen openai o openrouter o fallback"
        jsonb plan_json "Estructura completa de dias y actividades"
        timestamp created_at "Fecha de generacion"
        timestamp updated_at "Ultima actualizacion"
    }
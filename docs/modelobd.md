erDiagram
    USERS ||--o{ REFRESH_TOKENS : "posee"
    USERS ||--o{ SAVED_ITINERARIES : "crea y guarda"
    DESTINATIONS ||--o{ SAVED_ITINERARIES : "es planificado en"
    DESTINATIONS ||--o| PHOTO_CACHE : "resuelve imagen por slug"

    USERS {
        uuid id PK "Identificador único (gen_random_uuid())"
        varchar_255 email UK "Correo electrónico único"
        varchar_255 password_hash "Hash Bcrypt (cost 10)"
        varchar_150 full_name "Nombre completo"
        varchar_50 role "Rol de acceso (user, admin)"
        boolean is_active "Estado de la cuenta"
        timestamp created_at "Fecha de registro"
        timestamp updated_at "Última modificación"
    }

    REFRESH_TOKENS {
        uuid id PK "Identificador del token"
        uuid user_id FK "Usuario propietario (ON DELETE CASCADE)"
        varchar_500 token_hash "Hash del refresh token emitido"
        timestamp expires_at "Fecha y hora de expiración"
        boolean is_revoked "Indicador de revocación activa"
        timestamp created_at "Fecha de emisión"
    }

    DESTINATIONS {
        serial id PK "Identificador autoincremental"
        varchar_150 name "Nombre oficial (ej: Pucón)"
        varchar_150 slug UK "Clave canónica normalizada"
        varchar_100 country "País (ej: Chile)"
        varchar_100 region "Región o división administrativa"
        text description "Reseña o descripción generada"
        integer estimated_daily_budget "Presupuesto diario promedio en CLP"
        jsonb tags "Etiquetas temáticas (aventura, gastronomia)"
        boolean is_dynamic "Origen (seed estático o descubierto por IA)"
        timestamp created_at "Fecha de creación"
        timestamp updated_at "Fecha de última actualización"
    }

    PHOTO_CACHE {
        serial id PK "Identificador autoincremental"
        varchar_200 query_term UK "Término de búsqueda normalizado"
        text photo_url "URL CDN de la fotografía en Pexels"
        varchar_255 alt_text "Texto descriptivo para accesibilidad"
        varchar_150 photographer "Crédito del autor"
        varchar_255 photographer_url "Perfil del fotógrafo en Pexels"
        integer pexels_id "Identificador de origen en Pexels"
        timestamp created_at "Momento de guardado en caché"
    }

    SAVED_ITINERARIES {
        uuid id PK "Identificador único del itinerario"
        uuid user_id FK "Usuario creador (ON DELETE CASCADE)"
        integer destination_id FK "Destino asociado (ON DELETE SET NULL)"
        varchar_200 title "Título descriptivo del viaje"
        integer duration_days "Duración total en días"
        integer total_budget_clp "Presupuesto estimado consolidado en CLP"
        varchar_50 source "Origen (openai, openrouter, local_fallback)"
        jsonb plan_json "Estructura completa de días, horas y actividades"
        timestamp created_at "Fecha de generación"
        timestamp updated_at "Última actualización"
    }
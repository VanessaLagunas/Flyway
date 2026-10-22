-- ====================================================================
-- Flyway Database Initialization Schema & Seed Data
-- ====================================================================

-- 1. Tabla de Usuarios (Autenticación Local con Bcrypt + Google OAuth)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    name VARCHAR(100) NOT NULL,
    auth_provider VARCHAR(50) DEFAULT 'local',
    avatar_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Migraciones seguras si la tabla ya existía
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(50) DEFAULT 'local';
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2. Tabla de Destinos Turísticos (Catálogo Vivo)
CREATE TABLE IF NOT EXISTS destinations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL UNIQUE,
    region VARCHAR(150),
    commune VARCHAR(150),
    country VARCHAR(100),
    avg_daily_cost_clp INTEGER,
    tags JSONB DEFAULT '[]'::jsonb,
    description TEXT
);

-- 3. Tabla de Itinerarios Guardados (Asociados a users.id)
CREATE TABLE IF NOT EXISTS saved_itineraries (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    destination_name VARCHAR(150),
    total_budget_clp INTEGER,
    itinerary_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabla de Caché de Fotos de Pexels (Patrón Cache-Aside)
CREATE TABLE IF NOT EXISTS photo_cache (
    query_key VARCHAR(255) PRIMARY KEY,
    destination_name VARCHAR(150),
    photo_url TEXT NOT NULL,
    photographer VARCHAR(150),
    photographer_url TEXT,
    photos_json JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices de Rendimiento
CREATE INDEX IF NOT EXISTS idx_destinations_name_lower ON destinations(LOWER(name));
CREATE INDEX IF NOT EXISTS idx_destinations_country ON destinations(country);
CREATE INDEX IF NOT EXISTS idx_destinations_tags ON destinations USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_saved_itineraries_user_id ON saved_itineraries(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_itineraries_created_at ON saved_itineraries(created_at DESC);

-- ====================================================================
-- Seed Data: Usuario Demo Local (demo@flyway.cl / flyway123)
-- Hash bcryptjs (salt 10) de 'flyway123':
-- $2a$10$2kSgvJqGLXzH8LMF3KAZH.QS3M6pErF3.ZYMqLQHUtvhfmMNWcKEm
-- ====================================================================
INSERT INTO users (email, password_hash, name)
VALUES (
    'demo@flyway.cl',
    '$2a$10$2kSgvJqGLXzH8LMF3KAZH.QS3M6pErF3.ZYMqLQHUtvhfmMNWcKEm',
    'Viajero Demo'
)
ON CONFLICT (email) DO UPDATE
SET password_hash = EXCLUDED.password_hash,
    name = EXCLUDED.name;

-- ====================================================================
-- Seed Data: Destinos de Chile y el Mundo
-- ====================================================================
INSERT INTO destinations (name, region, commune, country, avg_daily_cost_clp, tags, description)
VALUES
    ('Santiago', 'Región Metropolitana', 'Santiago Centro', 'Chile', 55000, 
     '["cultura", "gastronomia", "naturaleza", "museos", "parques"]'::jsonb, 
     'Vibrante metrópolis flanqueada por la Cordillera de los Andes, con diversidad de comunas patrimoniales, gastronómicas y parques de montaña.'),

    ('Valparaíso', 'Región de Valparaíso', 'Cerro Alegre', 'Chile', 45000, 
     '["cultura", "arte", "bohemia", "gastronomia", "patrimonio"]'::jsonb, 
     'Ciudad puerto Patrimonio de la Humanidad con icónicos cerros de arquitectura victoriana, ascensores patrimoniales, miradores hacia el Pacífico y arte urbano.'),

    ('San Pedro de Atacama', 'Región de Antofagasta', 'San Pedro de Atacama', 'Chile', 75000, 
     '["naturaleza", "aventura", "arqueologia", "fotografia", "astronomia"]'::jsonb, 
     'Oasis místico en el desierto más árido del mundo, rodeado de salares con flamencos, lagunas altiplánicas, formaciones de la Cordillera de la Sal y géiseres humeantes.'),

    ('Pucón', 'Región de la Araucanía', 'Pucón', 'Chile', 65000, 
     '["aventura", "naturaleza", "termas", "trekking", "volcanes"]'::jsonb, 
     'Capital del turismo aventura lacustre en el sur de Chile, a orillas del Lago Villarrica y bajo el imponente volcán activo Villarrica.'),

    ('Torres del Paine', 'Región de Magallanes', 'Torres del Paine', 'Chile', 95000, 
     '["aventura", "patagonia", "naturaleza", "trekking", "fauna"]'::jsonb, 
     'Parque Nacional de renombre mundial en la Patagonia austral, con imponentes cuernos de granito, lagos de color turquesa y glaciares milenarios.'),

    ('Chiloé', 'Región de Los Lagos', 'Castro', 'Chile', 48000, 
     '["cultura", "mitologia", "gastronomia", "iglesias", "naturaleza"]'::jsonb, 
     'Archipiélago místico del sur chileno famoso por sus palafitos sobre el mar, iglesias de madera Patrimonio de la Humanidad y rica tradición culinaria con el curanto.'),

    ('Buenos Aires', 'Buenos Aires', 'Palermo', 'Argentina', 45000, 
     '["cultura", "gastronomia", "tango", "vida nocturna", "arquitectura"]'::jsonb, 
     'La París de Sudamérica, célebre por sus avenidas señoriales, cafés históricos, gastronomía carnívora de primer nivel y vibrante escena cultural de tango y teatro.'),

    ('Río de Janeiro', 'Río de Janeiro', 'Copacabana', 'Brasil', 55000, 
     '["playa", "naturaleza", "musica", "cultura", "miradores"]'::jsonb, 
     'La Ciudad Maravillosa, combinando el encanto de las playas de Copacabana e Ipanema con la imponencia del Cristo Redentor y el morro Pan de Azúcar.'),

    ('Cusco y Machu Picchu', 'Cusco', 'Cusco', 'Perú', 58000, 
     '["historia", "arqueologia", "cultura", "gastronomia", "trekking"]'::jsonb, 
     'Antigua capital del Imperio Inca y puerta de entrada a la mítica ciudadela de Machu Picchu en los Andes peruanos.'),

    ('Tokio', 'Kanto', 'Shibuya', 'Japón', 85000, 
     '["tecnologia", "gastronomia", "cultura", "urbano", "templos"]'::jsonb, 
     'Fascinante contraste entre tradición ancestral de templos sintoístas y una megalópolis futurista con la mejor oferta gastronómica del planeta.'),

    ('París', 'Île-de-France', 'Le Marais', 'Francia', 95000, 
     '["arte", "arquitectura", "gastronomia", "museos", "romance"]'::jsonb, 
     'La Ciudad de la Luz, hogar del Museo del Louvre, la Torre Eiffel, barrios bohemios y bistrós clásicos a orillas del río Sena.'),

    ('Roma', 'Lazio', 'Trastevere', 'Italia', 80000, 
     '["historia", "arquitectura", "gastronomia", "ruinas", "arte"]'::jsonb, 
     'La Ciudad Eterna, museo a cielo abierto donde conviven el Coliseo Romano, fuentes barrocas, el Vaticano y la pasta auténtica.'),

    ('Nueva York', 'New York', 'Manhattan', 'Estados Unidos', 115000, 
     '["urbano", "cultura", "espectaculos", "museos", "compras"]'::jsonb, 
     'La Gran Manzana: Central Park, Broadway, rascacielos legendarios y una energía inagotable las 24 horas del día.'),

    ('Madrid', 'Comunidad de Madrid', 'Chamberí', 'España', 72000, 
     '["cultura", "tapas", "museos", "parques", "historia"]'::jsonb, 
     'Capital española reconocida por el Triángulo del Arte (Museo del Prado, Reina Sofía), su vibrante cultura de tapeo y el Parque de El Retiro.')
ON CONFLICT (name) DO UPDATE
SET region = EXCLUDED.region,
    commune = EXCLUDED.commune,
    country = EXCLUDED.country,
    avg_daily_cost_clp = EXCLUDED.avg_daily_cost_clp,
    tags = EXCLUDED.tags,
    description = EXCLUDED.description;

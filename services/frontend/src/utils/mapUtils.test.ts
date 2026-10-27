import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  extractCleanPlaceName,
  hasValidCoordinates,
  buildStopMapSearchQuery,
  buildGoogleMapsEmbedUrl,
  buildGoogleMapsExternalUrl,
} from './mapUtils.js';

describe('mapUtils — Stop Geolocation & Google Maps URL Helpers', () => {
  test('extractCleanPlaceName prioritizes explicit placeName when present', () => {
    assert.equal(
      extractCleanPlaceName({
        title: 'Almuerzo típico junto al río Calle-Calle',
        placeName: '  Café Haussmann  ',
      }),
      'Café Haussmann'
    );
  });

  test('extractCleanPlaceName strips generic Spanish action prefixes from titles', () => {
    assert.equal(
      extractCleanPlaceName({ title: 'Almuerzo en Mercado Fluvial de Valdivia' }),
      'Mercado Fluvial de Valdivia'
    );
    assert.equal(
      extractCleanPlaceName({ title: 'Cena gastronómica en La Cava del Pescador' }),
      'La Cava del Pescador'
    );
    assert.equal(
      extractCleanPlaceName({ title: 'Visita guiada al Fuerte de Niebla' }),
      'Fuerte de Niebla'
    );
    assert.equal(
      extractCleanPlaceName({ title: 'Trekking por Parque Nacional Huerquehue' }),
      'Parque Nacional Huerquehue'
    );
    assert.equal(
      extractCleanPlaceName({ title: 'Paseo cultural por Cerro Alegre' }),
      'Cerro Alegre'
    );
    // Preserves legitimate promenade/park names without action prepositions
    assert.equal(
      extractCleanPlaceName({ title: 'Paseo Yugoslavo' }),
      'Paseo Yugoslavo'
    );
    assert.equal(
      extractCleanPlaceName({ title: 'Parque Saval' }),
      'Parque Saval'
    );
  });

  test('hasValidCoordinates validates geographic bounds and rejects (0,0) or NaN', () => {
    assert.equal(hasValidCoordinates({ lat: -39.8142, lng: -73.2459 }), true);
    assert.equal(hasValidCoordinates({ lat: 40.4168, lng: -3.7038 }), true);
    assert.equal(hasValidCoordinates({ lat: 0, lng: 0 }), false);
    assert.equal(hasValidCoordinates({ lat: -95, lng: -70 }), false);
    assert.equal(hasValidCoordinates({ lat: -33.45, lng: 185 }), false);
    assert.equal(hasValidCoordinates({ lat: Number.NaN, lng: -70 }), false);
    assert.equal(hasValidCoordinates(undefined), false);
  });

  test('buildStopMapSearchQuery builds crisp deduplicated queries for restaurants and parks', () => {
    const restaurantQuery = buildStopMapSearchQuery(
      {
        title: 'Almuerzo típico en Café Haussmann',
        placeName: 'Café Haussmann',
        addressOrSector: "O'Higgins 394, Sector Centro",
      },
      'Valdivia, Chile',
      'Chile'
    );
    assert.equal(restaurantQuery, "Café Haussmann, O'Higgins 394, Sector Centro, Valdivia, Chile");

    const parkQuery = buildStopMapSearchQuery(
      {
        title: 'Caminata por Parque Saval',
        addressOrSector: 'Isla Teja',
      },
      'Valdivia, Chile',
      'Chile'
    );
    assert.equal(parkQuery, 'Parque Saval, Isla Teja, Valdivia, Chile');

    // Explicit mapQuery appends destination if missing, avoids duplicating if present
    const explicitMissingCity = buildStopMapSearchQuery(
      {
        title: 'Cervecería',
        mapQuery: 'Cervecería Kunstmann, Ruta T-350 950',
      },
      'Valdivia, Chile',
      'Chile'
    );
    assert.equal(explicitMissingCity, 'Cervecería Kunstmann, Ruta T-350 950, Valdivia, Chile');

    const explicitWithCity = buildStopMapSearchQuery(
      {
        title: 'Museo del Prado',
        mapQuery: 'Museo Nacional del Prado, Madrid, España',
      },
      'Madrid, España',
      'España'
    );
    assert.equal(explicitWithCity, 'Museo Nacional del Prado, Madrid, España');
  });

  test('buildGoogleMapsEmbedUrl and buildGoogleMapsExternalUrl produce valid z=16 embed and search URLs', () => {
    const stop = {
      id: 'act-1',
      title: 'Once alemana en Teatro del Lago',
      placeName: 'Teatro del Lago',
      addressOrSector: 'Av. Philippi 1000',
      coordinates: { lat: -41.1258, lng: -73.0258 },
    };

    const embedUrl = buildGoogleMapsEmbedUrl(stop, 'Frutillar, Chile', 'Chile');
    assert.ok(embedUrl.startsWith('https://www.google.com/maps?q='));
    assert.ok(embedUrl.includes('&hl=es&z=16&output=embed'));
    assert.ok(decodeURIComponent(embedUrl).includes('Teatro del Lago, Av. Philippi 1000, Frutillar, Chile'));

    const externalUrl = buildGoogleMapsExternalUrl(stop, 'Frutillar, Chile', 'Chile');
    assert.ok(externalUrl.startsWith('https://www.google.com/maps/search/?api=1&query='));
    assert.ok(decodeURIComponent(externalUrl).includes('Teatro del Lago, Av. Philippi 1000, Frutillar, Chile'));

    // Fallback to coordinates when placeName/title is shorter than 3 chars
    const coordFallbackEmbed = buildGoogleMapsEmbedUrl(
      { title: '', coordinates: { lat: -39.8142, lng: -73.2459 } },
      'Valdivia'
    );
    assert.ok(decodeURIComponent(coordFallbackEmbed).includes('-39.8142,-73.2459'));
  });
});

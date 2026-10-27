import { describe, it, before, after, afterEach } from 'node:test';
import http from 'node:http';
import assert from 'node:assert/strict';
import {
  extractPexelsPhotoId,
  isPhotoUsed,
  markPhotoUsed,
  isIrrelevantNonTravelPhoto,
  buildPexelsSearchVariants,
  cleanPlaceTitle,
  enrichTripWithPexels,
} from './pexels';
import {
  normalizePhotoQueryKey,
  getPhotoWithCacheAside,
  DEFAULT_FALLBACK_PHOTO,
  PHOTO_CACHE_TTL_MS,
} from './photoService';
import { app, pool } from './server';

describe('Pexels Search Variants, Filtering & Photo ID Deduplication', () => {
  it('builds geographically accurate destination variants and avoids bare ambiguous single words', () => {
    const variants = buildPexelsSearchVariants('Córdoba', 'España');
    assert.ok(variants.length >= 3);
    assert.match(variants[0], /Cordoba|Córdoba/i);
    assert.match(variants[0], /Spain/i);
    assert.match(variants[0], /travel landmark/i);
    assert.ok(!variants.includes('Córdoba'), 'Should not include bare ambiguous single-word query');
  });

  it('filters out studio portrait, wedding, and fashion mockup photos while keeping travel/architecture/food photos', () => {
    assert.equal(
      isIrrelevantNonTravelPhoto(
        'Studio portrait of fashion model posing on white background',
        'https://www.pexels.com/photo/studio-portrait-fashion-model-111111/'
      ),
      true
    );
    assert.equal(
      isIrrelevantNonTravelPhoto(
        'Bride and groom in wedding dress indoors',
        'https://www.pexels.com/photo/wedding-couple-222222/'
      ),
      true
    );
    assert.equal(
      isIrrelevantNonTravelPhoto(
        'Panoramic view of historic Colosseum landmark architecture in Rome Italy',
        'https://www.pexels.com/photo/colosseum-rome-italy-333333/'
      ),
      false
    );
  });

  it('deduplicates both exact URLs and numeric Pexels photo IDs across differing query params', () => {
    const used = new Set<string>();
    const urlA = 'https://images.pexels.com/photos/9876543/pexels-photo-9876543.jpeg?auto=compress&w=1200';
    const urlB = 'https://images.pexels.com/photos/9876543/pexels-photo-9876543.jpeg?auto=compress&h=650&w=940';
    const urlC = 'https://images.pexels.com/photos/5554443/pexels-photo-5554443.jpeg?auto=compress&w=940';

    assert.equal(extractPexelsPhotoId(urlA), '9876543');
    markPhotoUsed(urlA, used);
    assert.equal(isPhotoUsed(urlA, used), true);
    assert.equal(isPhotoUsed(urlB, used), true, 'Same Pexels ID with different query params must be marked used');
    assert.equal(isPhotoUsed(urlC, used), false);
  });

  it('cleans noisy Spanish activity prefixes from stop titles', () => {
    assert.equal(cleanPlaceTitle('Almuerzo típico en Mercado Central'), 'Mercado Central');
    assert.equal(cleanPlaceTitle('Cena de despedida en Barrio Lastarria'), 'Barrio Lastarria');
    assert.equal(cleanPlaceTitle('Visita guiada al Museo del Louvre'), 'Museo del Louvre');
  });
});

describe('PhotoService Cache-Aside: Country Keys, TTL, Bypass & Contingency Guard', () => {
  const originalFetch = globalThis.fetch;
  const origPexelsKey = process.env.PEXELS_API_KEY;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    if (origPexelsKey === undefined) {
      delete process.env.PEXELS_API_KEY;
    } else {
      process.env.PEXELS_API_KEY = origPexelsKey;
    }
  });

  it('prevents cache key collisions across countries while unifying inline and explicit country', () => {
    const cordobaAr = normalizePhotoQueryKey('Córdoba', 'Argentina');
    const cordobaEs = normalizePhotoQueryKey('Córdoba', 'España');
    assert.notEqual(cordobaAr, cordobaEs);

    const atacamaInline = normalizePhotoQueryKey('San Pedro de Atacama, Chile');
    const atacamaExplicit = normalizePhotoQueryKey('San Pedro de Atacama', 'Chile');
    assert.equal(atacamaInline, atacamaExplicit);
  });

  it('returns fresh database_cache hit when within 12h TTL and non-contingency URL', async () => {
    process.env.PEXELS_API_KEY = 'test-pexels-key';
    let fetchCalled = false;
    globalThis.fetch = (async () => {
      fetchCalled = true;
      throw new Error('Should not call Pexels on fresh cache hit');
    }) as any;

    const freshUrl = 'https://images.pexels.com/photos/9100001/pexels-photo-9100001.jpeg?auto=compress&w=940';
    const mockPool: any = {
      query: async () => ({
        rows: [
          {
            query_key: 'cusco peru',
            destination_name: 'Cusco',
            photo_url: freshUrl,
            photographer: 'Andean Lens',
            photographer_url: 'https://www.pexels.com/@andean',
            photos_json: [
              { url: freshUrl, photographer: 'Andean Lens', photographerUrl: 'https://www.pexels.com/@andean', alt: 'Cusco Peru' },
              { url: 'https://images.pexels.com/photos/9100002/pexels-photo-9100002.jpeg', photographer: 'Andean Lens', photographerUrl: 'https://www.pexels.com/@andean', alt: 'Plaza Cusco' },
              { url: 'https://images.pexels.com/photos/9100003/pexels-photo-9100003.jpeg', photographer: 'Andean Lens', photographerUrl: 'https://www.pexels.com/@andean', alt: 'Andes Peru' },
            ],
            updated_at: new Date(Date.now() - 60 * 1000).toISOString(),
          },
        ],
      }),
    };

    const res = await getPhotoWithCacheAside('Cusco', 4, mockPool, { country: 'Perú' });
    assert.equal(res.cacheHit, true);
    assert.equal(res.source, 'database_cache');
    assert.equal(res.photoUrl, freshUrl);
    assert.equal(fetchCalled, false);
  });

  it('bypasses cache when bypassCache=true, when updated_at > 12h, or when cached URL is contingency fallback', async () => {
    process.env.PEXELS_API_KEY = 'test-pexels-key';

    const liveUrl = 'https://images.pexels.com/photos/8844221/pexels-photo-8844221.jpeg?auto=compress&w=940';
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          photos: [
            {
              id: 8844221,
              url: 'https://www.pexels.com/photo/historic-plaza-in-cusco-peru-8844221/',
              alt: 'Historic plaza landmark in Cusco Peru',
              photographer: 'Live Photographer',
              photographer_url: 'https://www.pexels.com/@live',
              src: { large2x: liveUrl },
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )) as any;

    let upserts = 0;

    // Case 1: Stale row (> 12h old)
    const stalePool: any = {
      query: async (sql: string) => {
        if (sql.includes('SELECT')) {
          return {
            rows: [
              {
                query_key: 'cusco peru',
                destination_name: 'Cusco',
                photo_url: 'https://images.pexels.com/photos/7777771/pexels-photo-7777771.jpeg',
                photographer: 'Old Photographer',
                photographer_url: 'https://www.pexels.com',
                photos_json: [],
                updated_at: new Date(Date.now() - (PHOTO_CACHE_TTL_MS + 3600_000)).toISOString(),
              },
            ],
          };
        }
        upserts++;
        return { rows: [] };
      },
    };

    const staleRes = await getPhotoWithCacheAside('Cusco', 4, stalePool, { country: 'Perú' });
    assert.equal(staleRes.cacheHit, false);
    assert.equal(staleRes.source, 'pexels_api');
    assert.equal(staleRes.photoUrl, liveUrl);
    assert.equal(upserts, 1);

    // Case 2: Fresh timestamp, but cached URL is a static contingency fallback while PEXELS_API_KEY is configured
    const contingencyPool: any = {
      query: async (sql: string) => {
        if (sql.includes('SELECT')) {
          return {
            rows: [
              {
                query_key: 'cusco peru',
                destination_name: 'Cusco',
                photo_url: DEFAULT_FALLBACK_PHOTO.url,
                photographer: DEFAULT_FALLBACK_PHOTO.photographer,
                photographer_url: DEFAULT_FALLBACK_PHOTO.photographerUrl,
                photos_json: [DEFAULT_FALLBACK_PHOTO],
                updated_at: new Date().toISOString(),
              },
            ],
          };
        }
        upserts++;
        return { rows: [] };
      },
    };

    const contingencyRes = await getPhotoWithCacheAside('Cusco', 4, contingencyPool, { country: 'Perú' });
    assert.equal(contingencyRes.cacheHit, false);
    assert.equal(contingencyRes.source, 'pexels_api');
    assert.equal(contingencyRes.photoUrl, liveUrl);
    assert.equal(upserts, 2);

    // Case 3: bypassCache=true skips SELECT hit and refreshes from Pexels
    let selectCalledOnBypass = false;
    const bypassPool: any = {
      query: async (sql: string) => {
        if (sql.includes('SELECT')) {
          selectCalledOnBypass = true;
        } else {
          upserts++;
        }
        return { rows: [] };
      },
    };

    const bypassRes = await getPhotoWithCacheAside('Cusco', 4, bypassPool, {
      bypassCache: true,
      country: 'Perú',
    });
    assert.equal(selectCalledOnBypass, false);
    assert.equal(bypassRes.source, 'pexels_api');
    assert.equal(upserts, 3);
  });

  it('NEVER persists contingency/fallback URLs into photo_cache when PEXELS_API_KEY is set and Pexels returns 0 or fails', async () => {
    process.env.PEXELS_API_KEY = 'test-pexels-key';
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ photos: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })) as any;

    let insertCalled = false;
    const mockPool: any = {
      query: async (sql: string) => {
        if (sql.includes('INSERT INTO photo_cache')) {
          insertCalled = true;
        }
        return { rows: [] };
      },
    };

    const res = await getPhotoWithCacheAside('Tokio', 4, mockPool, {
      bypassCache: true,
      country: 'Japón',
    });
    assert.equal(res.source, 'curated_fallback');
    assert.equal(insertCalled, false, 'Fallback photo must NEVER be persisted to photo_cache');
  });
});

describe('enrichTripWithPexels & Catalog HTTP Endpoints (/photos & /photos/enrich-trip)', () => {
  const originalFetch = globalThis.fetch;
  const origPexelsKey = process.env.PEXELS_API_KEY;
  let catalogServer: http.Server;
  let catalogUrl: string;

  before(async () => {
    await new Promise<void>((resolve) => {
      catalogServer = app.listen(0, '127.0.0.1', () => {
        const addr = catalogServer.address() as any;
        catalogUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  after(async () => {
    globalThis.fetch = originalFetch;
    if (origPexelsKey === undefined) {
      delete process.env.PEXELS_API_KEY;
    } else {
      process.env.PEXELS_API_KEY = origPexelsKey;
    }
    await new Promise<void>((resolve) => catalogServer.close(() => resolve()));
    await pool.end().catch(() => {});
  });

  it('enriches hero + per-stop photos with Pexels ID deduplication and syncs day.activities', async () => {
    process.env.PEXELS_API_KEY = 'test-pexels-key';

    globalThis.fetch = (async (input: string | URL | Request) => {
      const urlStr = String(input);
      if (!urlStr.includes('api.pexels.com')) {
        return originalFetch(input as any);
      }
      const parsed = new URL(urlStr);
      const q = (parsed.searchParams.get('query') || '').toLowerCase();

      if (q.includes('senso-ji') || q.includes('sensoji')) {
        return new Response(
          JSON.stringify({
            photos: [
              // Deliberately include same ID 500001 as hero with different query string to test ID deduplication!
              {
                id: 500001,
                url: 'https://www.pexels.com/photo/tokyo-skyline-500001/',
                alt: 'Tokyo skyline Japan',
                photographer: 'Dup Hero',
                photographer_url: 'https://www.pexels.com/@dup',
                src: { large2x: 'https://images.pexels.com/photos/500001/pexels-photo-500001.jpeg?w=600' },
              },
              {
                id: 600101,
                url: 'https://www.pexels.com/photo/senso-ji-temple-tokyo-japan-600101/',
                alt: 'Senso-ji Temple historic landmark in Tokyo Japan',
                photographer: 'Asakusa Photo',
                photographer_url: 'https://www.pexels.com/@asakusa',
                src: { large2x: 'https://images.pexels.com/photos/600101/pexels-photo-600101.jpeg?w=1200' },
              },
            ],
          }),
          { status: 200 }
        );
      }

      if (q.includes('parada inexistente')) {
        return new Response(JSON.stringify({ photos: [] }), { status: 200 });
      }

      // Destination pool for Tokyo Japan
      return new Response(
        JSON.stringify({
          photos: [500001, 500002, 500003, 500004, 500005].map((id) => ({
            id,
            url: `https://www.pexels.com/photo/tokyo-japan-landmark-${id}/`,
            alt: `Tokyo Japan cityscape landmark ${id}`,
            photographer: `Tokyo Photog ${id}`,
            photographer_url: 'https://www.pexels.com',
            src: { large2x: `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?w=1200` },
          })),
        }),
        { status: 200 }
      );
    }) as any;

    const act1 = { id: 'a1', placeName: 'Senso-ji Temple', title: 'Visita a Senso-ji Temple' };
    const act2 = { id: 'a2', title: 'Almuerzo en Parada Inexistente' };

    const sampleTrip: any = {
      destination: 'Tokio',
      country: 'Japón',
      days: [
        {
          dayNumber: 1,
          title: 'Asakusa y tradición',
          activities: [{ id: 'a1', title: 'Visita a Senso-ji Temple' }, { id: 'a2', title: 'Almuerzo en Parada Inexistente' }],
          items: [
            { type: 'activity', data: act1 },
            { type: 'activity', data: act2 },
          ],
        },
      ],
    };

    const enriched = await enrichTripWithPexels(sampleTrip, { bypassCache: true });

    assert.match(enriched.imageUrl, /500001/);
    assert.equal(enriched.photoUrl, enriched.imageUrl);
    assert.equal(enriched.photo_url, enriched.imageUrl);

    // Stop 1 skipped duplicate ID 500001 and picked stop-specific 600101
    assert.match(enriched.days[0].items[0].data.imageUrl, /600101/);
    // Stop 2 had 0 specific results so it picked next unused photo from Tokyo destination pool (500002)
    assert.match(enriched.days[0].items[1].data.imageUrl, /500002/);
    // Day hero picked next unused photo from Tokyo destination pool (500003)
    assert.match(enriched.days[0].imageUrl, /500003/);
    // day.activities was synced with day.items
    assert.equal(enriched.days[0].activities[0].imageUrl, enriched.days[0].items[0].data.imageUrl);
    assert.equal(enriched.days[0].activities[1].imageUrl, enriched.days[0].items[1].data.imageUrl);
  });

  it('sets Cache-Control: no-store on GET /photos and POST /photos/enrich-trip, with offline fallback when key missing', async () => {
    globalThis.fetch = originalFetch;
    delete process.env.PEXELS_API_KEY;

    const getRes = await fetch(`${catalogUrl}/photos?destination=Valpara%C3%ADso&country=Chile&refresh=true`);
    assert.equal(getRes.status, 200);
    assert.match(getRes.headers.get('cache-control') || '', /no-store/i);
    const getBody = (await getRes.json()) as any;
    assert.equal(getBody.success, true);

    const postRes = await fetch(`${catalogUrl}/photos/enrich-trip`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        refresh: true,
        trip: {
          destination: 'Valparaíso',
          country: 'Chile',
          days: [
            {
              dayNumber: 1,
              items: [{ type: 'activity', data: { id: '1', title: 'Paseo por Cerro Alegre' } }],
            },
          ],
        },
      }),
    });

    assert.equal(postRes.status, 200);
    assert.match(postRes.headers.get('cache-control') || '', /no-store/i);
    const postBody = (await postRes.json()) as any;
    assert.equal(postBody.source, 'fallback');
    assert.ok(postBody.trip.imageUrl);
    assert.ok(postBody.trip.days[0].items[0].data.imageUrl);
  });
});

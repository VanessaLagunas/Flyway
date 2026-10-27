import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { ensureTripHasPexelsPhotos, isValidHttpImageUrl } from './photoUtils.js';
import type { Trip } from '../types/index.js';

function createBaseTrip(destination: string, overrides: Partial<Trip> = {}): Trip {
  return {
    id: 'trip-test-1',
    title: `Ruta en ${destination}`,
    destination,
    datesText: '10 Nov - 11 Nov',
    startDate: '2026-11-10',
    endDate: '2026-11-11',
    budgetLevel: 'standard',
    budgetLabel: 'Estándar',
    totalCost: 45000,
    currency: 'CLP',
    summary: `Viaje por ${destination}`,
    season: 'Primavera',
    isFavorite: false,
    savingTips: [],
    whyThisRoute: 'Ruta optimizada',
    days: [],
    ...overrides,
  };
}

describe('photoUtils — Backend Pexels Preservation & Non-Overlapping Fallbacks', () => {
  test('isValidHttpImageUrl validates http/https URLs and rejects empty or relative strings', () => {
    assert.equal(isValidHttpImageUrl('https://images.pexels.com/photos/12345/pexels-photo-12345.jpeg'), true);
    assert.equal(isValidHttpImageUrl('http://example.com/photo.jpg'), true);
    assert.equal(isValidHttpImageUrl(''), false);
    assert.equal(isValidHttpImageUrl('   '), false);
    assert.equal(isValidHttpImageUrl('/local/image.png'), false);
    assert.equal(isValidHttpImageUrl(undefined), false);
  });

  test('preserves backend-provided Pexels URLs on hero, days, and activities for any destination', () => {
    for (const dest of ['Valdivia, Chile', 'Frutillar', 'Arica, Chile', 'Bariloche, Argentina', 'Madrid']) {
      const heroUrl = `https://images.pexels.com/photos/910001/hero-${encodeURIComponent(dest)}.jpeg`;
      const day1Url = `https://images.pexels.com/photos/910002/day1-${encodeURIComponent(dest)}.jpeg`;
      const act1Url = `https://images.pexels.com/photos/910003/act1-${encodeURIComponent(dest)}.jpeg`;
      const act2Url = `https://images.pexels.com/photos/910004/act2-${encodeURIComponent(dest)}.jpeg`;

      const rawTrip = createBaseTrip(dest, {
        imageUrl: heroUrl,
        imagePhotographer: 'Autor Hero Real',
        imagePhotographerUrl: 'https://www.pexels.com/@hero',
        days: [
          {
            dayNumber: 1,
            dateFormatted: '10 Nov',
            dailyCost: 25000,
            imageUrl: day1Url,
            imagePhotographer: 'Autor Día Real',
            imagePhotographerUrl: 'https://www.pexels.com/@day',
            items: [
              {
                type: 'activity',
                data: {
                  id: 'act-1',
                  timeRange: '10:00 - 12:00',
                  startTime: '10:00',
                  endTime: '12:00',
                  title: `Recorrido en ${dest}`,
                  placeName: `Plaza Central de ${dest}`,
                  description: 'Paseo matutino',
                  costText: 'Gratis',
                  costAmount: 0,
                  category: 'Cultura',
                  categoryIcon: '🏛️',
                  imageUrl: act1Url,
                  imagePhotographer: 'Autor Act 1',
                  imagePhotographerUrl: 'https://www.pexels.com/@act1',
                },
              },
              {
                type: 'activity',
                data: {
                  id: 'act-2',
                  timeRange: '13:00 - 14:30',
                  startTime: '13:00',
                  endTime: '14:30',
                  title: `Almuerzo típico en ${dest}`,
                  description: 'Gastronomía local',
                  costText: '$15.000 CLP',
                  costAmount: 15000,
                  category: 'Gastronomía',
                  categoryIcon: '🍽️',
                  isFood: true,
                  imageUrl: act2Url,
                  imagePhotographer: 'Autor Act 2',
                  imagePhotographerUrl: 'https://www.pexels.com/@act2',
                },
              },
            ],
          },
        ],
      });

      const enriched = ensureTripHasPexelsPhotos(rawTrip);
      assert.equal(enriched.imageUrl, heroUrl, `Hero URL overwritten for ${dest}`);
      assert.equal(enriched.imagePhotographer, 'Autor Hero Real');
      assert.equal(enriched.days[0].imageUrl, day1Url, `Day URL overwritten for ${dest}`);
      assert.equal(enriched.days[0].imagePhotographer, 'Autor Día Real');

      const item0 = enriched.days[0].items[0];
      const item1 = enriched.days[0].items[1];
      assert.equal(item0.type, 'activity');
      assert.equal(item1.type, 'activity');
      if (item0.type === 'activity' && item1.type === 'activity') {
        assert.equal(item0.data.imageUrl, act1Url, `Act 1 URL overwritten for ${dest}`);
        assert.equal(item1.data.imageUrl, act2Url, `Act 2 URL overwritten for ${dest}`);
      }
    }
  });

  test('assigns distinct, non-overlapping fallback URLs when imageUrls are missing without duplicating existing URLs', () => {
    // Pre-assign one catalog URL to an activity to verify hero/day fallbacks will NOT duplicate it
    const preAssignedUrl =
      'https://images.pexels.com/photos/1619317/pexels-photo-1619317.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940';

    const rawTrip = createBaseTrip('Frutillar', {
      imageUrl: undefined,
      days: [
        {
          dayNumber: 1,
          dateFormatted: '10 Nov',
          dailyCost: 18000,
          imageUrl: '',
          items: [
            {
              type: 'activity',
              data: {
                id: 'act-a',
                timeRange: '10:00 - 11:30',
                startTime: '10:00',
                endTime: '11:30',
                title: 'Caminata costanera',
                placeName: 'Muelle Histórico de Frutillar',
                description: 'Vistas al Lago Llanquihue',
                costText: 'Gratis',
                costAmount: 0,
                category: 'Naturaleza',
                categoryIcon: '🌿',
                imageUrl: preAssignedUrl,
              },
            },
            {
              type: 'activity',
              data: {
                id: 'act-b',
                timeRange: '12:00 - 13:30',
                startTime: '12:00',
                endTime: '13:30',
                title: 'Visita cultural',
                placeName: 'Museo Colonial Alemán',
                description: 'Patrimonio histórico',
                costText: '$4.000 CLP',
                costAmount: 4000,
                category: 'Cultura',
                categoryIcon: '🏛️',
                imageUrl: undefined,
              },
            },
            {
              type: 'activity',
              data: {
                id: 'act-c',
                timeRange: '16:00 - 17:30',
                startTime: '16:00',
                endTime: '17:30',
                title: 'Once tradicional',
                placeName: 'Salón de Té Kuchenladen',
                description: 'Kuchen artesanal',
                costText: '$9.000 CLP',
                costAmount: 9000,
                category: 'Gastronomía',
                categoryIcon: '🍰',
                isFood: true,
              },
            },
          ],
        },
      ],
    });

    const enriched = ensureTripHasPexelsPhotos(rawTrip);
    const collectedUrls = [
      enriched.imageUrl,
      enriched.days[0].imageUrl,
      ...enriched.days[0].items.map((i) => (i.type === 'activity' ? i.data.imageUrl : '')),
    ].filter((u): u is string => Boolean(u));

    assert.equal(collectedUrls.length, 5);
    for (const u of collectedUrls) {
      assert.equal(isValidHttpImageUrl(u), true);
    }

    const uniqueSet = new Set(collectedUrls);
    assert.equal(uniqueSet.size, collectedUrls.length, 'Expected all 5 assigned URLs to be distinct');
  });
});

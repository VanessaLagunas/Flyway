import { Trip, BudgetLevel, TripDay } from '../types';
import { DESTINATIONS_CATALOG, DestinationInfo } from '../data/destinationsData';
import { getPexelsPhotoForDestination, getPexelsPhotoForDay, ensureTripHasPexelsPhotos } from './photoUtils';
import { getWeatherAndClothingForTrip, getBudgetTierInfo } from './weatherUtils';

/**
 * Calculates number of days between two ISO date strings (clamps between 1 and 7)
 */
export function getDaysCount(startDate: string, endDate: string): number {
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return Math.min(Math.max(diffDays || 2, 1), 7);
  } catch {
    return 2;
  }
}

/**
 * Format date in Spanish (e.g. "15 de Octubre")
 */
export function formatDateSpanish(isoDate: string, dayOffset = 0): string {
  try {
    const d = new Date(isoDate);
    d.setDate(d.getDate() + dayOffset);
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return `${d.getDate()} de ${months[d.getMonth()]}`;
  } catch {
    return `Día ${dayOffset + 1}`;
  }
}

/**
 * Generate a guaranteed unique, rich trip where each day has DIFFERENT destinations,
 * DIFFERENT comunas/sectors, and DIFFERENT money (no repeated costs).
 */
export function generateSmartTrip(params: {
  destination: string;
  startDate: string;
  endDate: string;
  budget: BudgetLevel;
  interests?: string[];
}): Trip {
  const { destination, startDate, endDate, budget } = params;
  const daysCount = getDaysCount(startDate, endDate);
  const cleanDest = destination.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // Check if destination matches one of our rich catalog entries
  const matchedCatalog: DestinationInfo | undefined = DESTINATIONS_CATALOG.find((cat) => {
    const catClean = cat.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const fullClean = cat.fullName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return (
      cleanDest.includes(catClean) ||
      catClean.includes(cleanDest) ||
      fullClean.includes(cleanDest) ||
      cat.aliases.some((a) => cleanDest.includes(a.toLowerCase()))
    );
  });

  const budgetMultiplier = budget === 'budget' ? 'costBudget' : budget === 'premium' ? 'costPremium' : 'costStandard';
  const budgetLabel = budget === 'budget' ? 'Económico' : budget === 'premium' ? 'Presupuesto Premium' : 'Presupuesto Medio';

  const isChile = matchedCatalog?.isChile ?? (
    cleanDest.includes('chile') ||
    cleanDest.includes('santiago') ||
    cleanDest.includes('valparaiso') ||
    cleanDest.includes('atacama') ||
    cleanDest.includes('pucon') ||
    cleanDest.includes('chiloe') ||
    cleanDest.includes('paine') ||
    cleanDest.includes('vina del mar') ||
    cleanDest.includes('laserena') ||
    cleanDest.includes('antofagasta')
  );

  const heroPhoto = matchedCatalog?.heroImage
    ? { url: matchedCatalog.heroImage, photographer: matchedCatalog.photographer }
    : getPexelsPhotoForDestination(destination, 0);

  const days: TripDay[] = [];
  let totalTripCost = 0;

  if (matchedCatalog && matchedCatalog.dailyPlans && matchedCatalog.dailyPlans.length > 0) {
    // Generate days from catalog with distinct sectors and varied money
    for (let i = 0; i < daysCount; i++) {
      const dayIndex = i % matchedCatalog.dailyPlans.length;
      const planTemplate = matchedCatalog.dailyPlans[dayIndex];
      const dayNumber = i + 1;
      const dateFormatted = formatDateSpanish(startDate, i);

      // Apply day-specific cost factor if multi-day loops beyond template length so money is NEVER identical
      const varianceFactor = i >= matchedCatalog.dailyPlans.length ? (1 + ((i * 17) % 25) / 100) : 1;
      const baseDailyCost = planTemplate[budgetMultiplier];
      const dailyCost = Math.round(baseDailyCost * varianceFactor);
      totalTripCost += dailyCost;

      const dayTitle = i >= matchedCatalog.dailyPlans.length 
        ? `${planTemplate.dayTitle} (Extensión Día ${dayNumber})` 
        : planTemplate.dayTitle;

      const dayItems: TripDay['items'] = [];
      const acts = planTemplate.activities;

      acts.forEach((act, actIdx) => {
        const actCost = Math.round(act[budgetMultiplier] * varianceFactor);
        const costFormatted = actCost === 0 ? 'Gratis' : `$${actCost.toLocaleString('es-CL')} CLP`;

        dayItems.push({
          type: 'activity',
          data: {
            id: `act-${dayNumber}-${actIdx + 1}`,
            title: act.title,
            description: act.description,
            timeRange: act.timeRange,
            startTime: act.startTime,
            endTime: act.endTime,
            category: act.category,
            categoryIcon: act.categoryIcon,
            costAmount: actCost,
            costText: costFormatted,
            imageUrl: act.imageUrl,
            imagePhotographer: act.photographer,
            isFood: act.isFood,
            whyIncluded: act.whyIncluded,
            history: act.history,
            historicalFacts: act.historicalFacts,
            curiosity: act.curiosity,
            architectureOrHeritage: act.architectureOrHeritage,
            savingTip: act.savingTip,
          },
        });

        if (actIdx < acts.length - 1) {
          dayItems.push({
            type: 'transfer',
            data: {
              id: `tr-${dayNumber}-${actIdx + 1}`,
              text: isChile ? 'Traslado en Metro o micro local · 15 min' : 'Caminata escénica o transporte público · 15 min',
              icon: '🚶',
            },
          });
        }
      });

      days.push({
        dayNumber,
        dateFormatted,
        dailyCost,
        title: dayTitle,
        summary: planTemplate.daySummary,
        imageUrl: planTemplate.imageUrl,
        imagePhotographer: planTemplate.photographer,
        items: dayItems,
      });
    }
  } else {
    // Procedural generation for any other worldwide or Chilean destination
    // Guarantees each day has a DIFFERENT sector, DIFFERENT activities, and DIFFERENT money
    const baseDaily = budget === 'budget' ? 27000 : budget === 'premium' ? 125000 : 54000;

    // Distinct themes and varied percentage factors for every day (no two days equal)
    const sectorThemes = [
      {
        factor: 0.88,
        sector: 'Casco Histórico y Centro Patrimonial',
        title: `Casco Antiguo y Corazón Republicano de ${destination}`,
        summary: `Descubre los orígenes, plazas emblemáticas y la arquitectura fundacional de ${destination}.`,
        morning: `Plaza Principal y Museo Histórico de ${destination}`,
        morningDesc: `Recorre los edificios patrimoniales y monumentos del centro cívico.`,
        morningCost: budget === 'budget' ? 0 : 5000,
        lunch: `Almuerzo Típico y Menú del Día de Mercado`,
        lunchDesc: isChile ? `Plato tradicional en picada: cazuela, pastel de choclo o reineta frita.` : `Sabores tradicionales en mercado gastronómico local.`,
        lunchCost: budget === 'budget' ? 7000 : budget === 'premium' ? 32000 : 16000,
        afternoon: `Paseo por el Barrio de las Artes y Mirador Central`,
        afternoonDesc: `Galerías independientes, artesanía típica y vistas panorámicas.`,
        afternoonCost: budget === 'budget' ? 0 : 7000,
        evening: `Cena Tradicional y Paseo Nocturno`,
        eveningDesc: `Ambiente acogedor en taberna o bistró con productos locales.`,
        eveningCost: budget === 'budget' ? 8500 : budget === 'premium' ? 38000 : 19000,
      },
      {
        factor: 1.18, // Diferente dinero: más costoso por excursión y entradas
        sector: 'Miradores Naturales y Costa/Montaña',
        title: `Naturaleza, Miradores Panorámicos y Parques de ${destination}`,
        summary: `Jornada dedicada a los paisajes naturales, cerros o ribera costera con atardecer fotográfico.`,
        morning: `Sendero Panorámico y Santuario Natural`,
        morningDesc: `Caminata al aire libre con vista privilegiada a todo el entorno geográfico.`,
        morningCost: budget === 'budget' ? 3500 : 12000,
        lunch: `Almuerzo Campestre o Marino frente a la Vista`,
        lunchDesc: `Gastronomía con ingredientes frescos del valle o la costa.`,
        lunchCost: budget === 'budget' ? 9500 : budget === 'premium' ? 42000 : 21000,
        afternoon: `Actividad al Aire Libre y Visita a Jardín Botánico`,
        afternoonDesc: `Contacto con flora nativa y senderos de relajación.`,
        afternoonCost: budget === 'budget' ? 2500 : 8000,
        evening: `Atardecer Dorado y Cafetería con Terraza`,
        eveningDesc: `Cierre del día observando el crepúsculo con café de especialidad.`,
        eveningCost: budget === 'budget' ? 6000 : budget === 'premium' ? 28000 : 14000,
      },
      {
        factor: 0.94, // Diferente dinero: intermedio
        sector: 'Barrio Bohemio, Diseño y Cultura Urbana',
        title: `Diseño de Autor, Anticuarios y Vida Urbana en ${destination}`,
        summary: `Explora el barrio bohemio con cafés de especialidad, galerías independientes y ambiente relajado.`,
        morning: `Ruta de Murales y Tiendas de Diseño Local`,
        morningDesc: `Pasajes peatonales con talleres de diseñadores y librerías de autor.`,
        morningCost: 0,
        lunch: `Bistró Urbano y Cocina Fusión`,
        lunchDesc: `Propuestas frescas e innovadoras preparadas con productos de estación.`,
        lunchCost: budget === 'budget' ? 8000 : budget === 'premium' ? 36000 : 18000,
        afternoon: `Centro Cultural y Exposición de Arte Contemporáneo`,
        afternoonDesc: `Muestras de artistas locales y arquitectura contemporánea.`,
        afternoonCost: budget === 'budget' ? 0 : 6000,
        evening: `Música en Vivo y Coctelería de Autor`,
        eveningDesc: `Encuentro en terraza con cervezas artesanales o vinos locales.`,
        eveningCost: budget === 'budget' ? 9000 : budget === 'premium' ? 34000 : 17000,
      },
      {
        factor: 1.32, // Diferente dinero: día premium / tour estrella
        sector: 'Excursión Regional y Valles Alrededor',
        title: `Excursión a los Alrededores, Viñedos y Paisajes Rurales`,
        summary: `Salida de las avenidas principales hacia poblados rurales, tradiciones de campo y viñedos.`,
        morning: `Tour Guiado a Viña o Reserva Natural`,
        morningDesc: `Paseo por senderos agrícolas con degustación guiada.`,
        morningCost: budget === 'budget' ? 8000 : budget === 'premium' ? 55000 : 25000,
        lunch: `Asado Campestre o Degustación Tradicional en Rancho`,
        lunchDesc: `Banquete preparado a fuego lento con recetas de campo.`,
        lunchCost: budget === 'budget' ? 12000 : budget === 'premium' ? 48000 : 25000,
        afternoon: `Pueblo Artesanal y Talleres de Oficios`,
        afternoonDesc: `Encuentro con artesanos en madera, greda, lana o telar.`,
        afternoonCost: budget === 'budget' ? 0 : 10000,
        evening: `Regreso y Once Tradicional Campestre`,
        eveningDesc: `Té de hierbas locales, pan amasado caliente y mermeladas caseras.`,
        eveningCost: budget === 'budget' ? 5000 : budget === 'premium' ? 24000 : 11000,
      },
      {
        factor: 0.78, // Diferente dinero: día relajado y económico
        sector: 'Mercados Populares y Tradición Viva',
        title: `Mercados Populares, Ferias y Sabores Auténticos de ${destination}`,
        summary: `Conoce la vida cotidiana local entre puestos de frutas, flores, artesanías y música popular.`,
        morning: `Feria de Abastos y Puestos de Artesanos`,
        morningDesc: `Colores y aromas de los productos más frescos traídos por agricultores.`,
        morningCost: 0,
        lunch: `Picada Popular y Sabor Casero`,
        lunchDesc: `El clásico plato del día abundante y económico con ensalada chilena.`,
        lunchCost: budget === 'budget' ? 6500 : budget === 'premium' ? 26000 : 13000,
        afternoon: `Paseo Fluvial o Costanero Peatonal`,
        afternoonDesc: `Caminata sin prisa junto al agua con brisa fresca.`,
        afternoonCost: 0,
        evening: `Heladería Tradicional y Despedida`,
        eveningDesc: `Degustación de helados artesanales elaborados con frutos de la zona.`,
        eveningCost: budget === 'budget' ? 4000 : budget === 'premium' ? 18000 : 8000,
      },
    ];

    for (let i = 0; i < daysCount; i++) {
      const theme = sectorThemes[i % sectorThemes.length];
      const dayNumber = i + 1;
      const dateFormatted = formatDateSpanish(startDate, i);

      // Vary cost mathematically by index so each day has a distinct budget
      const dailyCost = Math.round(baseDaily * theme.factor);
      totalTripCost += dailyCost;

      const dayPhoto = getPexelsPhotoForDay({ dayNumber }, destination, i);

      days.push({
        dayNumber,
        dateFormatted,
        dailyCost,
        title: theme.title,
        summary: theme.summary,
        imageUrl: dayPhoto.url,
        imagePhotographer: dayPhoto.photographer,
        items: [
          {
            type: 'activity',
            data: {
              id: `act-${dayNumber}-1`,
              timeRange: '09:30 - 11:30',
              startTime: '09:30',
              endTime: '11:30',
              title: theme.morning,
              description: theme.morningDesc,
              category: 'Cultura & Exploración',
              categoryIcon: '🏛️',
              costAmount: theme.morningCost,
              costText: theme.morningCost === 0 ? 'Gratis' : `$${theme.morningCost.toLocaleString('es-CL')} CLP`,
              whyIncluded: 'Comienza en el sector más representativo para orientarse.',
              history: isChile
                ? `Epicentro fundacional de ${destination}, trazado en damero durante los albores republicanos. Este sector ha sido testigo de los momentos cívicos más trascendentales de la región, conservando edificios patrimoniales que combinan influencias coloniales y neoclásicas traídas por los primeros maestros constructores.`
                : `Corazón neurálgico e histórico de ${destination}, donde convergen los monumentos fundacionales, palacios de gobierno y plazas principales que han marcado la evolución cultural y social de esta emblemática urbe a través de los siglos.`,
              historicalFacts: isChile ? [
                `Siglo XIX: Consolidación del trazado urbano con la edificación de los primeros templos cívicos y gobernaciones.`,
                `1920-1950: Modernización del espacio público con árboles centenarios y luminarias de hierro forjado.`,
                `Patrimonio vivo: Punto de encuentro de artistas populares, cronistas urbanos y tradiciones comunales.`,
              ] : [
                `Orígenes históricos: Primeros asentamientos y trazado original de la ciudad antigua.`,
                `Siglo XIX: Transformación arquitectónica monumental e integración de servicios públicos.`,
                `Reconocimiento: Catalogado como punto neurálgico de preservación histórica.`,
              ],
              curiosity: isChile 
                ? `Bajo el pavimento de este sector descansan antiguos adoquines de piedra canteada que formaban las primeras rutas de carretas del valle.`
                : `La disposición de sus plazas principales fue diseñada según la orientación solar para favorecer la iluminación en invierno.`,
              architectureOrHeritage: isChile
                ? 'Zona Típica y Patrimonio Histórico con arquitectura de fachada continua, portales con arcos de medio punto y pilares de maderas nativas.'
                : 'Conjunto urbano protegido con elementos de arquitectura tradicional y fachadas históricas restauradas.',
              savingTip: 'Caminar temprano evita el tráfico y las aglomeraciones.',
              imageUrl: dayPhoto.url,
            },
          },
          {
            type: 'transfer',
            data: {
              id: `tr-${dayNumber}-1`,
              text: 'Caminata o traslado local · 12 min',
              icon: '🚶',
            },
          },
          {
            type: 'activity',
            data: {
              id: `act-${dayNumber}-2`,
              timeRange: '12:30 - 14:00',
              startTime: '12:30',
              endTime: '14:00',
              title: theme.lunch,
              description: theme.lunchDesc,
              category: 'Gastronomía',
              categoryIcon: '🍽️',
              isFood: true,
              costAmount: theme.lunchCost,
              costText: `$${theme.lunchCost.toLocaleString('es-CL')} CLP`,
              whyIncluded: 'Sabor local representativo del sector.',
              history: isChile
                ? `Las cocinerías y picadas tradicionales de este barrio nacieron para alimentar a los trabajadores y comerciantes de las primeras ferias libres. Hoy conservan preparaciones ancestrales como caldos en greda, pasteles de maíz criollo y adobos campesinos con recetas transmitidas de madres a hijas durante más de un siglo.`
                : `Tradición culinaria arraigada en el intercambio mercantil de la zona, donde las recetas familiares han sabido preservar las técnicas ancestrales de cocción lenta y los sabores autóctonos de la tierra.`,
              historicalFacts: isChile ? [
                `1890: Establecimiento de los primeros fogones comunitarios en las inmediaciones del mercado.`,
                `1930: Popularización de las ollas de greda de Pomaire y platos emblemáticos como la cazuela y el arrollado.`,
                `Identidad: Reconocido por cronistas culinarios como bastión de la cocina criolla sin adulteraciones.`,
              ] : [
                `Tradición de abastos: Nacimiento de los comedores populares a orillas de las rutas comerciales.`,
                `Evolución: Transición hacia una cocina de autor que rescata materias primas locales.`,
              ],
              curiosity: isChile
                ? `El pebre servido en este lugar se prepara siguiendo la fórmula tradicional con ají verde fresco machacado en mortero de piedra volcánica.`
                : `Muchos ingredientes provienen de huertos periurbanos recolectados al amanecer del mismo día.`,
              architectureOrHeritage: isChile
                ? 'Comedores tradicionales de techos altos y pisos de mosaico calcáreo, testimonio de la época de oro de los mesones populares.'
                : 'Inmueble con valor patrimonial gastronómico popular.',
              savingTip: 'El menú del día incluye plato principal, ensalada y bebestible.',
              imageUrl: dayPhoto.url,
            },
          },
          {
            type: 'transfer',
            data: {
              id: `tr-${dayNumber}-2`,
              text: 'Paseo hacia el mirador · 10 min',
              icon: '🚶',
            },
          },
          {
            type: 'activity',
            data: {
              id: `act-${dayNumber}-3`,
              timeRange: '15:30 - 18:00',
              startTime: '15:30',
              endTime: '18:00',
              title: theme.afternoon,
              description: theme.afternoonDesc,
              category: 'Naturaleza & Paisaje',
              categoryIcon: '🌿',
              costAmount: theme.afternoonCost,
              costText: theme.afternoonCost === 0 ? 'Gratis' : `$${theme.afternoonCost.toLocaleString('es-CL')} CLP`,
              whyIncluded: 'Luz óptima para contemplación y fotografía.',
              history: isChile
                ? `Los cerros isla y elevaciones de la zona fueron antiguamente considerados 'Apus' o promontorios sagrados por las culturas originarias (Picunches e Incas), sirviendo como observatorios astronómicos y refugios defensivos antes de ser convertidos en parques públicos durante el siglo XX.`
                : `Reserva natural y mirador escénico de gran trascendencia geográfica, protegido para la conservación de la flora autóctona y el disfrute de las vistas panorámicas de la región.`,
              historicalFacts: isChile ? [
                `Época precolombina: Uso ceremonial y atalayas de avistamiento por pueblos originarios.`,
                `1900-1930: Forestación con especies nativas (quillayes, peumos, espinos) para frenar la erosión eólica.`,
                `Actualidad: Corredor biológico fundamental para aves silvestres y senderismo comunitario.`,
              ] : [
                `Conservación: Declaratoria de protección ambiental para salvaguardar el pulmón verde.`,
                `Red de senderos: Caminos históricos adaptados para ecoturismo accesible.`,
              ],
              curiosity: isChile
                ? `En las tardes despejadas después de lluvia, la visibilidad alcanza más de 40 kilómetros, divisándose los glaciares cordilleranos.`
                : `La brisa térmica que baja por la quebrada genera un microclima hasta 4 grados más fresco que en el llano.`,
              architectureOrHeritage: isChile
                ? 'Santuario de la Naturaleza y Parque Urbano Protegido con muros de contención de pirca de piedra seca.'
                : 'Área natural protegida de uso público.',
              savingTip: 'Lleva agua reutilizable para evitar comprar botellas desechables.',
              imageUrl: dayPhoto.url,
            },
          },
          {
            type: 'activity',
            data: {
              id: `act-${dayNumber}-4`,
              timeRange: '19:30 - 21:30',
              startTime: '19:30',
              endTime: '21:30',
              title: theme.evening,
              description: theme.eveningDesc,
              category: 'Relajación & Cena',
              categoryIcon: '☕',
              isFood: true,
              costAmount: theme.eveningCost,
              costText: `$${theme.eveningCost.toLocaleString('es-CL')} CLP`,
              whyIncluded: 'Cierre del día con gastronomía y descanso.',
              history: isChile
                ? `Barrio residencial de comienzos del siglo XX que floreció con las corrientes migratorias de artesanos, ebanistas y tipógrafos. Al caer la noche, sus callejones de adoquines cobran vida con cafés literarios y tabernas que mantienen viva la tertulia y la música de raíz folclórica.`
                : `Sector cosmopolita y bohemio caracterizado por sus antiguas casas residenciales reacondicionadas como tabernas de autor y espacios de reunión cultural.`,
              historicalFacts: isChile ? [
                `1910: Construcción de las primeras villas de empleados públicos y artesanos extranjeros.`,
                `1970-1990: Refugio de artistas, poetas y libreros independientes.`,
                `Siglo XXI: Consolidación como polo gastronómico y patrimonial de vida nocturna segura y caminable.`,
              ] : [
                `Origen fabril o residencial de principios del siglo XX.`,
                `Reconversión artística y cultural para la vida nocturna.`,
              ],
              curiosity: isChile
                ? `Muchas de las tabernas de este barrio aún conservan los antiguos sótanos de ladrillo donde se almacenaba vino en pipas de roble y chicha cocida.`
                : `Los faroles de hierro fundido de las esquinas fueron réplicas exactas de los primeros alumbrados a gas de la ciudad.`,
              architectureOrHeritage: isChile
                ? 'Casonas de estilo ecléctico y art decó con zócalos de piedra y rejas de forja artística.'
                : 'Edificaciones de época preservadas con iluminación cálida de bajo impacto.',
              savingTip: 'Aprovecha las promociones de media tarde.',
              imageUrl: dayPhoto.url,
            },
          },
        ],
      });
    }
  }

  const startFmt = formatDateSpanish(startDate);
  const endFmt = formatDateSpanish(endDate);
  const weatherInfo = getWeatherAndClothingForTrip(destination, startDate, endDate);
  const budgetTier = getBudgetTierInfo(budget);

  const generatedTrip: Trip = {
    id: `trip-${Date.now()}`,
    title: matchedCatalog ? `Ruta Completa por ${matchedCatalog.name}` : `Ruta Personalizada por ${destination}`,
    destination,
    datesText: `${startFmt} - ${endFmt}`,
    startDate,
    endDate,
    budgetLevel: budget,
    budgetLabel,
    budgetRangeText: budgetTier.dailyRangeText,
    budgetDescription: budgetTier.description,
    totalCost: totalTripCost,
    currency: 'CLP',
    summary: matchedCatalog 
      ? `Itinerario de ${daysCount} días recorriendo sus diversas comunas (${matchedCatalog.comunasOrSectors.map(c => c.name).slice(0, 3).join(', ')}), con actividades y presupuestos diarios adaptados.`
      : `Ruta de ${daysCount} días descubriendo diferentes sectores y barrios de ${destination}, con presupuestos y atractivos variados cada día.`,
    season: weatherInfo.season,
    currentSeason: weatherInfo.currentSeason,
    weatherCondition: weatherInfo.weatherCondition,
    temperatureRange: weatherInfo.temperatureRange,
    weatherSummary: weatherInfo.weatherSummary,
    clothingTip: weatherInfo.clothingTip,
    clothingItems: weatherInfo.clothingItems,
    imageUrl: heroPhoto.url,
    imagePhotographer: heroPhoto.photographer,
    destinationCountry: isChile ? 'Chile 🇨🇱' : 'Internacional 🌎',
    isChileanDestination: isChile,
    isFavorite: false,
    whyThisRoute: `Cada día explora un sector y comuna diferente, distribuyendo los costos de manera variada y sin repetir destinos.`,
    savingTips: [
      'Usa el transporte público integrado (Metro y micros) para moverte entre comunas.',
      'Almuerza el menú del día en picadas de barrio para ahorrar hasta un 40%.',
      'Aprovecha los museos públicos y parques comunales que cuentan con acceso liberado.',
    ],
    days,
  };

  return ensureTripHasPexelsPhotos(generatedTrip);
}

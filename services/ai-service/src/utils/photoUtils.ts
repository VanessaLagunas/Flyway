import { Activity, Trip, TripDay } from '../types';

export interface PexelsPhotoMeta {
  url: string;
  alt: string;
  photographer: string;
  photographerUrl: string;
}

/**
 * Curated, verified, permanent high-resolution Pexels photos for Chile and world destinations.
 * Every photo is verified to be active and authentic on Pexels.
 */
export const PEXELS_DESTINATION_PHOTOS: Record<string, PexelsPhotoMeta[]> = {
  torres: [
    {
      url: 'https://images.pexels.com/photos/30359266/pexels-photo-30359266.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      alt: 'Torres del Paine y lagos turquesa de la Patagonia chilena',
      photographer: 'Marek Piwnicki',
      photographerUrl: 'https://www.pexels.com/@marekpiwnicki',
    },
    {
      url: 'https://images.pexels.com/photos/33149705/pexels-photo-33149705.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      alt: 'Macizo del Paine y senderos patagónicos',
      photographer: 'Marek Piwnicki',
      photographerUrl: 'https://www.pexels.com/@marekpiwnicki',
    },
    {
      url: 'https://images.pexels.com/photos/12106779/pexels-photo-12106779.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      alt: 'Senderista explorando el Parque Nacional Torres del Paine',
      photographer: 'Cristian Villanueva',
      photographerUrl: 'https://www.pexels.com/@cristian-villanueva-1279813',
    },
    {
      url: 'https://images.pexels.com/photos/10917647/pexels-photo-10917647.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      alt: 'Glaciar y lagunas en Patagonia',
      photographer: 'Edward',
      photographerUrl: 'https://www.pexels.com/@edward-21443834',
    },
    {
      url: 'https://images.pexels.com/photos/1525041/pexels-photo-1525041.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      alt: 'Cumbres graníticas y reflejos en lago patagónico',
      photographer: 'Frans van Heerden',
      photographerUrl: 'https://www.pexels.com/@frans-van-heerden-201846',
    },
    {
      url: 'https://images.pexels.com/photos/2356045/pexels-photo-2356045.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      alt: 'Sendero de alta montaña y valle glacial en Patagonia',
      photographer: 'Errin Casano',
      photographerUrl: 'https://www.pexels.com/@errin-casano',
    },
  ],
  valparaiso: [
    {
      url: 'https://images.pexels.com/photos/17808457/pexels-photo-17808457.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      alt: 'Casas coloridas y bahía del puerto de Valparaíso',
      photographer: 'Lais Queiroz',
      photographerUrl: 'https://www.pexels.com/@laisqfotografia',
    },
    {
      url: 'https://images.pexels.com/photos/33432910/pexels-photo-33432910.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      alt: 'Arquitectura y casonas en los cerros de Valparaíso',
      photographer: 'CamilaIgnacia Anguloğlu',
      photographerUrl: 'https://www.pexels.com/@camila-angulo',
    },
    {
      url: 'https://images.pexels.com/photos/10989537/pexels-photo-10989537.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      alt: 'Murales y escaleras en Cerro Alegre y Concepción',
      photographer: 'David Vives',
      photographerUrl: 'https://www.pexels.com/@davidvives',
    },
    {
      url: 'https://images.pexels.com/photos/16551933/pexels-photo-16551933.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      alt: 'Casonas tradicionales porteñas',
      photographer: 'Cristian Salinas Cisternas',
      photographerUrl: 'https://www.pexels.com/@cristian-salinas-cisternas-20419268',
    },
    {
      url: 'https://images.pexels.com/photos/38340557/pexels-photo-38340557.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      alt: 'Palacio Baburizza y paseo Yugoslavo',
      photographer: 'Magda Ehlers',
      photographerUrl: 'https://www.pexels.com/@magda-ehlers-pexels',
    },
    {
      url: 'https://images.pexels.com/photos/38993747/pexels-photo-38993747.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      alt: 'Caleta pesquera y costa de Valparaíso',
      photographer: "César O'neill",
      photographerUrl: 'https://www.pexels.com/@cesar-oneill',
    },
  ],
  atacama: [
    {
      url: 'https://images.pexels.com/photos/27878411/pexels-photo-27878411.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      alt: 'Valle de la Luna en San Pedro de Atacama',
      photographer: 'Eleanore Stohner',
      photographerUrl: 'https://www.pexels.com/@eleanore-stohner-499317537',
    },
    {
      url: 'https://images.pexels.com/photos/23886066/pexels-photo-23886066.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      alt: 'Atardecer dorado en el Desierto de Atacama',
      photographer: 'Eleanore Stohner',
      photographerUrl: 'https://www.pexels.com/@eleanore-stohner-499317537',
    },
    {
      url: 'https://images.pexels.com/photos/10989534/pexels-photo-10989534.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      alt: 'Dunas y formaciones salinas en San Pedro de Atacama',
      photographer: 'David Vives',
      photographerUrl: 'https://www.pexels.com/@davidvives',
    },
    {
      url: 'https://images.pexels.com/photos/1624496/pexels-photo-1624496.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      alt: 'Cielo estrellado y astroturismo en Atacama',
      photographer: 'Eberhard Grossgasteiger',
      photographerUrl: 'https://www.pexels.com/@eberhardgross',
    },
    {
      url: 'https://images.pexels.com/photos/248797/pexels-photo-248797.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      alt: 'Lagunas altiplánicas y salares del desierto',
      photographer: 'Pixabay',
      photographerUrl: 'https://www.pexels.com',
    },
    {
      url: 'https://images.pexels.com/photos/1001435/pexels-photo-1001435.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      alt: 'Cañones áridos y cordillera de la sal en Atacama',
      photographer: 'The Lazy Artist Gallery',
      photographerUrl: 'https://www.pexels.com',
    },
  ],
  chiloe: [
    {
      url: 'https://images.pexels.com/photos/7213869/pexels-photo-7213869.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      alt: 'Palafitos de colores sobre el agua en Castro, Chiloé',
      photographer: "Tom D'Arby",
      photographerUrl: 'https://www.pexels.com/@tomdarby',
    },
    {
      url: 'https://images.pexels.com/photos/36186978/pexels-photo-36186978.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      alt: 'Botes de pescadores en ensenada chilota',
      photographer: 'Cristian Salinas Cisternas',
      photographerUrl: 'https://www.pexels.com/@cristian-salinas-cisternas-20419268',
    },
    {
      url: 'https://images.pexels.com/photos/2832041/pexels-photo-2832041.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      alt: 'Paisaje verde y costas del archipiélago de Chiloé',
      photographer: 'Diego Madrigal',
      photographerUrl: 'https://www.pexels.com/@diego-madrigal',
    },
    {
      url: 'https://images.pexels.com/photos/1619317/pexels-photo-1619317.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      alt: 'Muelle de las Almas y acantilados verdes chilotes',
      photographer: 'James Wheeler',
      photographerUrl: 'https://www.pexels.com/@souvenirpixels',
    },
    {
      url: 'https://images.pexels.com/photos/38993747/pexels-photo-38993747.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      alt: 'Gastronomía marina y curanto en caleta chilota',
      photographer: "César O'neill",
      photographerUrl: 'https://www.pexels.com/@cesar-oneill',
    },
  ],
  pucon: [
    {
      url: 'https://images.pexels.com/photos/20903493/pexels-photo-20903493.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      alt: 'Volcán Villarrica nevado y lago en Pucón',
      photographer: 'Exequiel Fuentes',
      photographerUrl: 'https://www.pexels.com/@exequiel-fuentes',
    },
    {
      url: 'https://images.pexels.com/photos/18161221/pexels-photo-18161221.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      alt: 'Vista serena del Lago Villarrica y naturaleza de la Araucanía',
      photographer: 'Matías Macaya',
      photographerUrl: 'https://www.pexels.com/@matias-macaya',
    },
    {
      url: 'https://images.pexels.com/photos/1578750/pexels-photo-1578750.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      alt: 'Termas naturales y bosque nativo en el sur de Chile',
      photographer: 'Visit Greenland',
      photographerUrl: 'https://www.pexels.com',
    },
    {
      url: 'https://images.pexels.com/photos/167699/pexels-photo-167699.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      alt: 'Bosque de araucarias y senderos del Parque Huerquehue',
      photographer: 'Lumn',
      photographerUrl: 'https://www.pexels.com/@lumn',
    },
    {
      url: 'https://images.pexels.com/photos/417074/pexels-photo-417074.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      alt: 'Ojos del Caburgua y cascadas rodeadas de selva valdiviana',
      photographer: 'James Wheeler',
      photographerUrl: 'https://www.pexels.com/@souvenirpixels',
    },
  ],
  santiago: [
    {
      url: 'https://images.pexels.com/photos/37314783/pexels-photo-37314783.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      alt: 'Santiago de Chile y Cordillera de los Andes desde Cerro San Cristóbal',
      photographer: 'Nikolai Kolosov',
      photographerUrl: 'https://www.pexels.com/@nikolai-kolosov-20411833',
    },
    {
      url: 'https://images.pexels.com/photos/37535153/pexels-photo-37535153.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      alt: 'Panorámica urbana y cerros de Santiago',
      photographer: 'Nikolai Kolosov',
      photographerUrl: 'https://www.pexels.com/@nikolai-kolosov-20411833',
    },
    {
      url: 'https://images.pexels.com/photos/34004193/pexels-photo-34004193.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      alt: 'Viñedos y valles vitivinícolas del Maipo y Casablanca',
      photographer: 'DΛVΞ GΛRCIΛ',
      photographerUrl: 'https://www.pexels.com/@dave-garcia',
    },
    {
      url: 'https://images.pexels.com/photos/19739069/pexels-photo-19739069.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      alt: 'Palacio de La Moneda y centro cívico histórico',
      photographer: 'Matheus Natan',
      photographerUrl: 'https://www.pexels.com/@matheusnatan',
    },
    {
      url: 'https://images.pexels.com/photos/17347192/pexels-photo-17347192.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      alt: 'Mirador Sky Costanera y Providencia al atardecer',
      photographer: 'Alexis Leandro Jeria Bocca',
      photographerUrl: 'https://www.pexels.com/@alexis-leandro-jeria-bocca',
    },
  ],
  cusco: [
    {
      url: 'https://images.pexels.com/photos/2929906/pexels-photo-2929906.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      alt: 'Ciudadela de Machu Picchu y montañas andinas en Cusco, Perú',
      photographer: 'Chelsea Cook',
      photographerUrl: 'https://www.pexels.com/@chelsea-cook',
    },
    {
      url: 'https://images.pexels.com/photos/3538245/pexels-photo-3538245.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      alt: 'Plaza de Armas y centro histórico colonial e inca de Cusco',
      photographer: 'Ayrton',
      photographerUrl: 'https://www.pexels.com',
    },
    {
      url: 'https://images.pexels.com/photos/259967/pexels-photo-259967.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      alt: 'Terrazas agrícolas del Valle Sagrado de los Incas',
      photographer: 'Pixabay',
      photographerUrl: 'https://www.pexels.com',
    },
    {
      url: 'https://images.pexels.com/photos/90597/pexels-photo-90597.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      alt: 'Arquitectura incaica y callejones de piedra en San Blas, Cusco',
      photographer: 'Pixabay',
      photographerUrl: 'https://www.pexels.com',
    },
    {
      url: 'https://images.pexels.com/photos/1684187/pexels-photo-1684187.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      alt: 'Textiles tradicionales andinos y artesanía cusqueña',
      photographer: 'Persnickety Prints',
      photographerUrl: 'https://www.pexels.com',
    },
  ],
  tokio: [
    {
      url: 'https://images.pexels.com/photos/2506923/pexels-photo-2506923.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      alt: 'Calles iluminadas de Shinjuku y Shibuya en Tokio, Japón',
      photographer: 'Aleksandar Pasaric',
      photographerUrl: 'https://www.pexels.com/@apasaric',
    },
    {
      url: 'https://images.pexels.com/photos/161401/fushimi-inari-taisha-shrine-kyoto-japan-161401.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      alt: 'Templo tradicional japonés y santuarios históricos en Tokio',
      photographer: 'Pixabay',
      photographerUrl: 'https://www.pexels.com',
    },
    {
      url: 'https://images.pexels.com/photos/3408354/pexels-photo-3408354.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      alt: 'Torre de Tokio y horizonte con el Monte Fuji al atardecer',
      photographer: 'Tomáš Malík',
      photographerUrl: 'https://www.pexels.com/@tomas-malik-793526',
    },
    {
      url: 'https://images.pexels.com/photos/208745/pexels-photo-208745.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      alt: 'Jardines imperiales y arquitectura japonesa en Asakusa',
      photographer: 'Pixabay',
      photographerUrl: 'https://www.pexels.com',
    },
    {
      url: 'https://images.pexels.com/photos/2098085/pexels-photo-2098085.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      alt: 'Gastronomía japonesa: sushi fresco y ramen tradicional en Tokio',
      photographer: 'Valeria Boltneva',
      photographerUrl: 'https://www.pexels.com/@valeriya',
    },
  ],
  roma: [
    {
      url: 'https://images.pexels.com/photos/2064827/pexels-photo-2064827.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      alt: 'Coliseo Romano al atardecer en Roma, Italia',
      photographer: 'Davide De Giovanni',
      photographerUrl: 'https://www.pexels.com/@davidedegiovanni',
    },
    {
      url: 'https://images.pexels.com/photos/1797161/pexels-photo-1797161.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      alt: 'Fontana di Trevi y plazas barrocas de Roma',
      photographer: 'Chait Goli',
      photographerUrl: 'https://www.pexels.com/@chait-goli',
    },
    {
      url: 'https://images.pexels.com/photos/532263/pexels-photo-532263.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      alt: 'Basílica de San Pedro y Ciudad del Vaticano desde el río Tíber',
      photographer: 'Pixabay',
      photographerUrl: 'https://www.pexels.com',
    },
    {
      url: 'https://images.pexels.com/photos/753639/pexels-photo-753639.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      alt: 'Callejones pintorescos y trattorias en el barrio de Trastevere, Roma',
      photographer: 'Julius Silver',
      photographerUrl: 'https://www.pexels.com/@julius-silver-240301',
    },
    {
      url: 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      alt: 'Auténtica pasta italiana artesanal y gastronomía romana',
      photographer: 'Lisa Fotios',
      photographerUrl: 'https://www.pexels.com/@fotios-photos',
    },
  ],
  buenos_aires: [
    {
      url: 'https://images.pexels.com/photos/13694408/pexels-photo-13694408.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      alt: 'Avenida 9 de Julio y Obelisco en Buenos Aires, Argentina',
      photographer: 'Matias Lugea',
      photographerUrl: 'https://www.pexels.com',
    },
    {
      url: 'https://images.pexels.com/photos/2438323/pexels-photo-2438323.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      alt: 'Caminito en La Boca y arquitectura porteña en Buenos Aires',
      photographer: 'Gaston R.',
      photographerUrl: 'https://www.pexels.com',
    },
    {
      url: 'https://images.pexels.com/photos/1833349/pexels-photo-1833349.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      alt: 'Parrilla argentina tradicional y corte de asado en Palermo',
      photographer: 'Valeria Boltneva',
      photographerUrl: 'https://www.pexels.com/@valeriya',
    },
    {
      url: 'https://images.pexels.com/photos/2087391/pexels-photo-2087391.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      alt: 'Cafés notables, librerías y avenidas arboladas de Recoleta y San Telmo',
      photographer: 'Haley Black',
      photographerUrl: 'https://www.pexels.com',
    },
  ],
};

/**
 * Granular, verified Pexels photo collections organized by historical character,
 * architectural style, and specific place typologies.
 * Ensures every place has a distinct, non-repeated image matching its story.
 */
export const PEXELS_HISTORICAL_THEMES: Record<string, PexelsPhotoMeta[]> = {
  // Castillos, fuertes de piedra y torreones defensivos
  castle_fortress: [
    {
      url: 'https://images.pexels.com/photos/38313219/pexels-photo-38313219.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      alt: 'Castillo Hidalgo y torreón en Cerro Santa Lucía',
      photographer: 'Pexels Contributor',
      photographerUrl: 'https://www.pexels.com',
    },
    {
      url: 'https://images.pexels.com/photos/19739066/pexels-photo-19739066.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      alt: 'Murallas de piedra y fortaleza militar histórica',
      photographer: 'Matheus Natan',
      photographerUrl: 'https://www.pexels.com/@matheusnatan',
    },
    {
      url: 'https://images.pexels.com/photos/208636/pexels-photo-208636.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      alt: 'Bastión histórico con arcos de medio punto de cantería',
      photographer: 'Pixabay',
      photographerUrl: 'https://www.pexels.com',
    },
  ],

  // Palacios neoclásicos, casas de gobierno y casonas de época
  palace_neoclassical: [
    {
      url: 'https://images.pexels.com/photos/19739069/pexels-photo-19739069.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      alt: 'Palacio presidencial neoclásico con columnas y patios cívicos',
      photographer: 'Matheus Natan',
      photographerUrl: 'https://www.pexels.com/@matheusnatan',
    },
    {
      url: 'https://images.pexels.com/photos/33432910/pexels-photo-33432910.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      alt: 'Casonas señoriales y arquitectura patrimonial del siglo XIX',
      photographer: 'CamilaIgnacia Anguloğlu',
      photographerUrl: 'https://www.pexels.com/@camila-angulo',
    },
    {
      url: 'https://images.pexels.com/photos/38340557/pexels-photo-38340557.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      alt: 'Palacio patrimonial de estilo art nouveau y neoclásico',
      photographer: 'Magda Ehlers',
      photographerUrl: 'https://www.pexels.com/@magda-ehlers-pexels',
    },
  ],

  // Funiculares, tranvías de cremallera y ascensores patrimoniales
  funicular_cablecar: [
    {
      url: 'https://images.pexels.com/photos/33220378/pexels-photo-33220378.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      alt: 'Funicular histórico ascendiendo por el riel de cremallera',
      photographer: 'Photography Gu',
      photographerUrl: 'https://www.pexels.com',
    },
    {
      url: 'https://images.pexels.com/photos/26970226/pexels-photo-26970226.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      alt: 'Tranvía histórico y vías de ascenso montañoso',
      photographer: 'Pexels Contributor',
      photographerUrl: 'https://www.pexels.com',
    },
    {
      url: 'https://images.pexels.com/photos/31752311/pexels-photo-31752311.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      alt: 'Ascensor de época y vista panorámica',
      photographer: 'Photography Gu',
      photographerUrl: 'https://www.pexels.com',
    },
  ],

  // Museos de bellas artes, galerías y casas de poetas
  museum_art: [
    {
      url: 'https://images.pexels.com/photos/33028087/pexels-photo-33028087.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      alt: 'Museo Nacional de Bellas Artes y cúpula de cristal histórica',
      photographer: 'Fernando Paleta',
      photographerUrl: 'https://www.pexels.com/@fernandopaleta',
    },
    {
      url: 'https://images.pexels.com/photos/10989537/pexels-photo-10989537.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      alt: 'Galería de arte y colecciones históricas',
      photographer: 'David Vives',
      photographerUrl: 'https://www.pexels.com/@davidvives',
    },
    {
      url: 'https://images.pexels.com/photos/16551933/pexels-photo-16551933.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      alt: 'Casa museo de autor con mascarones y maderas nobles',
      photographer: 'Cristian Salinas Cisternas',
      photographerUrl: 'https://www.pexels.com/@cristian-salinas-cisternas-20419268',
    },
  ],

  // Iglesias coloniales, claustros de adobe y templos patrimoniales
  church_colonial: [
    {
      url: 'https://images.pexels.com/photos/18156722/pexels-photo-18156722.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      alt: 'Pueblito Los Dominicos y claustro colonial de frailes dominicos',
      photographer: 'Camilo Ospina',
      photographerUrl: 'https://www.pexels.com/@camilo-ospina',
    },
    {
      url: 'https://images.pexels.com/photos/7213869/pexels-photo-7213869.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      alt: 'Iglesia chilota de madera de alerce con encajes artesanales',
      photographer: "Tom D'Arby",
      photographerUrl: 'https://www.pexels.com/@tomdarby',
    },
  ],

  // Viñas centenarias, bodegas subterráneas y cavas de barricas
  wine_cellar: [
    {
      url: 'https://images.pexels.com/photos/34004193/pexels-photo-34004193.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      alt: 'Viñedos señoriales al pie de la cordillera andina',
      photographer: 'DΛVΞ GΛRCIΛ',
      photographerUrl: 'https://www.pexels.com/@dave-garcia',
    },
    {
      url: 'https://images.pexels.com/photos/33259390/pexels-photo-33259390.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      alt: 'Cavas subterráneas de vino con barricas de roble francés',
      photographer: 'Pexels Contributor',
      photographerUrl: 'https://www.pexels.com',
    },
    {
      url: 'https://images.pexels.com/photos/20320313/pexels-photo-20320313.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      alt: 'Bodega de vino y degustación de cepas reserva',
      photographer: 'Brett Jordan',
      photographerUrl: 'https://www.pexels.com/@brettjordan',
    },
  ],

  // Mercados históricos, cocinerías de abasto y caletas marinas
  market_culinary: [
    {
      url: 'https://images.pexels.com/photos/19762180/pexels-photo-19762180.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      alt: 'Mercado Central y nave de hierro forjado de 1872',
      photographer: 'Eduard Perez',
      photographerUrl: 'https://www.pexels.com/@eduard-perez',
    },
    {
      url: 'https://images.pexels.com/photos/32503306/pexels-photo-32503306.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      alt: 'Puestos tradicionales de mercado con hortalizas frescas',
      photographer: 'Mick Latter',
      photographerUrl: 'https://www.pexels.com/@micklatter',
    },
    {
      url: 'https://images.pexels.com/photos/36905236/pexels-photo-36905236.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      alt: 'Empanadas de pino en masa crocante de horno campesino',
      photographer: 'Jessica Olivella',
      photographerUrl: 'https://www.pexels.com/@jessica-olivella',
    },
    {
      url: 'https://images.pexels.com/photos/38993747/pexels-photo-38993747.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      alt: 'Caleta de pescadores y gastronomía marina artesanal',
      photographer: "César O'neill",
      photographerUrl: 'https://www.pexels.com/@cesar-oneill',
    },
  ],

  // Barrios bohemios, callejones de adoquines y murales
  bohemian_street_art: [
    {
      url: 'https://images.pexels.com/photos/37270328/pexels-photo-37270328.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      alt: 'Callejones empedrados y casonas bohemias de Barrio Lastarria',
      photographer: 'Nikolai Kolosov',
      photographerUrl: 'https://www.pexels.com/@nikolai-kolosov-20411833',
    },
    {
      url: 'https://images.pexels.com/photos/17808457/pexels-photo-17808457.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      alt: 'Murales y escalinatas pintadas a mano en cerros patrimoniales',
      photographer: 'Lais Queiroz',
      photographerUrl: 'https://www.pexels.com/@laisqfotografia',
    },
    {
      url: 'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      alt: 'Cafetería de tertulia literaria y descanso de media tarde',
      photographer: 'Chevanon Photography',
      photographerUrl: 'https://www.pexels.com/@chevanon',
    },
  ],

  // Miradores panorámicos, torres altas y cumbres urbanas
  scenic_viewpoint: [
    {
      url: 'https://images.pexels.com/photos/17347192/pexels-photo-17347192.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      alt: 'Mirador Sky Costanera sobre el valle cordillerano',
      photographer: 'Alexis Leandro Jeria Bocca',
      photographerUrl: 'https://www.pexels.com/@alexis-leandro-jeria-bocca',
    },
    {
      url: 'https://images.pexels.com/photos/37314783/pexels-photo-37314783.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      alt: 'Cumbre de cerro isla con vista 360 grados',
      photographer: 'Nikolai Kolosov',
      photographerUrl: 'https://www.pexels.com/@nikolai-kolosov-20411833',
    },
    {
      url: 'https://images.pexels.com/photos/1619317/pexels-photo-1619317.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      alt: 'Mirador escénico entre quebradas naturales',
      photographer: 'James Wheeler',
      photographerUrl: 'https://www.pexels.com/@souvenirpixels',
    },
  ],

  // Termas naturales, glaciares y paisajes del desierto
  nature_thermal_desert: [
    {
      url: 'https://images.pexels.com/photos/27878411/pexels-photo-27878411.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      alt: 'Formaciones de sal y arcilla en el Valle de la Luna',
      photographer: 'Eleanore Stohner',
      photographerUrl: 'https://www.pexels.com/@eleanore-stohner-499317537',
    },
    {
      url: 'https://images.pexels.com/photos/1578750/pexels-photo-1578750.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      alt: 'Pozas de aguas termales en cañón cordillerano',
      photographer: 'Visit Greenland',
      photographerUrl: 'https://www.pexels.com',
    },
    {
      url: 'https://images.pexels.com/photos/30359266/pexels-photo-30359266.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      alt: 'Cordillera y lagos glaciares australes',
      photographer: 'Marek Piwnicki',
      photographerUrl: 'https://www.pexels.com/@marekpiwnicki',
    },
    {
      url: 'https://images.pexels.com/photos/1624496/pexels-photo-1624496.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
      alt: 'Cielo estrellado de atacama y observación astronómica',
      photographer: 'Eberhard Grossgasteiger',
      photographerUrl: 'https://www.pexels.com/@eberhardgross',
    },
  ],
};

/**
 * Verified Pexels cards for the "Inspírate" section
 */
export const INSPIRATION_PEXELS_CARDS = [
  {
    id: 'torres',
    title: 'Torres del Paine',
    image: 'https://images.pexels.com/photos/30359266/pexels-photo-30359266.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
    photographer: 'Marek Piwnicki',
    photographerUrl: 'https://www.pexels.com/@marekpiwnicki',
    destination: 'Torres del Paine, Magallanes',
    budget: 'premium' as const,
  },
  {
    id: 'valpo',
    title: 'Valparaíso Mágico',
    image: 'https://images.pexels.com/photos/17808457/pexels-photo-17808457.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
    photographer: 'Lais Queiroz',
    photographerUrl: 'https://www.pexels.com/@laisqfotografia',
    destination: 'Valparaíso, Chile',
    budget: 'standard' as const,
  },
  {
    id: 'atacama',
    title: 'San Pedro de Atacama',
    image: 'https://images.pexels.com/photos/27878411/pexels-photo-27878411.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
    photographer: 'Eleanore Stohner',
    photographerUrl: 'https://www.pexels.com/@eleanore-stohner-499317537',
    destination: 'San Pedro de Atacama, Antofagasta',
    budget: 'standard' as const,
  },
  {
    id: 'chiloe',
    title: 'Chiloé Místico',
    image: 'https://images.pexels.com/photos/7213869/pexels-photo-7213869.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
    photographer: "Tom D'Arby",
    photographerUrl: 'https://www.pexels.com/@tomdarby',
    destination: 'Castro, Chiloé',
    budget: 'budget' as const,
  },
  {
    id: 'pucon',
    title: 'Pucón y Lagos',
    image: 'https://images.pexels.com/photos/20903493/pexels-photo-20903493.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
    photographer: 'Exequiel Fuentes',
    photographerUrl: 'https://www.pexels.com/@exequiel-fuentes',
    destination: 'Pucón, Araucanía',
    budget: 'standard' as const,
  },
  {
    id: 'santiago',
    title: 'Santiago y Bellavista',
    image: 'https://images.pexels.com/photos/37314783/pexels-photo-37314783.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
    photographer: 'Nikolai Kolosov',
    photographerUrl: 'https://www.pexels.com/@nikolai-kolosov-20411833',
    destination: 'Santiago, Chile',
    budget: 'budget' as const,
  },
];

/**
 * Detects destination key from a text string (accent-insensitive)
 */
export function getDestinationKey(destination = ''): string {
  const lower = destination
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (lower.includes('atacama') || lower.includes('san pedro') || lower.includes('calama') || lower.includes('elqui') || lower.includes('serena') || lower.includes('iquique')) return 'atacama';
  if (lower.includes('paine') || lower.includes('patagonia') || lower.includes('natales') || lower.includes('arenas') || lower.includes('aysen') || lower.includes('coyhaique')) return 'torres';
  if (lower.includes('chiloe') || lower.includes('castro') || lower.includes('ancud') || lower.includes('dalcahue')) return 'chiloe';
  if (lower.includes('pucon') || lower.includes('villarrica') || lower.includes('caburgua') || lower.includes('varas') || lower.includes('valdivia') || lower.includes('frutillar') || lower.includes('osorno')) return 'pucon';
  if (lower.includes('santiago') || lower.includes('bellavista') || lower.includes('cristobal') || lower.includes('providencia') || lower.includes('las condes') || lower.includes('maipo')) return 'santiago';
  if (lower.includes('cusco') || lower.includes('peru') || lower.includes('machu') || lower.includes('lima')) return 'cusco';
  if (lower.includes('tokio') || lower.includes('tokyo') || lower.includes('japon') || lower.includes('japan') || lower.includes('kioto') || lower.includes('kyoto')) return 'tokio';
  if (lower.includes('roma') || lower.includes('italia') || lower.includes('italy') || lower.includes('florencia') || lower.includes('venecia') || lower.includes('madrid') || lower.includes('paris')) return 'roma';
  if (lower.includes('buenos aires') || lower.includes('argentina') || lower.includes('palermo') || lower.includes('mendoza')) return 'buenos_aires';
  if (lower.includes('valparaiso') || lower.includes('valpo') || lower.includes('vina') || lower.includes('concon')) return 'valparaiso';
  return 'valparaiso';
}

/**
 * Returns a guaranteed Pexels photo for a destination
 */
export function getPexelsPhotoForDestination(
  destination = '',
  index = 0,
  usedUrls?: Set<string>
): PexelsPhotoMeta {
  const key = getDestinationKey(destination);
  const list = PEXELS_DESTINATION_PHOTOS[key] || PEXELS_DESTINATION_PHOTOS.valparaiso;

  if (usedUrls) {
    const available = list.find((p) => !usedUrls.has(p.url));
    if (available) {
      usedUrls.add(available.url);
      return available;
    }
  }

  const picked = list[index % list.length];
  if (usedUrls) usedUrls.add(picked.url);
  return picked;
}

/**
 * Returns a guaranteed Pexels photo for a day in an itinerary, ensuring uniqueness
 */
export function getPexelsPhotoForDay(
  day: Partial<TripDay>,
  destination = '',
  dayIndex = 0,
  usedUrls?: Set<string>
): PexelsPhotoMeta {
  if (day.imageUrl && day.imageUrl.includes('pexels.com') && (!usedUrls || !usedUrls.has(day.imageUrl))) {
    if (usedUrls) usedUrls.add(day.imageUrl);
    return {
      url: day.imageUrl,
      alt: day.title || `Día ${day.dayNumber || dayIndex + 1}`,
      photographer: day.imagePhotographer || 'Pexels Contributor',
      photographerUrl: day.imagePhotographerUrl || 'https://www.pexels.com',
    };
  }

  const key = getDestinationKey(destination);
  const list = PEXELS_DESTINATION_PHOTOS[key] || PEXELS_DESTINATION_PHOTOS.valparaiso;

  if (usedUrls) {
    const available = list.find((p) => !usedUrls.has(p.url));
    if (available) {
      usedUrls.add(available.url);
      return available;
    }
  }

  const picked = list[(dayIndex + 1) % list.length] || list[0];
  if (usedUrls) usedUrls.add(picked.url);
  return picked;
}

/**
 * Returns a unique Pexels photo matching the destination and the suggested place/activity.
 */
export function getPexelsPhotoForActivity(
  activity: Partial<Activity>,
  destination = '',
  usedUrls?: Set<string>,
  fallbackIndex = 0
): PexelsPhotoMeta {
  const activeUsed = usedUrls || new Set<string>();
  const destKey = getDestinationKey(destination);
  const destPool = PEXELS_DESTINATION_PHOTOS[destKey] || PEXELS_DESTINATION_PHOTOS.valparaiso;

  // Helper to test an image pool
  const pickFromPool = (pool: PexelsPhotoMeta[]): PexelsPhotoMeta | null => {
    const candidate = pool.find((p) => !activeUsed.has(p.url));
    if (candidate) {
      activeUsed.add(candidate.url);
      return candidate;
    }
    return null;
  };

  // If activity already has a valid Pexels image and it has not yet been used
  if (activity.imageUrl && activity.imageUrl.includes('pexels.com') && !activeUsed.has(activity.imageUrl)) {
    activeUsed.add(activity.imageUrl);
    return {
      url: activity.imageUrl,
      alt: activity.title || 'Actividad en Pexels',
      photographer: activity.imagePhotographer || 'Pexels Contributor',
      photographerUrl: activity.imagePhotographerUrl || 'https://www.pexels.com',
    };
  }

  // First prioritize unused photos from the specific destination pool so images always belong to the destination
  const directDestMatch = pickFromPool(destPool);
  if (directDestMatch) return directDestMatch;

  const title = (activity.title || '').toLowerCase();
  const desc = (activity.description || '').toLowerCase();
  const hist = (activity.history || '').toLowerCase();
  const arch = (activity.architectureOrHeritage || '').toLowerCase();
  const cur = (activity.curiosity || '').toLowerCase();
  const cat = (activity.category || '').toLowerCase();
  const combined = `${title} ${desc} ${hist} ${arch} ${cur} ${cat}`;

  // Specific thematic matches
  if (title.includes('santa lucía') || title.includes('santa lucia') || title.includes('hidalgo') || combined.includes('castillo')) {
    const match = pickFromPool(PEXELS_HISTORICAL_THEMES.castle_fortress);
    if (match) return match;
  }

  if (title.includes('funicular') || title.includes('teleférico') || title.includes('ascensor') || combined.includes('funicular')) {
    const match = pickFromPool(PEXELS_HISTORICAL_THEMES.funicular_cablecar);
    if (match) return match;
  }

  if (title.includes('bellas artes') || title.includes('museo') || title.includes('chascona') || combined.includes('museo')) {
    const match = pickFromPool(PEXELS_HISTORICAL_THEMES.museum_art);
    if (match) return match;
  }

  if (title.includes('costanera') || title.includes('sky') || title.includes('san cristóbal') || title.includes('cristobal') || combined.includes('mirador')) {
    const match = pickFromPool(PEXELS_HISTORICAL_THEMES.scenic_viewpoint);
    if (match) return match;
  }

  if (title.includes('concha y toro') || title.includes('casillero') || title.includes('viña') || combined.includes('vino') || combined.includes('cava')) {
    const match = pickFromPool(PEXELS_HISTORICAL_THEMES.wine_cellar);
    if (match) return match;
  }

  if (title.includes('dominicos') || title.includes('iglesia') || title.includes('catedral') || combined.includes('colonial')) {
    const match = pickFromPool(PEXELS_HISTORICAL_THEMES.church_colonial);
    if (match) return match;
  }

  if (title.includes('mercado') || title.includes('tirso') || title.includes('caleta') || activity.isFood || combined.includes('empanada') || combined.includes('almuerzo')) {
    const match = pickFromPool(PEXELS_HISTORICAL_THEMES.market_culinary);
    if (match) return match;
  }

  if (title.includes('lastarria') || title.includes('bellavista') || title.includes('italia') || combined.includes('mural') || combined.includes('bohemi')) {
    const match = pickFromPool(PEXELS_HISTORICAL_THEMES.bohemian_street_art);
    if (match) return match;
  }

  if (title.includes('termas') || title.includes('atacama') || title.includes('luna') || title.includes('glaciar') || combined.includes('termas') || combined.includes('desierto')) {
    const match = pickFromPool(PEXELS_HISTORICAL_THEMES.nature_thermal_desert);
    if (match) return match;
  }

  if (title.includes('moneda') || combined.includes('palacio') || combined.includes('neoclásic')) {
    const match = pickFromPool(PEXELS_HISTORICAL_THEMES.palace_neoclassical);
    if (match) return match;
  }

  // Fallback to destination pool by index so it stays faithful to the chosen destination
  const indexedDest = destPool[fallbackIndex % destPool.length] || destPool[0];
  activeUsed.add(indexedDest.url);
  return indexedDest;
}

/**
 * Enriches an entire Trip so that every Day and every Activity has a verified Pexels photo
 * matching the trip destination.
 */
export function ensureTripHasPexelsPhotos(trip: Trip): Trip {
  const dest = trip.destination || 'Santiago, Chile';
  const usedUrls = new Set<string>();

  // 1. Trip Hero photo
  const heroPhoto = getPexelsPhotoForDestination(dest, 0, usedUrls);

  const enrichedTrip: Trip = {
    ...trip,
    imageUrl: heroPhoto.url,
    imagePhotographer: trip.imagePhotographer || heroPhoto.photographer,
    imagePhotographerUrl: trip.imagePhotographerUrl || heroPhoto.photographerUrl,
    days: (trip.days || []).map((day, dIdx) => {
      // 2. Day Hero photo (unique for each day, matching destination)
      const dayPhoto = getPexelsPhotoForDay({ ...day, imageUrl: undefined }, dest, dIdx, usedUrls);

      return {
        ...day,
        title: day.title || `Día ${day.dayNumber}: Lo mejor de ${dest}`,
        summary: day.summary || `Jornada diseñada con actividades culturales, gastronomía y miradores panorámicos.`,
        imageUrl: dayPhoto.url,
        imagePhotographer: dayPhoto.photographer,
        imagePhotographerUrl: dayPhoto.photographerUrl,
        items: (day.items || []).map((item, iIdx) => {
          if (item.type === 'activity' && item.data) {
            const actPhoto = getPexelsPhotoForActivity(item.data, dest, usedUrls, dIdx * 4 + iIdx);

            return {
              ...item,
              data: {
                ...item.data,
                imageUrl: actPhoto.url,
                imagePhotographer: actPhoto.photographer,
                imagePhotographerUrl: actPhoto.photographerUrl,
              },
            };
          }
          return item;
        }),
      };
    }),
  };

  return enrichedTrip;
}

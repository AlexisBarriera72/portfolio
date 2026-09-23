import type { UIStrings } from './types';

export const es: UIStrings = {
  htmlLang: 'es-PR',
  siteName: 'Alexis · Páginas web en Ponce, PR',
  metaDescription:
    'Páginas web para negocios pequeños en Ponce y el sur de Puerto Rico. Precios claros, hecha para el teléfono, y alguien de aquí que te contesta.',

  tabs: {
    'para-ti': 'Para ti',
    local: 'Local',
    precios: 'Precios',
    'sobre-mi': 'Sobre mí',
    contacto: 'Contacto',
  },
  tabsLabel: 'Filtrar el contenido',

  nav: {
    feedLabel: 'Trabajos y servicios',
    next: 'Siguiente',
    previous: 'Anterior',
    backToTop: 'Volver al principio',
    position: 'Tarjeta {index} de {total}',
    skipToContent: 'Ir al contenido',
    swipeHint: 'Desliza hacia arriba',
  },

  language: {
    label: 'Cambiar idioma',
    switchTo: 'English',
  },

  project: {
    before: 'Antes',
    after: 'Después',
    comparisonLabel: (client) => `El sitio de ${client}, antes y después`,
    outcomesHeading: 'Qué cambió',
    demoHeading: 'Pruébalo en distintos tamaños',
    deviceGroupLabel: 'Tamaño de pantalla',
    devices: {
      phone: 'Teléfono',
      tablet: 'Tableta',
      desktop: 'Computadora',
    },
    visitSite: (client) => `Ver el sitio de ${client}`,
    visitSiteShort: 'Ver el sitio',
    opensInNewTab: 'se abre en una pestaña nueva',
    recordedDemoNote: 'Video del sitio real',
    clientIn: (city) => `Cliente en ${city}`,
    openDemo: 'Pruébalo',
    watchDemo: 'Míralo funcionar',
    openDemoLabel: (client) => `Probar el sitio de ${client} en teléfono, tableta y computadora`,
    viewSizes: 'Ver tamaños',
    viewSizesLabel: (client) => `Ver el sitio de ${client} en teléfono, tableta y computadora`,
    screenshotsNote: 'Capturas del sitio real en cada tamaño',
    closeDemo: 'Cerrar',
    compareHint: 'Desliza para comparar',
  },

  pricing: {
    from: 'desde',
    billing: {
      once: 'una vez',
      monthly: 'al mes',
      yearly: 'al año',
    },
    includesHeading: 'Incluye',
    mostChosen: 'El más pedido',
    afterFirstYear: 'Después del primer año',
  },

  contact: {
    orByEmail: 'O escríbeme por correo',
    formHeading: 'Mándame un mensaje',
    emailInstead: 'Abrir mi correo',
    required: 'obligatorio',
    whatsappButton: 'Escríbeme por WhatsApp',
  },

  video: {
    play: 'Reproducir el video',
    pause: 'Pausar el video',
    transcriptShow: 'Leer lo que dice el video',
    captions: 'Subtítulos',
    captionsLanguage: 'Español',
    soundOn: 'Activar el sonido',
    soundOff: 'Quitar el sonido',
  },

  end: {
    startOver: 'Ver otra vez desde el principio',
  },

  notFound: {
    title: 'Esta página no existe',
    body: 'Puede que el enlace esté mal escrito o que esa página ya no esté.',
    home: 'Ir al inicio',
  },
};

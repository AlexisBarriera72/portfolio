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
    position: (index, total) => `Tarjeta ${index} de ${total}`,
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
    outcomesHeading: 'Qué cambió para el negocio',
    demoHeading: 'Pruébalo en distintos tamaños',
    deviceGroupLabel: 'Tamaño de pantalla',
    devices: {
      phone: 'Teléfono',
      tablet: 'Tableta',
      desktop: 'Computadora',
    },
    visitSite: (client) => `Ver el sitio de ${client}`,
    opensInNewTab: 'se abre en una pestaña nueva',
    recordedDemoNote: 'Video del sitio real',
    clientIn: (city) => `Cliente en ${city}`,
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
  },

  contact: {
    orByEmail: 'O escríbeme por correo',
    formHeading: 'Mándame un mensaje',
    emailInstead: 'Abrir mi correo',
    required: 'obligatorio',
  },

  video: {
    play: 'Reproducir el video',
    pause: 'Pausar el video',
    transcriptHeading: 'Lo que dice el video',
  },

  end: {
    startOver: 'Ver otra vez desde el principio',
  },
};

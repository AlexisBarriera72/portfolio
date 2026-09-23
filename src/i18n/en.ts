import type { UIStrings } from './types';

export const en: UIStrings = {
  htmlLang: 'en',
  siteName: 'Alexis · Websites in Ponce, PR',
  metaDescription:
    'Websites for small businesses in Ponce and southern Puerto Rico. Clear prices, built for the phone, and someone local who actually answers.',

  // Only the labels are translated. The keys — and so the ?tab= values in the
  // URL — stay Spanish in both languages, so a shared link works in either.
  tabs: {
    'para-ti': 'For you',
    local: 'Local',
    precios: 'Pricing',
    'sobre-mi': 'About',
    contacto: 'Contact',
  },
  tabsLabel: 'Filter the feed',

  nav: {
    feedLabel: 'Work and services',
    next: 'Next',
    previous: 'Previous',
    backToTop: 'Back to the top',
    position: 'Card {index} of {total}',
    skipToContent: 'Skip to content',
    swipeHint: 'Swipe up',
  },

  language: {
    label: 'Change language',
    switchTo: 'Español',
  },

  project: {
    before: 'Before',
    after: 'After',
    comparisonLabel: (client) => `${client}’s website, before and after`,
    outcomesHeading: 'What changed for the business',
    demoHeading: 'Try it at different sizes',
    deviceGroupLabel: 'Screen size',
    devices: {
      phone: 'Phone',
      tablet: 'Tablet',
      desktop: 'Desktop',
    },
    visitSite: (client) => `Visit ${client}’s website`,
    visitSiteShort: 'Visit the site',
    opensInNewTab: 'opens in a new tab',
    recordedDemoNote: 'Recording of the real site',
    clientIn: (city) => `Client in ${city}`,
    openDemo: 'Try it',
    watchDemo: 'Watch it work',
    openDemoLabel: (client) => `Try ${client}’s site on a phone, tablet and computer`,
    viewSizes: 'See each size',
    viewSizesLabel: (client) => `See ${client}’s site on a phone, tablet and computer`,
    screenshotsNote: 'Screenshots of the real site at each size',
    closeDemo: 'Close',
    compareHint: 'Slide to compare',
  },

  pricing: {
    from: 'from',
    billing: {
      once: 'one time',
      monthly: 'per month',
      yearly: 'per year',
    },
    includesHeading: 'Includes',
    mostChosen: 'Most chosen',
    afterFirstYear: 'After the first year',
  },

  contact: {
    orByEmail: 'Or send me an email',
    formHeading: 'Send me a message',
    emailInstead: 'Open my email',
    required: 'required',
    whatsappButton: 'Message me on WhatsApp',
  },

  video: {
    play: 'Play the video',
    pause: 'Pause the video',
    transcriptHeading: 'What the video says',
    soundOn: 'Turn the sound on',
    soundOff: 'Turn the sound off',
  },

  end: {
    startOver: 'Watch again from the start',
  },

  notFound: {
    title: 'This page does not exist',
    body: 'The link may be mistyped, or that page is no longer here.',
    home: 'Go to the start',
  },
};

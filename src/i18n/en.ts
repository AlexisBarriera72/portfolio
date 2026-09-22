import type { UIStrings } from './types';

export const en: UIStrings = {
  htmlLang: 'en',
  siteName: 'Alexis · Websites in Ponce, PR',
  metaDescription:
    'Websites for small businesses in Ponce and southern Puerto Rico. Clear prices, built for the phone, and someone local who actually answers.',

  // The tab labels stay in Spanish on purpose — they are the section names the
  // site is known by. TODO(alexis): translate them if you'd rather.
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
    position: (index, total) => `Card ${index} of ${total}`,
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
    opensInNewTab: 'opens in a new tab',
    recordedDemoNote: 'Recording of the real site',
    clientIn: (city) => `Client in ${city}`,
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
  },

  contact: {
    orByEmail: 'Or send me an email',
    formHeading: 'Send me a message',
    emailInstead: 'Open my email',
    required: 'required',
  },

  video: {
    play: 'Play the video',
    pause: 'Pause the video',
    transcriptHeading: 'What the video says',
  },

  end: {
    startOver: 'Watch again from the start',
  },
};

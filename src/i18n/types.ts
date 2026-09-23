import type { DeviceId, FeedTab, Tier } from '../data/types';

/**
 * Every string that is part of the interface rather than the content.
 *
 * Content lives in src/data/ because it changes per card. These change per
 * locale only. Declaring the shape here means src/i18n/en.ts will not compile
 * if it is missing a key that src/i18n/es.ts has.
 *
 * Interpolated strings come in two forms, and the choice depends on where
 * they are filled in:
 *  - Functions, for text rendered at build time. The two locales can put the
 *    values in different places, and TypeScript checks the arguments.
 *  - "{placeholder}" templates, for text the browser fills in at runtime (the
 *    card position depends on which tab is open). Functions cannot be sent to
 *    the client; templates are plain strings, filled with format() from
 *    ./format.ts.
 */
export interface UIStrings {
  /** <html lang="…"> and the hreflang attribute. */
  htmlLang: string;
  /** Shown in <title> after the card heading. */
  siteName: string;
  metaDescription: string;

  tabs: Record<FeedTab, string>;
  /** Accessible name for the tablist itself. */
  tabsLabel: string;

  nav: {
    /** Accessible name for the <ul> that is the feed. */
    feedLabel: string;
    next: string;
    previous: string;
    backToTop: string;
    /**
     * Template: "{index}" and "{total}". "Tarjeta 3 de 9" — read out after
     * keyboard or button navigation. Filled in the browser, since the total
     * depends on the open tab.
     */
    position: string;
    skipToContent: string;
    /** Hint on the first card only. */
    swipeHint: string;
  };

  language: {
    /** Accessible name for the toggle. */
    label: string;
    /** Name of the OTHER language, as written in that language. */
    switchTo: string;
  };

  project: {
    before: string;
    after: string;
    /** Accessible name for the before/after pair. */
    comparisonLabel: (client: string) => string;
    outcomesHeading: string;
    demoHeading: string;
    /** Accessible name for the phone/tablet/desktop button group. */
    deviceGroupLabel: string;
    devices: Record<DeviceId, string>;
    /** "Ver el sitio de El Break" — the single outbound link's accessible name. */
    visitSite: (client: string) => string;
    /** Its visible text: short, so it fits beside the demo button. */
    visitSiteShort: string;
    /** Appended to external links for screen readers. */
    opensInNewTab: string;
    /** Shown over a recorded demo when the site cannot be embedded. */
    recordedDemoNote: string;
    /** Button that opens the device demo (live site). */
    openDemo: string;
    /** Button that opens the device demo when it is a recording. */
    watchDemo: string;
    /** Accessible name for the open-demo button: says whose site. */
    openDemoLabel: (client: string) => string;
    /** Button that opens the screenshots demo (a site that can't be framed). */
    viewSizes: string;
    viewSizesLabel: (client: string) => string;
    /** Above the screenshots in that demo. */
    screenshotsNote: string;
    /** Name of the live/screenshots switch group in a live demo. */
    viewGroupLabel: string;
    viewLive: string;
    viewShots: string;
    /** Shown next to the switch: the way out when the frame stays blank. */
    liveFallbackHint: string;
    closeDemo: string;
    /** Under the before/after box, for people who don't know it moves. */
    compareHint: string;
  };

  pricing: {
    /** "desde" — precedes the number. */
    from: string;
    billing: Record<Tier['billing'], string>;
    includesHeading: string;
    /** Marks the featured tier. */
    mostChosen: string;
    /** Heading over the year-two cost line. */
    afterFirstYear: string;
    /** The button that opens a plan's full list in a panel. */
    seeIncludes: string;
    close: string;
  };

  contact: {
    orByEmail: string;
    formHeading: string;
    /** Used when no form endpoint is configured. */
    emailInstead: string;
    required: string;
    /** Accessible name of the floating WhatsApp button. */
    whatsappButton: string;
  };

  video: {
    /** Accessible name for the play/pause control. */
    play: string;
    pause: string;
    /** Shown when the video file fails to load or play. */
    unavailable: string;
    retry: string;
    /** Opens the transcript under a spoken clip. */
    transcriptShow: string;
    /** Accessible name of the CC (captions on/off) button. */
    captions: string;
    /** The caption track's label: this page's language, in that language. */
    captionsLanguage: string;
    soundOn: string;
    soundOff: string;
  };

  end: {
    startOver: string;
  };

  notFound: {
    title: string;
    body: string;
    home: string;
  };
}

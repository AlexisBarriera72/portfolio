import type { DeviceId, FeedTab, Tier } from '../content/types';

/**
 * Every string that is part of the interface rather than the content.
 *
 * Content lives in src/content/ because it changes per card. These change per
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
    /** "Ver el sitio de El Break" — the single outbound link. */
    visitSite: (client: string) => string;
    /** Appended to external links for screen readers. */
    opensInNewTab: string;
    /** Shown over a recorded demo when the site cannot be embedded. */
    recordedDemoNote: string;
    clientIn: (city: string) => string;
  };

  pricing: {
    /** "desde" — precedes the number. */
    from: string;
    billing: Record<Tier['billing'], string>;
    includesHeading: string;
    /** Marks the featured tier. */
    mostChosen: string;
  };

  contact: {
    orByEmail: string;
    formHeading: string;
    /** Used when no form endpoint is configured. */
    emailInstead: string;
    required: string;
  };

  video: {
    /** Accessible name for the play/pause control. */
    play: string;
    pause: string;
    /** Heading for the visually-hidden transcript. */
    transcriptHeading: string;
  };

  end: {
    startOver: string;
  };
}

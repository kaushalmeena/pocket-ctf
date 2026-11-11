/**
 * Search-engine metadata.
 *
 * This project has a conflict to manage rather than a preference to express.
 * Being findable matters for the front page, and being *unfindable* matters
 * for everything else: the unlisted pages are puzzles, and an indexed puzzle is
 * a search result that says where it was hidden.
 *
 * So indexing is opt-in per route. Only the front page is indexable;
 * everything else is explicitly excluded, and robots.txt says the same thing
 * at the crawler level.
 */

/**
 * Absolute origin, needed for canonical URLs and social card images.
 *
 * Fixed at build time (vite.config.ts): `POCKET_CTF_URL`, or on Vercel its own
 * production or preview URL. Anywhere else, with neither, it defaults to
 * localhost, and the canonical tags, the sitemap and security.txt point at a
 * machine nobody else can reach.
 */
export const SITE_URL = (import.meta.env.POCKET_CTF_URL || "http://localhost:3000").replace(
  /\/$/,
  "",
);

export const SITE_NAME = "Pocket CTF";

export const SITE_TAGLINE =
  "A capture-the-flag hunt with no map: the flags are hidden in the site itself.";

export const SITE_DESCRIPTION =
  "A free, open-source capture-the-flag hunt. There is no list of challenges — the " +
  "flags are hidden in the pages, the headers, the cookies and the corners of the site " +
  "itself. Find one, submit it, collect the trophy.";

/**
 * `noindex, nofollow` — for anything whose content is a spoiler.
 *
 * Belt and braces: nothing indexable links to an unlisted page, but a crawler
 * can still arrive at one from somebody's blog post about where they found a
 * flag.
 */
export const NO_INDEX = { name: "robots", content: "noindex, nofollow" } as const;

type PageSeo = {
  /** Appended to the site name, e.g. "Challenges" -> "Challenges | Pocket CTF". */
  title: string;
  description: string;
  /** Path with a leading slash. */
  path: string;
  /** Social card image, relative to the site root. */
  image?: string;
};

/**
 * Full head payload for an indexable page: title, description, canonical, Open
 * Graph and Twitter card. Pages that shouldn't be indexed use {@link NO_INDEX}
 * instead and skip all of this.
 */
export function pageSeo({ title, description, path, image = "/og.png" }: PageSeo) {
  const url = `${SITE_URL}${path}`;
  const fullTitle = path === "/" ? `${SITE_NAME} — ${title}` : `${title} | ${SITE_NAME}`;
  const imageUrl = `${SITE_URL}${image}`;

  return {
    meta: [
      { title: fullTitle },
      { name: "description", content: description },

      { property: "og:type", content: "website" },
      { property: "og:site_name", content: SITE_NAME },
      { property: "og:title", content: fullTitle },
      { property: "og:description", content: description },
      { property: "og:url", content: url },
      { property: "og:image", content: imageUrl },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: `${SITE_NAME} logo` },

      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: fullTitle },
      { name: "twitter:description", content: description },
      { name: "twitter:image", content: imageUrl },
    ],
    links: [{ rel: "canonical", href: url }],
  };
}

/**
 * Structured data for the landing page.
 *
 * Declared as a plain object and serialised at render time so it cannot drift
 * from the copy above. `WebSite` earns the site-name treatment in results;
 * `SoftwareApplication` with a zero-cost offer is the honest description of
 * what this is, and is what makes "free" render in a rich result.
 */
export function structuredData() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE_NAME,
        description: SITE_DESCRIPTION,
        inLanguage: "en",
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${SITE_URL}/#app`,
        name: SITE_NAME,
        applicationCategory: "EducationalApplication",
        applicationSubCategory: "Capture the flag",
        operatingSystem: "Any browser",
        url: SITE_URL,
        description: SITE_DESCRIPTION,
        isAccessibleForFree: true,
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        license: "https://opensource.org/licenses/MIT",
      },
    ],
  };
}

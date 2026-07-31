/**
 * Search-engine metadata.
 *
 * This project has a conflict to manage rather than a preference to express.
 * Being findable matters for the landing page, and being *unfindable* matters
 * for the challenges: an indexed challenge page puts its payload -- the
 * zero-width poem, the XOR ciphertext, the prime product -- into a search
 * cache, and an indexed writeup hands over the answer to anyone who types the
 * right query.
 *
 * So indexing is opt-in per route. Only the two pages that describe the project
 * are indexable; everything else is explicitly excluded, and robots.txt says
 * the same thing at the crawler level.
 */

import { CHALLENGES } from "./challenges";

/**
 * Absolute origin, needed for canonical URLs and social card images.
 *
 * Defaults to localhost because there is no host to assume -- the build output
 * is a folder of static files that can be served from anywhere. Set
 * `VITE_SITE_URL` for any public deployment, or the canonical tags and the
 * sitemap will point at a machine nobody else can reach. `pnpm gen` warns when
 * it is unset.
 */
export const SITE_URL = (import.meta.env.VITE_SITE_URL ?? "http://localhost:3000").replace(
  /\/$/,
  "",
);

export const SITE_NAME = "Pocket CTF";

/**
 * Counted rather than written out, because this copy is the sort that quietly
 * goes stale: it is search-engine metadata, so nothing on screen contradicts it
 * when the number changes.
 */
const COUNT = CHALLENGES.length;

export const SITE_TAGLINE = `${COUNT} offline capture-the-flag puzzles that run entirely in your browser.`;

export const SITE_DESCRIPTION =
  `A free, open-source capture-the-flag playground with ${COUNT} browser-based ` +
  "security puzzles covering steganography, ciphers, recon, reversing, forensics " +
  "and web devtools. No server, no accounts, no installation — and no plaintext " +
  "flags anywhere in the source.";

/**
 * `noindex, nofollow` — for anything whose content is a spoiler.
 *
 * `nofollow` matters as much as `noindex` here: every challenge page is linked
 * from the indexable challenge index, and a crawler that follows those links
 * would queue them for indexing even while honouring `noindex` on the page it
 * came from.
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
export function structuredData(faq: { q: string; a: string }[]) {
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
      {
        "@type": "FAQPage",
        "@id": `${SITE_URL}/#faq`,
        mainEntity: faq.map(({ q, a }) => ({
          "@type": "Question",
          name: q,
          acceptedAnswer: { "@type": "Answer", text: a },
        })),
      },
    ],
  };
}

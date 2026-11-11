import { createFileRoute } from "@tanstack/solid-router";

import { printStylesheet } from "~/server/plants";

const PREAMBLE = `/*
 * print.css
 *
 * For paper. Every page carries an empty row for these rules to fill, and a
 * screen never shows it. Do not reorder; the order is the point.
 */

@media print {
  .print-only {
    display: flex !important;
    flex-wrap: wrap;
    gap: 0;
    margin: 0 0 1rem;
    padding: 0.5rem 0.75rem;
    border: 1px dashed #888;
    font: 600 12pt/1.4 ui-monospace, monospace;
    color: #000;
  }
  /* The characters themselves are the flex items, so their order counts. */
  .print-only > span {
    display: contents;
  }
  .print-only::before {
    content: "printed copy, ref: ";
    order: -1;
    font-weight: 400;
    white-space: pre;
  }
}

`;

/** Linked from every page with media="print": downloaded always, applied on paper. */
export const Route = createFileRoute("/print.css")({
  server: {
    handlers: {
      GET: async () =>
        new Response(`${PREAMBLE}${await printStylesheet()}\n`, {
          headers: {
            "Content-Type": "text/css; charset=utf-8",
            "Cache-Control": "private, max-age=3600",
          },
        }),
    },
  },
});

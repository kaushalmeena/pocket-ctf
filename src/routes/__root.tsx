import { createRootRoute, HeadContent, Scripts } from "@tanstack/solid-router";
import type { JSX } from "solid-js";
import { Suspense } from "solid-js";
import { HydrationScript } from "solid-js/web";
import { SiteFooter } from "~/components/SiteFooter";
import { SiteHeader } from "~/components/SiteHeader";
import { ProgressProvider } from "~/lib/store";
import { THEME_BOOTSTRAP, ThemeProvider } from "~/lib/theme";
import appCss from "../app.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Pocket CTF" },
      {
        name: "description",
        content:
          "Eleven offline capture-the-flag puzzles that run entirely in your browser. No server, no accounts, no plaintext flags.",
      },
      { name: "robots", content: "noindex" },
      { name: "theme-color", content: "#10b981" },
      { name: "apple-mobile-web-app-title", content: "Pocket CTF" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      // SVG first for browsers that take it; the PNGs are the fallback chain.
      // All of it comes from `pnpm icons` -- see scripts/icon.mjs.
      { rel: "icon", href: "/icon.svg", type: "image/svg+xml" },
      { rel: "icon", href: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { rel: "icon", href: "/favicon-16.png", sizes: "16x16", type: "image/png" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png", sizes: "180x180" },
      { rel: "manifest", href: "/site.webmanifest" },
    ],
  }),
  shellComponent: RootDocument,
});

function RootDocument(props: { children: JSX.Element }) {
  return (
    <html lang="en">
      <head>
        {/* Sets the theme class before first paint. Without it, dark-mode
            users get a white flash on every navigation. */}
        <script innerHTML={THEME_BOOTSTRAP} />
        <HydrationScript />
      </head>
      <body>
        <HeadContent />
        <ThemeProvider>
          <ProgressProvider>
            <div class="flex min-h-dvh flex-col">
              <SiteHeader />
              <main class="mx-auto w-full max-w-3xl flex-1 px-5 py-10 sm:px-6">
                <Suspense>{props.children}</Suspense>
              </main>
              <SiteFooter />
            </div>
          </ProgressProvider>
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  );
}

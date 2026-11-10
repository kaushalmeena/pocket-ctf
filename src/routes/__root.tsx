import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/solid-router";
import type { JSX } from "solid-js";
import { Show, Suspense } from "solid-js";
import { HydrationScript } from "solid-js/web";

import { NotFound } from "~/components/NotFound";
import { Secrets } from "~/components/Secrets";
import { SiteFooter } from "~/components/SiteFooter";
import { SiteHeader } from "~/components/SiteHeader";
import { TrophyToasts } from "~/components/TrophyToasts";
import { getShell } from "~/lib/api";
import { GameProvider } from "~/lib/game";
import { SITE_TAGLINE } from "~/lib/seo";
import { THEME_BOOTSTRAP, ThemeProvider } from "~/lib/theme";

import appCss from "../app.css?url";

/*
 * The first thing in the document, for whoever reads the source before the
 * page. The flag in it is a decoy; submitting it is its own reward.
 */
const SOURCE_NOTE = `<!--

  Hello, source reader. You are the intended audience.

  TODO before launch: remove the test flag  pctf{grep_is_not_a_solution}

-->`;

export const Route = createRootRoute({
  loader: () => getShell(),
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Pocket CTF" },
      { name: "description", content: SITE_TAGLINE },
      // Deliberately no blanket `noindex` here. Indexing is decided per route
      // (see src/lib/seo.ts): the front page opts in, everything else opts out.
      { name: "og:locale", content: "en" },
      { name: "theme-color", content: "#10b981" },
      { name: "apple-mobile-web-app-title", content: "Pocket CTF" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      // Loaded by every page and used by none of them.
      { rel: "stylesheet", href: "/ghost.css" },
      { rel: "icon", href: "/icon.svg", type: "image/svg+xml" },
      { rel: "icon", href: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { rel: "icon", href: "/favicon-16.png", sizes: "16x16", type: "image/png" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png", sizes: "180x180" },
      { rel: "manifest", href: "/site.webmanifest" },
    ],
  }),
  /*
   * Declared here rather than as the router's `defaultNotFoundComponent`.
   * Router-level means the root route never matches, so its `head` -- including
   * the stylesheet link -- is dropped on hydration and the shell is handed the
   * notFound payload instead of an element.
   */
  notFoundComponent: NotFound,
  shellComponent: RootDocument,
  component: RootLayout,
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
        <div hidden innerHTML={SOURCE_NOTE} />
        <HeadContent />
        <ThemeProvider>{props.children}</ThemeProvider>
        <Scripts />
      </body>
    </html>
  );
}

function RootLayout() {
  const shell = Route.useLoaderData();
  const me = () => shell().me;

  return (
    <GameProvider initial={me} github={() => shell().github}>
      <div class="flex min-h-dvh flex-col">
        <Show when={shell().sample}>
          <p class="bg-amber-100 px-5 py-1.5 text-center text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-200">
            Demo data: this instance runs on the public sample key, so its flags are no secret.
          </p>
        </Show>
        <SiteHeader />
        <main class="mx-auto w-full max-w-4xl flex-1 px-5 py-10 sm:px-6">
          <Suspense>
            <Outlet />
          </Suspense>
        </main>
        <SiteFooter />
      </div>
      <TrophyToasts />
      <Secrets drawer={shell().drawer} />
    </GameProvider>
  );
}

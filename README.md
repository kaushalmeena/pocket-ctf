<div align="center">

<img src="public/icon.svg" alt="Pocket CTF logo" width="96" height="96" />

# Pocket CTF

[![License: MIT](https://img.shields.io/badge/License-MIT-3DA639?logo=opensourceinitiative&logoColor=white)](LICENSE) [![Solid](https://img.shields.io/badge/Solid-1.9-2C4F7C?logo=solid&logoColor=white)](https://www.solidjs.com) [![TanStack Start](https://img.shields.io/badge/TanStack_Start-1.x-C2255C?logo=react&logoColor=white)](https://tanstack.com/start) [![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-0B7285?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)

**Twelve security puzzles, one browser, and not a single flag in the source.**

A free, open-source capture-the-flag playground that runs entirely on your
machine — no server, no accounts, no network. Every flag is stored as a **salted
PBKDF2 hash** and every puzzle's content is derived from its flag at build time,
so the answers genuinely are not in the bundle you downloaded.

[**Try it live**](https://pocket-ctf.vercel.app)

</div>

---

## Features

- **Twelve hand-built challenges** — steganography, layered encodings, Morse
  audio, prime factorisation, repeating-key XOR, an LFSR stream cipher, a
  bytecode VM, CSS, SVG, IndexedDB forensics and browser devtools.
- **No plaintext flags** — each one exists only as a salted hash; the zero-width
  poem, stego PNG, prime product and XOR ciphertext are all computed *from* the
  flag, so there is nowhere for an answer to sit.
- **Tamper-proof progress** — a solve stores a proof-of-solve token, not a
  boolean. Editing localStorage gets you nothing, and the site tells you what it
  discarded.
- **Encrypted writeups** — solving decrypts an explanation of the technique and
  why it works. Before that, the plaintext is not in the bundle at all.
- **Unguessable, per-deployment flags** — a random suffix per challenge means no
  two installations share an answer, so answers copied from elsewhere fail.
- **Runs completely offline** — a folder of static HTML you can host anywhere or
  open from a USB stick. Nothing you type leaves the machine.
- **Plug-and-play challenges** — one directory per puzzle holding its metadata,
  builder, reference solver and page. Adding one means adding a folder; removing
  one means deleting it. Nothing else has a list to keep in sync.
- **Hints, points, timers and badges** — three progressive hints per challenge at
  a cost, ten badges, and a per-challenge timer.
- **Light and dark themes** — follows your system preference until you say
  otherwise, with no flash of the wrong theme on load.

## How It Works

1. **Author** — you write base flags into a gitignored `flags.secret.json`.
2. **Generate** — `pnpm gen` derives, per flag, a salted PBKDF2 verification
   hash, a proof-of-solve token digest, an AES-GCM key that encrypts the writeup,
   a random per-deployment suffix, and the puzzle payload itself.
3. **Solve** — players work the puzzle with devtools, a console one-liner, pen
   and paper, or their ears. There is no intended tool, only an intended insight.
4. **Verify** — a submission is hashed and compared. A correct answer stores a
   token that proves the solve without ever recording the flag.

> Everything runs in your browser. There is no server to ask for help, no account
> to create, and nothing to upload — which is also why the anti-cheat design is
> honest about what it cannot prevent.

## Tech Stack

| Area          | Tools                                                                                     |
| ------------- | ----------------------------------------------------------------------------------------- |
| **Framework** | [Solid](https://www.solidjs.com) · [TanStack Start](https://tanstack.com/start)           |
| **Styling**   | [Tailwind CSS v4](https://tailwindcss.com) · [Lucide](https://lucide.dev)                 |
| **Crypto**    | [Web Crypto](https://developer.mozilla.org/docs/Web/API/Web_Crypto_API) (PBKDF2, AES-GCM) |
| **Build**     | [Vite](https://vite.dev) · [TypeScript](https://www.typescriptlang.org)                   |
| **Testing**   | [Vitest](https://vitest.dev)                                                              |
| **Tooling**   | [Biome](https://biomejs.dev) · [pnpm](https://pnpm.io)                                    |
| **Hosting**   | Any static host — the build is a folder of files                                          |

## Getting Started

These instructions will get you a copy of the project up and running on your
local machine for development purposes.

### Requirements

To install and run this project you need:

- [Node.js](https://nodejs.org/) 20 or newer
- [pnpm](https://pnpm.io/installation)
- [git](https://git-scm.com/downloads) (only to clone this repository)

### Installation

To set up everything on your local machine, follow these steps:

1. Clone this repo and then change directory to the `pocket-ctf` folder:

```bash
git clone https://github.com/kaushalmeena/pocket-ctf.git
cd pocket-ctf
```

2. Install project dependencies using pnpm:

```bash
pnpm install
```

Installing also seeds the challenge data. A fresh clone plays the **demo** set,
whose flags are public in `flags.sample.json` and which the app labels with a
banner. To create a real instance with unguessable flags, write your own answer
key and generate from it:

```bash
cp flags.sample.json flags.secret.json
# then replace every phrase -- the demo ones are published
pnpm gen
```

Your resolved flags are written to `ANSWERS.secret.md`, which is gitignored — it
is the only readable copy, so keep a backup outside the repository.

### Running

To run the project simply run:

```bash
pnpm dev
```

Your app should now be running on [localhost:3000](http://localhost:3000/).

### Testing

The suite runs under [Vitest](https://vitest.dev). The tests that matter drive
each challenge's own reference solver against the payload that actually shipped,
so a puzzle that cannot be solved fails the build:

```bash
pnpm test
```

To lint, typecheck, scan for leaked flags and run the suite together:

```bash
pnpm check
```

`pnpm check` runs against whatever challenge data is live, which on a fresh clone
is the committed demo set. Once you have generated your own flags, verify *that*
deployment — every challenge solved from its shipped payload, and every answer
put through the same check the browser performs:

```bash
pnpm self-test
```

It refuses to run on the demo set, so a green result is always about your flags.

### Building

To create a production build:

```bash
pnpm build
```

The build output is written to the `dist/client` folder — static HTML that any
file server can host. Preview it locally with `pnpm preview`, and re-run the leak
scan against the real artifact with `pnpm build && pnpm verify:flags`.

## Deployment

Every route is prerendered, so there is no server runtime to deploy. `pnpm build`
writes `dist/client`, a plain folder of static files that any host will serve —
point it at that directory, enable clean URLs, and you are done. `vercel.json` is
a worked example of those settings for one host; delete it if you deploy
elsewhere.

A hosted build clones the repository, so the gitignored answer key is absent and
the deploy would ship the demo set. Run `pnpm gen:env --url=https://your-origin` to write
those secrets to a gitignored `.env`, hand them to your host, and
`scripts/bootstrap.mjs` will generate this deployment's own data during
`prebuild`. Full details, including why both secret variables are
required and what settings a host needs, are in
[docs/deployment.md](docs/deployment.md).

## Configuration

| Variable           | Default                 | Notes                                                                                                                                                |
| ------------------ | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POCKET_CTF_FLAGS` | `—`                     | The whole of `flags.secret.json`, for hosted builds. Without it a deploy ships the public demo set.                                                  |
| `POCKET_CTF_SEEDS` | `—`                     | The whole of `seeds.secret.json`. **Required** alongside the above, or every deploy changes your flags.                                              |
| `VITE_SITE_URL`    | `http://localhost:3000` | Your public origin, used for canonical URLs, the sitemap and social cards. **Set this for any public deploy** — `pnpm gen` warns when it is missing. |

## Documentation

Full documentation is available in the [`/docs`](./docs) directory.

**Core Concepts:**

- [Build Pipeline](./docs/build-pipeline.md) — how `flags.secret.json` becomes hashes, ciphertext and puzzle data, and how regenerating avoids wiping progress.
- [Challenges](./docs/challenges.md) — the one-directory-per-challenge layout, and what it takes to add or remove one.
- [Anti-Cheat](./docs/anti-cheat.md) — all nine measures with the limit each runs into, plus what none of them stop.

**Design System:**

- [Foundations](./docs/foundations.md) — the principles, the single-accent colour rule, and why the theme switch is CSS-driven.
- [Motion](./docs/motion.md) — what animates, what deliberately does not, and the icon set.
- [Components](./docs/components.md) — the recurring patterns, the accessibility rules they follow, and the voice of the copy.

**Advanced:**

- [Deployment and Indexing](./docs/deployment.md) — Vercel, the environment variables that let a hosted build generate real flags, and the per-route indexing policy.

## Contributing

Contributions are welcome! If you find a bug or have a feature request, please
[open an issue](https://github.com/kaushalmeena/pocket-ctf/issues/new/choose)
first to discuss it. For code changes, fork the repository, create a branch, and
open a pull request. Please do not paste flags or full solutions into issues or
pull requests.

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file
for details.

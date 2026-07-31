<div align="center">

<img src="public/icon.svg" alt="Pocket CTF logo" width="96" height="96" />

# Pocket CTF

[![License: MIT](https://img.shields.io/badge/License-MIT-3DA639?logo=opensourceinitiative&logoColor=white)](LICENSE) [![CI](https://img.shields.io/github/actions/workflow/status/kaushalmeena/pocket-ctf/ci.yml?logo=githubactions&logoColor=white&label=CI)](https://github.com/kaushalmeena/pocket-ctf/actions) [![Solid](https://img.shields.io/badge/Solid-1.9-2C4F7C?logo=solid&logoColor=white)](https://www.solidjs.com) [![TanStack Start](https://img.shields.io/badge/TanStack_Start-1.x-C2255C?logo=react&logoColor=white)](https://tanstack.com/start) [![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-0B7285?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)

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
| **Framework** | [Solid](https://www.solidjs.com) · [TanStack Start](https://tanstack.com/start)            |
| **Styling**   | [Tailwind CSS v4](https://tailwindcss.com) · [Lucide](https://lucide.dev)                  |
| **Crypto**    | [Web Crypto](https://developer.mozilla.org/docs/Web/API/Web_Crypto_API) (PBKDF2, AES-GCM)  |
| **Build**     | [Vite](https://vite.dev) · [TypeScript](https://www.typescriptlang.org)                    |
| **Testing**   | [Vitest](https://vitest.dev)                                                               |
| **Tooling**   | [Biome](https://biomejs.dev) · [pnpm](https://pnpm.io)                                     |
| **Hosting**   | [Vercel](https://vercel.com)                                                               |

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
cp flags.example.json flags.secret.json
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

To lint, typecheck, scan for leaked flags and run the self-test together:

```bash
pnpm check
```

### Building

To create a production build:

```bash
pnpm build
```

The build output is written to the `dist/client` folder — static HTML that any
file server can host. Preview it locally with `pnpm preview`, and re-run the leak
scan against the real artifact with `pnpm build && pnpm verify:flags`.

## Deployment

Every route is prerendered, so there is no server runtime to deploy.
`vercel.json` sets the build command, points `outputDirectory` at `dist/client`
and enables clean URLs; pushing to `main` is enough. `pnpm deploy` runs a
production deploy through the Vercel CLI if you would rather not push.

A hosted build clones the repository, so the gitignored answer key is absent and
the deploy would ship the demo set. Supply the same JSON through the environment
variables below and `scripts/bootstrap.mjs` will generate this deployment's own
data during `prebuild`. Full details, including why both secret variables are
required, are in [docs/architecture/deployment.md](docs/architecture/deployment.md).

## Configuration

| Variable                | Default                         | Notes                                                                                                        |
| ----------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `POCKET_CTF_FLAGS`      | `—`                             | The whole of `flags.secret.json`, for hosted builds. Without it a deploy ships the public demo set.           |
| `POCKET_CTF_DEPLOYMENT` | `—`                             | The whole of `deployment.secret.json`. **Required** alongside the above, or every deploy changes your flags.   |
| `VITE_SITE_URL`         | `https://pocket-ctf.vercel.app` | Origin used for canonical URLs, the sitemap and social cards.                                                  |

## Roadmap

- [ ] More challenges: timing side channels, archive formats, a padding oracle
- [x] Per-browser challenge variants, so a shared flag usually fails for the
      next player
- [x] Hints shipped sealed rather than readable in the source
- [x] One directory per challenge, discovered automatically
- [x] Per-deployment random flag suffixes
- [x] Proof-of-solve tokens instead of a stored boolean
- [x] Encrypted writeups, unlocked by solving

See the [open issues](https://github.com/kaushalmeena/pocket-ctf/issues) for a
full list of proposed features and known issues.

## Credits

- [Lucide](https://lucide.dev) icons by the **Lucide contributors**, licensed
  under [ISC](https://github.com/lucide-icons/lucide/blob/main/LICENSE).

## Documentation

- **[Architecture](docs/architecture/README.md)** — four pages covering the
  [build pipeline](docs/architecture/build-pipeline.md), the
  [challenge layout](docs/architecture/challenges.md), every
  [anti-cheat measure](docs/architecture/anti-cheat.md) with the limit it runs
  into, and [deployment and indexing](docs/architecture/deployment.md).
- **[Design](docs/design/README.md)** — three pages covering the
  [foundations](docs/design/foundations.md) (colour, type, theming),
  [motion and iconography](docs/design/motion.md), and
  [components, accessibility and voice](docs/design/components.md).

## Contributing

Contributions are welcome! If you find a bug or have a feature request, please
[open an issue](https://github.com/kaushalmeena/pocket-ctf/issues/new/choose)
first to discuss it. For code changes, fork the repository, create a branch, and
open a pull request. Please do not paste flags or full solutions into issues or
pull requests.

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file
for details.

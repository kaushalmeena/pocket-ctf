import { deleteCookie, getCookie } from "@tanstack/solid-start/server";

import { vaultFlag } from "./catalogue";
import { leave, type Player, secretOf, variantOf } from "./players";

/**
 * What the prompt says to anything that is not a flag.
 *
 * It lives on the server so that none of it -- least of all the dotfile that
 * points somewhere -- is sitting in the bundle for a reader to skim.
 */

type Output = { lines: string[]; clear?: boolean; egg?: string };

const FILES: Record<string, string[]> = {
  "readme.txt": [
    "There are flags hidden around this site. Nobody will tell you how many",
    "kinds, or where. Some are in things you can see. Some are in things your",
    "browser was sent and never showed you. Some are in places the site would",
    "rather you did not go. Find one, bring it here.",
  ],
  "rules.txt": [
    "1. Everything on this domain is in scope. Nothing off it is.",
    "2. Guessing is throttled. Looking is not.",
    "3. A flag that is easy to find is probably not a flag.",
    "4. If you are stuck, the trophy case sells clues. They are not free.",
  ],
  "todo.txt": [
    "[x] hide the flags",
    "[x] stop listing the challenges on the front page",
    "[ ] take the X-Flag header out before launch",
    "[ ] stop leaving notes in dotfiles",
    "[ ] /api/simon only listens when simon says so. teach it some manners",
  ],
  "door.txt": [
    "the back door: /api/door?code=______",
    "six digits. it checks them one at a time, left to right, very carefully,",
    "and gives up at the first one it does not like. it is not a fast door.",
  ],
  ".bridge": [
    "an old rope bridge over a very deep gorge, east of the prompt.",
    "a keeper stands at the near end. he asks everyone three questions.",
    "to try your luck: cross bridge",
  ],
  ".radio": [
    "shortwave log, kept for no one",
    "  station still transmitting. same message, on a loop.",
    "  tuned in at /radio. nobody here has worked out what it says.",
  ],
};

const VISIBLE = Object.keys(FILES).filter((name) => !name.startsWith("."));

const QUIPS: Record<string, string[]> = {
  pwd: ["/home/you"],
  cd: ["There is nowhere else to be. The rest of the site is out there, in the browser."],
  exit: ["You can check out any time you like."],
  logout: ["You can check out any time you like."],
  vim: ["You are now trapped in vim. (Not really. That would be cruel.)"],
  emacs: ["A fine operating system, lacking only a decent prompt."],
  ping: ["pong"],
  hello: ["Hello. The flags are not in here, if that's what you were hoping."],
  hi: ["Hello. The flags are not in here, if that's what you were hoping."],
  xyzzy: ["Nothing happens."],

  flag: ["If it were that easy the trophies would be made of cardboard."],
  flags: ["If it were that easy the trophies would be made of cardboard."],
  hint: [
    "Clues live in the trophy case. Each one lowers what its flag pays when found.",
    "Your score is never charged. Looking is free.",
  ],
  hints: [
    "Clues live in the trophy case. Each one lowers what its flag pays when found.",
    "Your score is never charged. Looking is free.",
  ],
  man: ["No manual. That is rather the point of the place."],

  "make me a sandwich": ["What? Make it yourself."],
  "sudo make me a sandwich": ["Okay."],
  date: [new Date().toUTCString()],
  uname: ["PocketOS 1.0 (it's a web form)"],
  history: ["Yours, mostly. Scroll up."],
};

/* ------------------------------------------------------------------ *
 * The bridge
 * ------------------------------------------------------------------ */

const BRIDGE_COOKIE = "bridge";

/*
 * Each line typed at the prompt is its own request, so the keeper remembers
 * which question he asked in a cookie -- signed with the player's seed, so it
 * cannot be set to "question three" by hand.
 */
const bridgeMac = (player: Player, step: number) => secretOf(player, `bridge/${step}`, 16);

function bridgeStep(player: Player) {
  const [step, mac] = (getCookie(BRIDGE_COOKIE) ?? "").split(".");
  const n = Number(step);
  return n >= 1 && n <= 3 && mac === bridgeMac(player, n) ? n : 0;
}

const askNext = (player: Player, step: number, lines: string[]): Output => {
  leave(BRIDGE_COOKIE, `${step}.${bridgeMac(player, step)}`);
  return { lines };
};

const gorge = (why: string): Output => {
  deleteCookie(BRIDGE_COOKIE, { path: "/" });
  return {
    lines: [
      why,
      "You are cast into the gorge. When you climb back out, the keeper is waiting.",
    ],
  };
};

async function bridge(player: Player, step: number, answer: string): Promise<Output> {
  if (answer === "leave" || answer === "run away") {
    deleteCookie(BRIDGE_COOKIE, { path: "/" });
    return { lines: ["You run away. Bravely."] };
  }
  switch (step) {
    case 1:
      if (answer !== player.handle.toLowerCase()) {
        return gorge("That is not what this site calls you. (It is always watching.)");
      }
      return askNext(player, 2, ["Right.", "What is your quest?"]);
    case 2:
      if (!/flag/.test(answer)) return gorge("That is nobody's quest. Not here.");
      return askNext(player, 3, [
        "Right.",
        "What is the airspeed velocity of an unladen swallow?",
      ]);
    default: {
      if (!/african/.test(answer) || !/european/.test(answer)) {
        return gorge("A confident answer. Also a wrong one.");
      }
      deleteCookie(BRIDGE_COOKIE, { path: "/" });
      const flag = await vaultFlag("bridge-keeper", variantOf(player, "bridge-keeper"));
      return {
        lines: [
          "What? I... I don't know that.",
          "The keeper is flung into the gorge by forces nobody can explain.",
          `Pinned to the post on the far side: ${flag}`,
        ],
      };
    }
  }
}

export async function runCommand(player: Player, input: string): Promise<Output> {
  const line = input.replace(/\s+/g, " ").trim();
  const lower = line.toLowerCase();
  const [command = "", ...args] = lower.split(" ");

  if (lower === "") return { lines: [] };
  if (lower === "clear" || lower === "cls") return { lines: [], clear: true };

  // Mid-conversation, everything typed is an answer to the keeper.
  const atBridge = bridgeStep(player);
  if (atBridge > 0) return bridge(player, atBridge, lower);

  if (lower === "cross bridge" || lower === "cross the bridge") {
    return askNext(player, 1, [
      "A keeper stands at the near end of a rope bridge.",
      "Anyone who would cross must first answer three questions. (Type leave to give up.)",
      "",
      "What is your name?",
    ]);
  }

  /*
   * Secret trophies the prompt hands out. Pop culture, mostly, and none of it
   * worth a point.
   */
  if (lower === "hello there") return { lines: ["General Kenobi."], egg: "kenobi" };
  if (lower === "42") {
    return { lines: ["Correct. Now all you need is the question."], egg: "towel" };
  }
  if ([":q", ":q!", ":wq", ":x", ":qa!"].includes(lower)) {
    return { lines: ["You escaped vim. Most people never do."], egg: "vim" };
  }
  if (/^(sudo )?rm -rf \/\*?$/.test(lower)) {
    return {
      lines: ["Deleting everything… just kidding. Your flags are safe. So are ours."],
      egg: "nuke",
    };
  }

  if (lower === "help" || lower === "?") {
    return {
      lines: [
        "pctf{...}     submit a flag",
        "ls            look around",
        "cat <file>    read something",
        "whoami        who the site thinks you are",
        "clear         wipe this",
        "",
        "Not every command is listed. Not every file is, either.",
      ],
    };
  }

  if (command === "ls" || command === "dir") {
    const all = args.some((a) => /^-\w*a/.test(a));
    return { lines: [(all ? Object.keys(FILES) : VISIBLE).join("   ")] };
  }

  if (command === "cat" || command === "less" || command === "more") {
    const name = args[0];
    if (!name) return { lines: ["cat: which file?"] };
    const file = FILES[name.replace(/^\.\//, "")];
    return { lines: file ?? [`cat: ${name}: no such file`] };
  }

  if (lower === "whoami" || lower === "id") {
    return {
      lines: [
        player.handle,
        player.named ? "" : "(the site made that name up. change it in the trophy case.)",
        player.account ? `claimed with github as ${player.account}` : "",
      ].filter(Boolean),
    };
  }

  if (lower === "sudo make me a sandwich") return { lines: QUIPS[lower]! };
  if (command === "sudo" || command === "su") {
    return {
      lines: [`${player.handle} is not in the sudoers file. This incident will be reported.`],
      egg: "sudo",
    };
  }

  if (command === "echo") return { lines: [line.slice(5)] };

  const quip = QUIPS[lower] ?? QUIPS[command];
  if (quip) return { lines: quip };

  return { lines: [`${command}: command not found. Try help.`] };
}

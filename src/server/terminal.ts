import type { Player } from "./players";

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
  ],
  "door.txt": [
    "the back door: /api/door?code=______",
    "six digits. it checks them one at a time, left to right, very carefully,",
    "and gives up at the first one it does not like. it is not a fast door.",
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
  "42": ["Correct, but that's a different question."],
  flag: ["If it were that easy the trophies would be made of cardboard."],
  flags: ["If it were that easy the trophies would be made of cardboard."],
  hint: ["Hints live in the trophy case, and they cost points. Looking is free."],
  hints: ["Hints live in the trophy case, and they cost points. Looking is free."],
  man: ["No manual. That is rather the point of the place."],
  "rm -rf /": ["Deleting everything… just kidding. Your flags are safe. So are ours."],
  "make me a sandwich": ["What? Make it yourself."],
  "sudo make me a sandwich": ["Okay."],
  date: [new Date().toUTCString()],
  uname: ["PocketOS 1.0 (it's a web form)"],
  history: ["Yours, mostly. Scroll up."],
};

export async function runCommand(player: Player, input: string): Promise<Output> {
  const line = input.replace(/\s+/g, " ").trim();
  const lower = line.toLowerCase();
  const [command = "", ...args] = lower.split(" ");

  if (lower === "") return { lines: [] };
  if (lower === "clear" || lower === "cls") return { lines: [], clear: true };

  if (lower === "help" || lower === "?") {
    return {
      lines: [
        "pctf{...}     submit a flag",
        "ls            look around",
        "cat <file>    read something",
        "whoami        who the site thinks you are",
        "restore <c>   pick up your progress with a recovery code",
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

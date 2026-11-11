/**
 * The journal: a story told in files that appear at the prompt as the player
 * finds flags. It is the week of a sysadmin told to remove every flag before
 * an audit, who did not know where any of them were -- the player is doing
 * their job for them, and is named in it.
 *
 * Pure: what exists depends only on progress and the player's handle, so the
 * prompt asks for it per command and nothing is stored.
 */

/** How far into the hunt the player is. */
export type Progress = { found: number; total: number };

/**
 * Each entry unlocks at a number of flags found; `at: 0` means all of them.
 * A locked entry does not exist as far as `ls` and `cat` are concerned.
 */
type Entry = { at: number; name: string; lines: (handle: string) => string[] };

const JOURNAL: Entry[] = [
  {
    at: 1,
    name: "journal-1.txt",
    lines: () => [
      "mon. the auditors arrive friday. the brief: remove every flag from the site.",
      "small problem: i didn't hide them. my predecessor did, and left no list.",
      "just a sticky note on the monitor: 'you'll know them when you see them.'",
      "i do not.",
    ],
  },
  {
    at: 4,
    name: "journal-2.txt",
    lines: (handle) => [
      "tue. found nothing. the logs say somebody else has found several.",
      `the logs call them ${handle}.`,
      "i could block them. or i could let them do my job and take the credit.",
      "letting them.",
    ],
  },
  {
    at: 8,
    name: "journal-3.txt",
    lines: () => [
      "wed. recovered some of the predecessor's notes. highlights:",
      "  'the best hiding place is something the browser was always going to be sent.'",
      "  'some only open for people who ask in the right way. or the right format.'",
      "  'some only show up on paper.'",
      "they were insufferable. they were also right.",
    ],
  },
  {
    at: 12,
    name: "journal-4.txt",
    lines: (handle) => [
      `thu. the auditors asked for an inventory. i sent them ${handle}'s trophy case.`,
      `they asked who ${handle} is. i said 'a contractor'. it's not untrue.`,
      "also found: the predecessor wrote a key in pieces, one on the back of every",
      "trophy. the pieces open the last one. the last one opens nothing else.",
    ],
  },
  {
    at: 16,
    name: "journal-5.txt",
    lines: () => [
      "thu, very late. the deploy log says the predecessor shipped everything",
      "at 3:14 in the morning, every time. the site still remembers. it does",
      "something different at that minute. i have never been awake to see it.",
      "also: they left a fake admin login lying around. do not type quotes into it.",
    ],
  },
  {
    at: 19,
    name: "journal-6.txt",
    lines: (handle) => [
      "fri, 6am. one left. the one made of all the others.",
      `if ${handle} finds it before nine, i keep my job.`,
      "no pressure.",
    ],
  },
  {
    at: 0,
    name: "journal-7.txt",
    lines: (handle) => [
      "fri, 9am. audit passed. every flag accounted for.",
      `the report's remediation section is one word long. it says '${handle}'.`,
      "taking the rest of the week off. thanks, whoever you are.",
      "-- m.",
    ],
  },
];

const threshold = (entry: Entry, progress: Progress) => entry.at || progress.total;

/** The pages this player can see, by file name, in the order they unlock. */
export function journal(progress: Progress, handle: string): Map<string, string[]> {
  return new Map(
    JOURNAL.filter((entry) => progress.found >= threshold(entry, progress)).map((entry) => [
      entry.name,
      entry.lines(handle),
    ]),
  );
}

/** The page that exactly this many finds has just unlocked, if any. */
export const newPage = (progress: Progress) =>
  JOURNAL.find((entry) => threshold(entry, progress) === progress.found)?.name ?? null;

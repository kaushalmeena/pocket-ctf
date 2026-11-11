import { describe, expect, it } from "vitest";

import { isUltraRare, rarityGrade, rarityPercent } from "../src/lib/rarity.ts";
import { journal, newPage } from "../src/server/journal.ts";

describe("rarity grades", () => {
  it("bands percentages the PlayStation way", () => {
    expect(rarityGrade(2)).toBe("Ultra rare");
    expect(rarityGrade(5)).toBe("Very rare");
    expect(rarityGrade(14.9)).toBe("Very rare");
    expect(rarityGrade(15)).toBe("Rare");
    expect(rarityGrade(50)).toBe("Common");
    expect(isUltraRare(4.9)).toBe(true);
    expect(isUltraRare(5)).toBe(false);
  });

  it("keeps a decimal only where it says something", () => {
    expect(rarityPercent(0.4)).toBe("<1%");
    expect(rarityPercent(8.84)).toBe("8.8%");
    expect(rarityPercent(61.2)).toBe("61%");
  });
});

describe("the journal", () => {
  const at = (found) => ({ found, total: 20 });

  it("is empty before the first flag", () => {
    expect(journal(at(0), "you").size).toBe(0);
  });

  it("grows with progress and ends at the platinum", () => {
    expect([...journal(at(4), "you").keys()]).toEqual(["journal-1.txt", "journal-2.txt"]);
    expect(journal(at(19), "you").has("journal-7.txt")).toBe(false);
    expect(journal(at(20), "you").size).toBe(7);
  });

  it("names the player", () => {
    expect(journal(at(20), "wry-tapir").get("journal-7.txt")?.join(" ")).toContain("wry-tapir");
  });

  it("announces a page only on the find that unlocks it", () => {
    expect(newPage(at(4))).toBe("journal-2.txt");
    expect(newPage(at(5))).toBeNull();
    expect(newPage(at(20))).toBe("journal-7.txt");
  });
});

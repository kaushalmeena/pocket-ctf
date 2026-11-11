/**
 * Rarity grades, PlayStation-style: what share of hunters hold a trophy.
 * The server sends the percentage; the grade is only a name for a band of it.
 */

const GRADES = [
  { below: 5, name: "Ultra rare" },
  { below: 15, name: "Very rare" },
  { below: 50, name: "Rare" },
  { below: Infinity, name: "Common" },
] as const;

export const rarityGrade = (percent: number) =>
  GRADES.find((grade) => percent < grade.below)!.name;

/** "4.2%", "<1%", "38%": one decimal only where it still says something. */
export const rarityPercent = (percent: number) =>
  percent < 1 ? "<1%" : percent < 10 ? `${percent.toFixed(1)}%` : `${Math.round(percent)}%`;

export const rarityText = (percent: number) =>
  `${rarityGrade(percent)} · ${rarityPercent(percent)}`;

/** Ultra rare gets the gold ink; the rest stay quiet. */
export const isUltraRare = (percent: number) => percent < GRADES[0].below;

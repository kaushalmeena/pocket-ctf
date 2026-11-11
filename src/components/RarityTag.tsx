import { isUltraRare, rarityGrade, rarityPercent } from "~/lib/rarity";

/** "Very rare · 9%", in the small caps the trophy labels use. */
export function RarityTag(props: { percent: number; class?: string }) {
  return (
    <span
      class={`shrink-0 font-mono text-[0.6rem] tracking-widest whitespace-nowrap uppercase ${props.class ?? ""}`}
      classList={{
        "text-amber-500 dark:text-amber-400": isUltraRare(props.percent),
        "text-zinc-500": !isUltraRare(props.percent),
      }}
      title={`Held by about ${rarityPercent(props.percent)} of hunters`}
    >
      {rarityGrade(props.percent)} · {rarityPercent(props.percent)}
    </span>
  );
}

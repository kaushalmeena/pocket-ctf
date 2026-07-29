import type { JSX } from "solid-js";
import type { Category, Difficulty } from "~/lib/challenges";

const DIFFICULTY_STYLES: Record<Difficulty, string> = {
  easy: "bg-accent-50 text-accent-600 dark:bg-accent-950 dark:text-accent-200",
  medium: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
  hard: "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300",
};

export function Pill(props: { children: JSX.Element; class?: string; title?: string }) {
  return (
    <span
      title={props.title}
      class={`inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[0.7rem] tracking-wide ${
        props.class ?? "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
      }`}
    >
      {props.children}
    </span>
  );
}

export function DifficultyPill(props: { difficulty: Difficulty }) {
  return <Pill class={DIFFICULTY_STYLES[props.difficulty]}>{props.difficulty}</Pill>;
}

export function CategoryPill(props: { category: Category }) {
  return <Pill>{props.category}</Pill>;
}

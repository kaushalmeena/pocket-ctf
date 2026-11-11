import { createFileRoute } from "@tanstack/solid-router";
import { For } from "solid-js";

import { Room } from "~/components/Room";
import { getMachine } from "~/lib/api";
import { NO_INDEX } from "~/lib/seo";

export const Route = createFileRoute("/machine")({
  loader: () => getMachine(),
  head: () => ({ meta: [{ title: "The machine — Pocket CTF" }, NO_INDEX] }),
  component: Machine,
});

const EFFECTS: Record<string, string> = {
  ADD: "acc = (acc + arg) mod 256",
  XOR: "acc = acc XOR arg",
  OUT: "emit acc as one character; arg is ignored",
  HALT: "stop",
};

function Machine() {
  const machine = Route.useLoaderData();
  const spec = () => Object.entries(machine().opcodes);

  return (
    <Room label="rel=help" title="The machine">
      <p class="prose-mini">
        You followed a header nobody renders, to a manual for a machine that does not exist.
        Below is a program for it, in a bytecode nobody else uses. The machine has one register,{" "}
        <code>acc</code>, which starts at zero and survives from one instruction to the next.
        Every instruction is exactly two bytes: an opcode, then a one-byte argument.
      </p>

      <div class="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800">
        <table class="w-full text-sm">
          <thead class="border-b border-zinc-200 bg-zinc-50/60 text-left font-mono text-[0.65rem] tracking-widest text-zinc-500 uppercase dark:border-zinc-800 dark:bg-zinc-900/40">
            <tr>
              <th class="px-4 py-2.5 font-medium">Op</th>
              <th class="px-4 py-2.5 font-medium">Byte</th>
              <th class="px-4 py-2.5 font-medium">Effect</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-zinc-100 dark:divide-zinc-900">
            <For each={spec()}>
              {([name, byte]) => (
                <tr>
                  <td class="px-4 py-2 font-mono text-zinc-900 dark:text-zinc-100">{name}</td>
                  <td class="px-4 py-2 font-mono text-zinc-500">{byte}</td>
                  <td class="px-4 py-2 font-mono text-xs text-zinc-600 dark:text-zinc-400">
                    {EFFECTS[name]}
                  </td>
                </tr>
              )}
            </For>
          </tbody>
        </table>
      </div>

      <div class="blob max-h-64 overflow-y-auto">{machine().bytecode}</div>

      <p class="prose-mini">
        {machine().instructionCount} instructions. You cannot read the answer off the arguments,
        because <code>acc</code> carries between characters: every byte that comes out depends
        on every byte that went in before it. Run it. In your head, on paper, or in ten lines of
        anything.
      </p>
    </Room>
  );
}

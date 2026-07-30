import { For } from "solid-js";

type Payload = {
  bytecode: string;
  opcodes: Record<string, string>;
  instructionCount: number;
};

const SPEC = [
  ["ADD", "0x01", "acc = (acc + arg) & 0xff"],
  ["XOR", "0x02", "acc = acc ^ arg"],
  ["OUT", "0x03", "emit acc as one character; arg ignored"],
  ["HALT", "0xff", "stop"],
];

export default function Page(props: { payload: Payload }) {
  return (
    <div class="space-y-5">
      <p class="prose-mini">
        Below is a program for a machine that does not exist, written in a bytecode nobody else
        uses. It has one register — call it <code>acc</code> — which starts at zero and survives
        from one instruction to the next. Every instruction is exactly two bytes: an opcode,
        then a one-byte argument.
      </p>

      <div class="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
        <table class="w-full text-sm">
          <thead class="border-b border-zinc-200 bg-zinc-50/60 text-left dark:border-zinc-800 dark:bg-zinc-900/40">
            <tr>
              <th class="px-4 py-2 font-medium text-zinc-700 dark:text-zinc-300">Op</th>
              <th class="px-4 py-2 font-medium text-zinc-700 dark:text-zinc-300">Byte</th>
              <th class="px-4 py-2 font-medium text-zinc-700 dark:text-zinc-300">Effect</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-zinc-100 dark:divide-zinc-900">
            <For each={SPEC}>
              {([name, byte, effect]) => (
                <tr>
                  <td class="px-4 py-2 font-mono text-zinc-900 dark:text-zinc-100">{name}</td>
                  <td class="px-4 py-2 font-mono text-zinc-500">{byte}</td>
                  <td class="px-4 py-2 text-zinc-600 dark:text-zinc-400">{effect}</td>
                </tr>
              )}
            </For>
          </tbody>
        </table>
      </div>

      <div class="blob max-h-56 overflow-y-auto">{props.payload.bytecode}</div>

      <p class="prose-mini">
        {props.payload.instructionCount} instructions. You cannot read the answer off the
        arguments, because <code>acc</code> carries between characters — every byte that comes
        out depends on every byte that went in before it. Write the interpreter; it is about ten
        lines.
      </p>
    </div>
  );
}

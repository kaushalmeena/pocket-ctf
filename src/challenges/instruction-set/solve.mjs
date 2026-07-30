import { OPS } from "./build.mjs";

/** Interpret the program and collect whatever it prints. */
export function solve({ payload }) {
  const bytes = Buffer.from(payload.bytecode, "hex");
  let acc = 0;
  let out = "";
  for (let pc = 0; pc < bytes.length; pc += 2) {
    const [op, arg] = [bytes[pc], bytes[pc + 1]];
    if (op === OPS.ADD) acc = (acc + arg) & 0xff;
    else if (op === OPS.XOR) acc ^= arg;
    else if (op === OPS.OUT) out += String.fromCharCode(acc);
    else if (op === OPS.HALT) break;
    else throw new Error(`unknown opcode 0x${op.toString(16)}`);
  }
  return out;
}

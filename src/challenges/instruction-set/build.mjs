import { lcg } from "../../../scripts/lib/encoding.mjs";

/**
 * A program for a machine with one register.
 *
 * ADD and XOR fold values into an accumulator; OUT emits its low byte. The
 * accumulator carries across characters, so the bytes cannot be read off the
 * immediates -- you have to actually run it, or track the state by hand.
 */
export const OPS = { ADD: 0x01, XOR: 0x02, OUT: 0x03, HALT: 0xff };

export function build({ flag }) {
  const noise = lcg(0xb17ec0de);
  const program = [];
  let acc = 0;

  for (const ch of flag) {
    const target = ch.charCodeAt(0);
    // Fold in an arbitrary value, then correct with XOR so OUT lands on target.
    const bump = noise();
    acc = (acc + bump) & 0xff;
    program.push(OPS.ADD, bump);

    const fix = acc ^ target;
    acc ^= fix;
    program.push(OPS.XOR, fix);

    program.push(OPS.OUT, 0x00);
  }
  program.push(OPS.HALT, 0x00);

  return {
    bytecode: Buffer.from(program).toString("hex"),
    opcodes: { ADD: "0x01", XOR: "0x02", OUT: "0x03", HALT: "0xff" },
    instructionCount: program.length / 2,
  };
}

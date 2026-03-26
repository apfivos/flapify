const FULL_RING = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,:;!?/-+@#$%&() ";
const DIGIT_RING = "0123456789";
const SYMBOL_RING = ".,:;!?/-+@#$%&() ";

function isDigit(value: string): boolean {
  return /^\d$/.test(value);
}

function isSymbol(value: string): boolean {
  return SYMBOL_RING.includes(value);
}

function characterRing(prevChar: string, nextChar: string): string {
  if ((isDigit(prevChar) || prevChar === " ") && isDigit(nextChar)) {
    return DIGIT_RING;
  }

  if ((isSymbol(prevChar) || prevChar === " ") && isSymbol(nextChar)) {
    return SYMBOL_RING;
  }

  return FULL_RING;
}

export function getSequentialFlapSteps(prevChar: string, nextChar: string): string[] {
  if (prevChar === nextChar) {
    return [];
  }

  if (nextChar === " ") {
    return [" "];
  }

  const ring = characterRing(prevChar, nextChar);
  const targetIndex = ring.indexOf(nextChar);

  if (targetIndex === -1) {
    return [nextChar];
  }

  const startIndex = ring.indexOf(prevChar);
  if (startIndex === -1) {
    return ring.slice(0, targetIndex + 1).split("");
  }

  const sequence: string[] = [];
  let currentIndex = startIndex;

  while (sequence.length <= ring.length) {
    currentIndex = (currentIndex + 1) % ring.length;
    sequence.push(ring[currentIndex]);
    if (ring[currentIndex] === nextChar) {
      break;
    }
  }

  return sequence.length > 0 ? sequence : [nextChar];
}

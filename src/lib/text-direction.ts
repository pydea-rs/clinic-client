export const MAX_DIRECTION_SCAN_CHARS = 10;

const LETTER_RE = /\p{L}/u;
const ARABIC_SCRIPT_RE = /\p{Script=Arabic}/u;

/**
 * Determines paragraph direction from the first letter encountered within the
 * leading scan window so leading digits or markdown symbols do not lock a
 * Persian message into LTR.
 */
export function getMessageDirection(text: string): 'rtl' | 'ltr' {
  let scanned = 0;
  for (const ch of text) {
    if (LETTER_RE.test(ch)) {
      return ARABIC_SCRIPT_RE.test(ch) ? 'rtl' : 'ltr';
    }
    scanned += 1;
    if (scanned >= MAX_DIRECTION_SCAN_CHARS) {
      break;
    }
  }
  return 'ltr';
}

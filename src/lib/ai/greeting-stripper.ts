export const DEFAULT_APP_NAME = 'Ai-Clinic-Demo';

export interface GreetingStripperOptions {
  enabled?: boolean;
  appName?: string;
}

export interface GreetingStripper {
  processBotMessage: (text: string, messageId?: string) => string;
  reset: () => void;
}

const LEAD = '^[\\s\\u200B-\\u200F\\u202A-\\u202E\\u2066-\\u2069\\uFEFF]*';

export function isStripGreetingEnabled(
  rawValue: string | undefined = import.meta.env.VITE_STRIP_AI_GREETING,
): boolean {
  return rawValue?.trim().toLowerCase() === 'true';
}

export function getAppName(
  rawValue: string | undefined = import.meta.env.VITE_APP_NAME,
): string {
  return rawValue?.trim() || DEFAULT_APP_NAME;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function wrapGreetingPattern(core: string, trailingAfterPlain: string, flags: string): RegExp {
  const boldBranch = `${LEAD}\\*\\*\\s*${core}\\s*\\*\\*${trailingAfterPlain}`;
  const plainBranch = `${LEAD}${core}${trailingAfterPlain}`;
  return new RegExp(`(?:${boldBranch}|${plainBranch})`, flags);
}

/**
 * Compiles ordered regexes for known repeated Botpress welcome/greeting prefixes
 * in English and Persian.
 */
export function buildGreetingPatterns(appName: string): RegExp[] {
  const escapedAppName = escapeRegExp(appName);
  return [
    wrapGreetingPattern(
      `Hi,\\s*welcome\\s+to\\s+${escapedAppName}[.!]?`,
      '(?:\\s+|$)',
      'i',
    ),
    wrapGreetingPattern('Hi\\.', '(?:\\s+|$)', 'i'),
    wrapGreetingPattern(
      'سلام[،,]\\s*خوش[\\s\\u200C]*(?:اومد[یي]د|آمد[یي]د)[.!]?',
      '(?:\\s+|$)',
      'u',
    ),
    wrapGreetingPattern('سلام[؛;]', '\\s*', 'u'),
  ];
}

export function stripLeadingGreeting(text: string, patterns: RegExp[]): string {
  let result = text;
  // allow a second pass in case the bot emits a short greet immediately before a full welcome
  for (let pass = 0; pass < 2; pass++) {
    let stripped = false;
    for (const pattern of patterns) {
      const next = result.replace(pattern, '');
      if (next !== result) {
        result = next;
        stripped = true;
        break;
      }
    }
    if (!stripped) break;
  }
  return result;
}

/**
 * Stateful per-conversation greeting stripper. Preserves the bot's first response
 * (including any streaming/update events sharing its message ID) and removes known
 * repeated greetings from subsequent bot messages when enabled.
 */
export function createGreetingStripper(options?: GreetingStripperOptions): GreetingStripper {
  const enabled = options?.enabled ?? isStripGreetingEnabled();
  if (!enabled) {
    return {
      processBotMessage: (text: string) => text,
      reset: () => {},
    };
  }

  const patterns = buildGreetingPatterns(options?.appName ?? getAppName());
  let hasBotResponded = false;
  let firstBotMessageId: string | null = null;

  return {
    processBotMessage(text: string, messageId?: string): string {
      if (!text) return text;

      if (!hasBotResponded) {
        hasBotResponded = true;
        firstBotMessageId = messageId ?? null;
        return text;
      }

      // streaming updates for the very first bot message share its ID and must keep its greeting
      if (messageId && firstBotMessageId && messageId === firstBotMessageId) {
        return text;
      }

      return stripLeadingGreeting(text, patterns);
    },
    reset() {
      hasBotResponded = false;
      firstBotMessageId = null;
    },
  };
}

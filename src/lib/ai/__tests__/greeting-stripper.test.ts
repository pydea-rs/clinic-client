import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import {
  DEFAULT_APP_NAME,
  createGreetingStripper,
  getAppName,
  isStripGreetingEnabled,
} from '../greeting-stripper';

describe('greeting-stripper env helpers', () => {
  it('defaults VITE_STRIP_AI_GREETING to false and only enables on true', () => {
    expect(isStripGreetingEnabled(undefined)).toBe(false);
    expect(isStripGreetingEnabled('')).toBe(false);
    expect(isStripGreetingEnabled('false')).toBe(false);
    expect(isStripGreetingEnabled('1')).toBe(false);
    expect(isStripGreetingEnabled('true')).toBe(true);
    expect(isStripGreetingEnabled(' TRUE ')).toBe(true);
  });

  it('defaults APPNAME to Ai-Clinic-Demo when missing or blank', () => {
    expect(DEFAULT_APP_NAME).toBe('Ai-Clinic-Demo');
    expect(getAppName(undefined)).toBe('Ai-Clinic-Demo');
    expect(getAppName('   ')).toBe('Ai-Clinic-Demo');
    expect(getAppName('MyClinic')).toBe('MyClinic');
  });
});

describe('createGreetingStripper', () => {
  it('does nothing across repeated greetings when disabled', () => {
    const stripper = createGreetingStripper({ enabled: false });
    expect(stripper.processBotMessage('Hi, welcome to Ai-Clinic-Demo. First turn', 'm1')).toBe(
      'Hi, welcome to Ai-Clinic-Demo. First turn',
    );
    expect(stripper.processBotMessage('Hi, welcome to Ai-Clinic-Demo. Second turn', 'm2')).toBe(
      'Hi, welcome to Ai-Clinic-Demo. Second turn',
    );
    expect(stripper.processBotMessage('سلام، خوش اومدید. سومین پیام', 'm3')).toBe(
      'سلام، خوش اومدید. سومین پیام',
    );
  });

  it('keeps the first bot greeting intact (including streaming updates with its ID) and strips subsequent English & Persian greetings', () => {
    const stripper = createGreetingStripper({ enabled: true });

    expect(stripper.processBotMessage('Hi, welcome to Ai-Clinic-Demo. How can I help?', 'm1')).toBe(
      'Hi, welcome to Ai-Clinic-Demo. How can I help?',
    );
    // updating the first message must keep its welcome prefix
    expect(stripper.processBotMessage('Hi, welcome to Ai-Clinic-Demo. How can I help today?', 'm1')).toBe(
      'Hi, welcome to Ai-Clinic-Demo. How can I help today?',
    );

    expect(stripper.processBotMessage('Hi, welcome to Ai-Clinic-Demo. Since when did it start?', 'm2')).toBe(
      'Since when did it start?',
    );
    expect(stripper.processBotMessage('**Hi, Welcome to Ai-Clinic-Demo.**\nAny fever?', 'm3')).toBe(
      'Any fever?',
    );
    expect(stripper.processBotMessage('Hi. Are you taking any medication?', 'm4')).toBe(
      'Are you taking any medication?',
    );
    expect(stripper.processBotMessage('Hi. **Warning:** Seek urgent care if dizzy.', 'm5')).toBe(
      '**Warning:** Seek urgent care if dizzy.',
    );

    expect(stripper.processBotMessage('سلام، خوش اومدید. از کی تب دارید؟', 'm6')).toBe(
      'از کی تب دارید؟',
    );
    expect(stripper.processBotMessage('\u200Fسلام, خوش اومديد. شدت درد چقدر است؟', 'm7')).toBe(
      'شدت درد چقدر است؟',
    );
    expect(stripper.processBotMessage('سلام؛ لطفاً علائم دیگر را بنویسید.', 'm8')).toBe(
      'لطفاً علائم دیگر را بنویسید.',
    );
    expect(stripper.processBotMessage('سلام؛سردرد هم دارید؟', 'm9')).toBe(
      'سردرد هم دارید؟',
    );
  });

  it('does not strip normal clinical words starting with Hi and respects custom appName', () => {
    const stripper = createGreetingStripper({ enabled: true, appName: 'Clinic+Pro' });
    stripper.processBotMessage('سلام، خوش اومدید. چطور کمک کنم؟', 'm1');

    expect(stripper.processBotMessage('Hi, welcome to Clinic+Pro. Tell me more.', 'm2')).toBe(
      'Tell me more.',
    );
    expect(stripper.processBotMessage('High fever requires prompt attention.', 'm3')).toBe(
      'High fever requires prompt attention.',
    );
    expect(stripper.processBotMessage('History of migraine?', 'm4')).toBe(
      'History of migraine?',
    );
  });

  it('resets session state so a new conversation keeps its first greeting', () => {
    const stripper = createGreetingStripper({ enabled: true });
    expect(stripper.processBotMessage('سلام، خوش اومدید. پیام اول', 'a1')).toBe(
      'سلام، خوش اومدید. پیام اول',
    );
    expect(stripper.processBotMessage('سلام؛ پیام دوم', 'a2')).toBe('پیام دوم');

    stripper.reset();

    expect(stripper.processBotMessage('سلام، خوش اومدید. مکالمه جدید', 'b1')).toBe(
      'سلام، خوش اومدید. مکالمه جدید',
    );
    expect(stripper.processBotMessage('Hi. Follow-up question.', 'b2')).toBe(
      'Follow-up question.',
    );
  });
});

describe('deployment Dockerfile greeting stripper env configuration', () => {
  it('defaults VITE_STRIP_AI_GREETING=false in client/Dockerfile and true in root deployment Dockerfile', () => {
    const clientDockerfile = readFileSync(path.resolve(__dirname, '../../../../Dockerfile'), 'utf8');
    expect(clientDockerfile).toContain('ARG VITE_APP_NAME=Ai-Clinic-Demo');
    expect(clientDockerfile).toContain('ARG VITE_STRIP_AI_GREETING=false');

    const rootDockerfilePath = path.resolve(__dirname, '../../../../../Dockerfile');
    if (existsSync(rootDockerfilePath)) {
      const rootDockerfile = readFileSync(rootDockerfilePath, 'utf8');
      expect(rootDockerfile).toContain('ARG VITE_APP_NAME=Ai-Clinic-Demo');
      expect(rootDockerfile).toContain('ARG VITE_STRIP_AI_GREETING=true');
      expect(rootDockerfile).toContain('ENV VITE_APP_NAME=${VITE_APP_NAME}');
      expect(rootDockerfile).toContain('ENV VITE_STRIP_AI_GREETING=${VITE_STRIP_AI_GREETING}');
    }
  });
});

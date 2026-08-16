import 'reflect-metadata';
import { createRequire } from 'module';
import { NestFactory } from '@nestjs/core';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createHash, randomBytes } from 'crypto';
import path from 'path';

import { MockBotpressService } from '../mocks/mock-botpress.service.js';
import { MockOpenAiService } from '../mocks/mock-openai.service.js';
import { MockCalendlyService } from '../mocks/mock-calendly.service.js';
import { MockEmailChannel } from '../mocks/mock-email.channel.js';
import { MockWebPushChannel } from '../mocks/mock-webpush.channel.js';

// Use CJS require for server modules to match how the compiled dist code loads them
const require = createRequire(path.resolve(__dirname, '../../node_modules/'));
const serverDist = path.resolve(__dirname, '../../../../server/dist/src');

// Pre-load sodium-native into Node's module cache so the gateway's require() finds it
// (the gateway resolves from server/dist which doesn't have sodium-native in its path)
try {
  const Module = require('module');
  const sodiumPath = require.resolve('sodium-native');
  if (!Module._cache[sodiumPath]) {
    require('sodium-native');
  }
  const originalResolveFilename = Module._resolveFilename;
  Module._resolveFilename = function (request: string, parent: any, ...args: any[]) {
    if (request === 'sodium-native') {
      return sodiumPath;
    }
    return originalResolveFilename.call(this, request, parent, ...args);
  };
} catch {
  // sodium-native not available, WebSocket auth tests will fail
}

const { FastifyAdapter } = require('@nestjs/platform-fastify');
const fastifyCookie = require('@fastify/cookie');
const fastifySecureSession = require('@fastify/secure-session');
const fastifyMultipart = require('@fastify/multipart');
const fastifyCompress = require('@fastify/compress');
const fastifyHelmet = require('@fastify/helmet');

// Load server modules via require to ensure same class references as DI container
const { AppModule } = require(path.join(serverDist, 'app.module'));
const { ExceptionTemplateFilter } = require(path.join(serverDist, 'common/filters/exception-template.filter'));
const { ResponseTemplateInterceptor } = require(path.join(serverDist, 'common/interceptors/response-template.interceptor'));
const { CsrfGuard } = require(path.join(serverDist, 'common/guards/csrf.guard'));
const { PrismaService } = require(path.join(serverDist, 'prisma/prisma.service'));
const { BotpressService } = require(path.join(serverDist, 'ai-agents/botpress.service'));
const { OpenAiService } = require(path.join(serverDist, 'ai-agents/openai/openai.service'));
const { CalendlyService } = require(path.join(serverDist, 'calendly/calendly.service'));
const { EmailChannel } = require(path.join(serverDist, 'notification/channels/email.channel'));
const { WebPushChannel } = require(path.join(serverDist, 'notification/channels/web-push.channel'));

let app: NestFastifyApplication | null = null;
let serverUrl = '';

export let mockBotpress: MockBotpressService;
export let mockOpenAi: MockOpenAiService;
export let mockCalendly: MockCalendlyService;
export let mockEmail: MockEmailChannel;
export let mockWebPush: MockWebPushChannel;

function patchService(target: any, mock: any) {
  const proto = Object.getPrototypeOf(mock);
  for (const name of Object.getOwnPropertyNames(proto)) {
    if (name === 'constructor') continue;
    const descriptor = Object.getOwnPropertyDescriptor(proto, name);
    if (!descriptor) continue;
    if (descriptor.get || descriptor.set) {
      Object.defineProperty(target, name, {
        get: descriptor.get?.bind(mock),
        set: descriptor.set?.bind(mock),
        configurable: true,
      });
    } else if (typeof descriptor.value === 'function') {
      target[name] = descriptor.value.bind(mock);
    }
  }
  for (const key of Object.keys(mock)) {
    Object.defineProperty(target, key, {
      get: () => mock[key],
      set: (v: any) => { mock[key] = v; },
      configurable: true,
    });
  }
}

interface AppMocks {
  botpress: MockBotpressService;
  openAi: MockOpenAiService;
  calendly: MockCalendlyService;
  email: MockEmailChannel;
  webPush: MockWebPushChannel;
}

function normalizeUrl(rawUrl: string): string {
  return rawUrl.replace('[::1]', '127.0.0.1').replace('[::0]', '127.0.0.1');
}

/**
 * Apply the full middleware/config stack to a freshly created Nest app.
 * Shared by the main test server and the isolated rate-limit (prod-env) server
 * so both are configured identically.
 */
async function configureApp(
  targetApp: NestFastifyApplication,
  mocks: AppMocks,
): Promise<void> {
  // Monkey-patch third-party services with mocks (same class refs as DI)
  patchService(targetApp.get(BotpressService), mocks.botpress);
  patchService(targetApp.get(OpenAiService), mocks.openAi);
  patchService(targetApp.get(CalendlyService), mocks.calendly);
  patchService(targetApp.get(EmailChannel), mocks.email);
  patchService(targetApp.get(WebPushChannel), mocks.webPush);

  const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
  targetApp.enableCors({
    origin: corsOrigin.split(',').map((o: string) => o.trim()),
    methods: ['GET', 'HEAD', 'PUT', 'POST', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
  });

  targetApp.useGlobalFilters(new ExceptionTemplateFilter());
  targetApp.useGlobalInterceptors(new ResponseTemplateInterceptor());

  await targetApp.register(fastifyCompress);
  await targetApp.register(fastifyHelmet, {
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  });

  const configService = targetApp.get(ConfigService);

  await targetApp.register(fastifyCookie);
  await targetApp.register(fastifySecureSession, {
    key: createHash('sha256')
      .update(configService.getOrThrow<string>('auth.sessionSecret'))
      .digest(),
    cookieName: configService.get<string>('auth.sessionCookieName') || 'sid',
    cookie: {
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
    },
  });

  const fastifyInstance = targetApp.getHttpAdapter().getInstance();
  fastifyInstance.addHook('onRequest', (req: any, reply: any, done: () => void) => {
    if (!req.cookies?.['csrf-token']) {
      const token = randomBytes(32).toString('hex');
      reply.setCookie('csrf-token', token, {
        path: '/',
        httpOnly: false,
        secure: false,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60,
      });
    }
    done();
  });
  targetApp.useGlobalGuards(new CsrfGuard());

  await targetApp.register(fastifyMultipart, {
    limits: { fileSize: 10 * 1024 * 1024 },
  });

  targetApp.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
      transform: true,
    }),
  );

  class TestIoAdapter extends IoAdapter {
    createIOServer(port: number, options?: any) {
      return super.createIOServer(port, {
        ...options,
        cors: {
          origin: corsOrigin.split(',').map((o: string) => o.trim()),
          credentials: true,
        },
        transports: ['websocket', 'polling'],
      });
    }
  }
  targetApp.useWebSocketAdapter(new TestIoAdapter(targetApp));

  targetApp.enableShutdownHooks();
}

export async function bootstrapTestServer(): Promise<void> {
  if (app) return;

  mockBotpress = new MockBotpressService();
  mockOpenAi = new MockOpenAiService();
  mockCalendly = new MockCalendlyService();
  mockEmail = new MockEmailChannel();
  mockWebPush = new MockWebPushChannel();

  app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    { rawBody: true, logger: ['error', 'warn'] },
  );

  await configureApp(app, {
    botpress: mockBotpress,
    openAi: mockOpenAi,
    calendly: mockCalendly,
    email: mockEmail,
    webPush: mockWebPush,
  });

  await app.listen(0, '0.0.0.0');
  serverUrl = normalizeUrl(await app.getUrl());

  console.log(`[Integration] Test server running at ${serverUrl}`);
}

// ─── Isolated rate-limit server ──────────────────────────────────────────────
// The shared test server runs with APP_ENV=test, which disables the
// ThrottlerGuard (so bulk-login tests aren't blocked by the 5/min auth limit).
// To exercise rate limiting we boot a throwaway second app with APP_ENV forced
// to 'production' *only* around creation. That flips solely the throttler on:
// env validation keys off NODE_ENV (left untouched) and its production-specific
// rules are warnings, not errors — so nothing else hardens and the app boots
// exactly like the shared one.

let rateLimitApp: NestFastifyApplication | null = null;
let rateLimitUrl = '';

export async function bootstrapRateLimitServer(): Promise<string> {
  if (rateLimitApp) return rateLimitUrl;

  const prevAppEnv = process.env.APP_ENV;
  process.env.APP_ENV = 'production';
  try {
    rateLimitApp = await NestFactory.create<NestFastifyApplication>(
      AppModule,
      new FastifyAdapter(),
      { rawBody: true, logger: ['error', 'warn'] },
    );

    await configureApp(rateLimitApp, {
      botpress: new MockBotpressService(),
      openAi: new MockOpenAiService(),
      calendly: new MockCalendlyService(),
      email: new MockEmailChannel(),
      webPush: new MockWebPushChannel(),
    });

    await rateLimitApp.listen(0, '0.0.0.0');
    rateLimitUrl = normalizeUrl(await rateLimitApp.getUrl());

    console.log(
      `[Integration] Rate-limit (prod-env) server running at ${rateLimitUrl}`,
    );
  } finally {
    // The ThrottlerGuard captured APP_ENV at construction (during app init
    // above), so restoring the var now keeps throttling enforced on this app
    // while leaving the shared server and everything else untouched.
    if (prevAppEnv === undefined) delete process.env.APP_ENV;
    else process.env.APP_ENV = prevAppEnv;
  }

  return rateLimitUrl;
}

export async function shutdownRateLimitServer(): Promise<void> {
  if (rateLimitApp) {
    await rateLimitApp.close();
    rateLimitApp = null;
    rateLimitUrl = '';
  }
}

export async function shutdownTestServer(): Promise<void> {
  if (app) {
    await app.close();
    app = null;
    serverUrl = '';
  }
}

export function getServerUrl(): string {
  if (!serverUrl) {
    throw new Error('Test server not running. Call bootstrapTestServer() first.');
  }
  return serverUrl;
}

export function getApp(): NestFastifyApplication {
  if (!app) {
    throw new Error('Test server not running.');
  }
  return app;
}

export function getPrisma(): any {
  if (!app) throw new Error('Test server not running.');
  return app.get(PrismaService);
}

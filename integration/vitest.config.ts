import { defineConfig } from 'vitest/config';
import path from 'path';

const serverNodeModules = path.resolve(__dirname, '../../server/node_modules');

export default defineConfig({
  resolve: {
    alias: [
      { find: '@client', replacement: path.resolve(__dirname, '../src') },
      { find: '@server', replacement: path.resolve(__dirname, '../../server/dist/src') },
      { find: /^@nestjs\/(.*)$/, replacement: path.resolve(serverNodeModules, '@nestjs/$1') },
      { find: /^@prisma\/(.*)$/, replacement: path.resolve(serverNodeModules, '@prisma/$1') },
      { find: 'reflect-metadata', replacement: path.resolve(serverNodeModules, 'reflect-metadata') },
      { find: 'rxjs', replacement: path.resolve(serverNodeModules, 'rxjs') },
      { find: /^rxjs\/(.*)$/, replacement: path.resolve(serverNodeModules, 'rxjs/$1') },
      { find: 'class-transformer', replacement: path.resolve(serverNodeModules, 'class-transformer') },
      { find: 'class-validator', replacement: path.resolve(serverNodeModules, 'class-validator') },
      { find: 'fastify', replacement: path.resolve(serverNodeModules, 'fastify') },
      { find: /^@fastify\/(.*)$/, replacement: path.resolve(serverNodeModules, '@fastify/$1') },
      { find: 'socket.io', replacement: path.resolve(serverNodeModules, 'socket.io') },
      { find: /^socket\.io\/(.*)$/, replacement: path.resolve(serverNodeModules, 'socket.io/$1') },
      { find: 'cache-manager', replacement: path.resolve(serverNodeModules, 'cache-manager') },
      { find: /^@botpress\/(.*)$/, replacement: path.resolve(serverNodeModules, '@botpress/$1') },
      { find: 'openai', replacement: path.resolve(serverNodeModules, 'openai') },
      { find: 'bcrypt', replacement: path.resolve(serverNodeModules, 'bcrypt') },
      { find: 'nodemailer', replacement: path.resolve(serverNodeModules, 'nodemailer') },
      { find: 'web-push', replacement: path.resolve(serverNodeModules, 'web-push') },
    ],
  },
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/setup.ts'],
    globalSetup: ['./src/global-setup.ts'],
    testTimeout: 60_000,
    hookTimeout: 120_000,
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    fileParallelism: false,
    include: ['src/tests/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '../**'],
    sequence: {
      sequential: true,
    },
  },
});

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { register } from 'node:module';
import { isMainThread } from 'node:worker_threads';

if (isMainThread) {
  // Main thread: initialize in-memory IndexedDB & browser mocks
  await import('fake-indexeddb/auto');

  if (!globalThis.localStorage) {
    const store = new Map();
    globalThis.localStorage = {
      getItem: (key) => store.get(String(key)) ?? null,
      setItem: (key, val) => store.set(String(key), String(val)),
      removeItem: (key) => store.delete(String(key)),
      clear: () => store.clear(),
      key: (i) => Array.from(store.keys())[i] ?? null,
      get length() { return store.size; },
    };
  }

  // Set window alias and event dispatchers for headless Node
  if (typeof globalThis.window === 'undefined') {
    globalThis.window = globalThis;
  }
  if (!globalThis.dispatchEvent) {
    globalThis.dispatchEvent = () => true;
  }
  if (!globalThis.addEventListener) {
    globalThis.addEventListener = () => {};
  }
  if (!globalThis.removeEventListener) {
    globalThis.removeEventListener = () => {};
  }
  if (!globalThis.Event) {
    globalThis.Event = class Event {
      constructor(type) { this.type = type; }
    };
  }
  if (!globalThis.CustomEvent) {
    globalThis.CustomEvent = class CustomEvent extends globalThis.Event {
      constructor(type, params) {
        super(type);
        this.detail = params?.detail;
      }
    };
  }

  register(import.meta.url);
}

const projectRoot = path.resolve(fileURLToPath(import.meta.url), '../..');

export async function resolve(specifier, context, nextResolve) {
  let resolvedSpecifier = specifier;

  // Handle @/* alias
  if (resolvedSpecifier.startsWith('@/')) {
    const relativePath = resolvedSpecifier.slice(2);
    const targetPath = path.join(projectRoot, 'src', relativePath);
    resolvedSpecifier = pathToFileURL(targetPath).href;
  }

  // Extensions to probe
  const tryExtensions = ['.ts', '.tsx', '/index.ts', '/index.tsx'];

  try {
    return await nextResolve(resolvedSpecifier, context);
  } catch (err) {
    if (resolvedSpecifier.startsWith('.') || resolvedSpecifier.startsWith('file://')) {
      const basePath = resolvedSpecifier.startsWith('file://')
        ? fileURLToPath(resolvedSpecifier)
        : path.resolve(context.parentURL ? path.dirname(fileURLToPath(context.parentURL)) : projectRoot, resolvedSpecifier);

      for (const ext of tryExtensions) {
        const candidate = basePath + ext;
        if (fs.existsSync(candidate)) {
          return await nextResolve(pathToFileURL(candidate).href, context);
        }
      }
    }
    throw err;
  }
}

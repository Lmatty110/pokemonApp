// Run with: node --test tests/service_worker.test.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

function loadWorker() {
  const handlers = {};
  const notifications = [];
  const deleted = [];
  const opened = [];
  const self = {
    location: { origin: 'https://academy.example.com' },
    addEventListener: (name, handler) => { handlers[name] = handler; },
    skipWaiting: () => {},
    registration: { showNotification: async (title, options) => { notifications.push({ title, options }); } },
    clients: { claim: async () => {}, matchAll: async () => [], openWindow: async url => { opened.push(url); } },
  };
  const context = { self, URL, Response, console, caches: {
    keys: async () => ['pokemon-academy-v1', 'pokemon-academy-v2', 'other-app-cache'],
    delete: async name => { deleted.push(name); },
  } };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../frontend/public/service-worker.js'), 'utf8'), context);
  return { handlers, self, notifications, deleted, opened };
}

test('push shows a system notification with the news deep link', async () => {
  const worker = loadWorker();
  let task;
  worker.handlers.push({ data: { json: () => ({ title: 'Nuova news', body: 'Descrizione', url: '/news/123', tag: 'news-123' }) }, waitUntil: value => { task = value; } });
  await task;
  assert.equal(worker.notifications.length, 1);
  assert.equal(worker.notifications[0].title, 'Nuova news');
  assert.equal(worker.notifications[0].options.body, 'Descrizione');
  assert.equal(worker.notifications[0].options.data.url, '/news/123');
  assert.equal(worker.notifications[0].options.tag, 'news-123');
});

test('empty or invalid push payload still displays a notification', async () => {
  for (const data of [null, { json: () => { throw new SyntaxError(); } }]) {
    const worker = loadWorker();
    let task;
    worker.handlers.push({ data, waitUntil: value => { task = value; } });
    await task;
    assert.equal(worker.notifications.length, 1);
    assert.equal(worker.notifications[0].options.data.url, '/dashboard');
  }
});

test('notification tap opens news when no app window is open', async () => {
  const worker = loadWorker();
  let task;
  let closed = false;
  worker.handlers.notificationclick({ notification: { data: { url: '/news/123' }, close: () => { closed = true; } }, waitUntil: value => { task = value; } });
  await task;
  assert.equal(closed, true);
  assert.deepEqual(worker.opened, ['https://academy.example.com/news/123']);
});

test('notification tap navigates and focuses an existing app window', async () => {
  const worker = loadWorker();
  let task;
  let navigated;
  let focused = false;
  const client = { url: 'https://academy.example.com/dashboard', focus: async () => { focused = true; }, navigate: async url => { navigated = url; return client; } };
  worker.self.clients.matchAll = async () => [client];
  worker.handlers.notificationclick({ notification: { data: { url: '/news/123' }, close: () => {} }, waitUntil: value => { task = value; } });
  await task;
  assert.equal(navigated, 'https://academy.example.com/news/123');
  assert.equal(focused, true);
  assert.equal(worker.opened.length, 0);
});

test('notification tap never navigates to another origin', () => {
  const worker = loadWorker();
  worker.handlers.notificationclick({ notification: { data: { url: 'https://other.example.com' }, close: () => {} }, waitUntil: () => assert.fail('External URLs must not be opened') });
  assert.equal(worker.opened.length, 0);
});

test('worker does not intercept API, external, or non-GET requests', () => {
  const worker = loadWorker();
  for (const request of [{ method: 'POST', url: 'https://academy.example.com/news' },
    { method: 'GET', url: 'https://academy.example.com/api/news' },
    { method: 'GET', url: 'https://other.example.com/asset.js' }]) {
    worker.handlers.fetch({ request, respondWith: () => assert.fail('This request must bypass the cache') });
  }
});

test('activation removes only obsolete academy caches', async () => {
  const worker = loadWorker();
  let task;
  worker.handlers.activate({ waitUntil: value => { task = value; } });
  await task;
  assert.deepEqual(worker.deleted, ['pokemon-academy-v1']);
});

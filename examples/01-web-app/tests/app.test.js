'use strict';

const request = require('supertest');
const { createApp } = require('../src/app');
const { version } = require('../package.json');
let app;
beforeEach(() => { app = createApp(); });

test('health reports the actual packaged version', async () => {
  const response = await request(app).get('/health');
  expect(response.status).toBe(200);
  expect(response.body).toMatchObject({ status: 'ok', version });
  expect(Number.isNaN(Date.parse(response.body.timestamp))).toBe(false);
  expect(response.headers['cache-control']).toBe('no-store');
});
test('starts with two synthetic users', async () => {
  const response = await request(app).get('/users');
  expect(response.status).toBe(200);
  expect(response.body).toHaveLength(2);
});
test('creates and reads back a synthetic record', async () => {
  const response = await request(app).post('/users').send({
    name: 'Synthetic Learner', email: 'learner@example.invalid',
  });
  expect(response.status).toBe(201);
  expect((await request(app).get('/users')).body).toContainEqual(response.body);
});
test.each([
  { name: '', email: 'learner@example.invalid' },
  { name: 'Learner', email: 'invalid' },
  { name: 'Learner', email: 'person@example.com' },
  { name: 'Learner', email: 'learner@example.invalid', admin: true },
])('rejects invalid or non-training input: %j', async body => {
  expect((await request(app).post('/users').send(body)).status).toBe(400);
});
test('reports malformed JSON', async () => {
  expect((await request(app).post('/users').type('json').send('{bad')).status).toBe(400);
});
test('rejects unknown paths', async () => {
  expect((await request(app).get('/missing')).status).toBe(404);
});
test('limits disposable training records', async () => {
  for (let i = 0; i < 98; i++) {
    expect((await request(app).post('/users').send({
      name: 'Synthetic', email: `record${i}@example.invalid`,
    })).status).toBe(201);
  }
  expect((await request(app).post('/users').send({
    name: 'Synthetic', email: 'extra@example.invalid',
  })).status).toBe(409);
});

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createRateLimiter } from '../rateLimit.js';
import { AppError, sendSuccess } from '../api.js';

describe('AppError', () => {
  it('marks operational errors with code and status', () => {
    const err = new AppError('TEST', 'hello', 418);
    assert.equal(err.code, 'TEST');
    assert.equal(err.message, 'hello');
    assert.equal(err.statusCode, 418);
    assert.equal(err.isOperational, true);
  });
});

describe('sendSuccess', () => {
  it('wraps payload in the standard envelope', () => {
    const res = {
      statusCode: 200,
      body: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.body = payload;
        return this;
      },
    };
    sendSuccess(res, { ok: true }, { page: 1 }, 201);
    assert.equal(res.statusCode, 201);
    assert.deepEqual(res.body, { success: true, data: { ok: true }, meta: { page: 1 } });
  });
});

describe('rateLimit', () => {
  it('blocks after max requests', () => {
    const key = `rate-test-${Date.now()}`;
    const limiter = createRateLimiter({
      windowMs: 60_000,
      max: 2,
      keyFn: () => key,
    });
    const responses = [];
    const makeRes = () => ({
      headers: {},
      setHeader(k, v) { this.headers[k] = v; },
      status(code) { this.code = code; return this; },
      json(body) { this.body = body; responses.push(this); return this; },
    });

    let nextCount = 0;
    const next = () => { nextCount += 1; };
    limiter({ ip: '1.1.1.1' }, makeRes(), next);
    limiter({ ip: '1.1.1.1' }, makeRes(), next);
    limiter({ ip: '1.1.1.1' }, makeRes(), next);

    assert.equal(nextCount, 2);
    assert.equal(responses.length, 1);
    assert.equal(responses[0].code, 429);
    assert.equal(responses[0].body.error.code, 'RATE_LIMITED');
  });
});

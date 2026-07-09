import request from 'supertest';
import { UrlRepository } from '../url.repository';
import { Url } from '../url.entity';
import { redisClient } from '../../shared/config/redis.config';

// Silence winston logs during tests
jest.mock('../../shared/utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

// Mock pg pool — prevents real DB connections
jest.mock('../../shared/config/database.config', () => ({
  db: {},
  closeDatabasePool: jest.fn(),
}));

import app from '../../app';

function makeUrl(overrides: Partial<Url> = {}): Url {
  return {
    id: '12345',
    userId: null,
    originalUrl: 'https://example.com/target',
    shortUrl: 'sd-prep',
    isDeleted: false,
    isExpired: false,
    clickCount: 0,
    expiresAt: null,
    createdAt: new Date('2026-07-08T12:00:00Z'),
    updatedAt: new Date('2026-07-08T12:00:00Z'),
    ...overrides,
  };
}

describe('GET /:shortCode (Redirect)', () => {
  let findByShortUrlSpy: jest.SpyInstance;
  let incrementClickCountSpy: jest.SpyInstance;
  let redisGetSpy: jest.SpyInstance;
  let redisSetSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    findByShortUrlSpy = jest.spyOn(UrlRepository.prototype, 'findByShortUrl');
    incrementClickCountSpy = jest.spyOn(UrlRepository.prototype, 'incrementClickCount');
    
    // Default mock implementation to prevent real redis calls hanging/failing in tests
    redisGetSpy = jest.spyOn(redisClient, 'get').mockResolvedValue(null);
    redisSetSpy = jest.spyOn(redisClient, 'set').mockResolvedValue('OK');
    redisClient.eval = jest.fn().mockResolvedValue(1);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ── 1. Cache Hit Scenario ────────────────────────────────────────────────
  it('redirects 302 on Redis cache hit and async increments click count', async () => {
    const shortCode = 'sd-prep';
    const targetUrl = 'https://example.com/target';
    
    redisGetSpy.mockResolvedValue(targetUrl);
    incrementClickCountSpy.mockResolvedValue(undefined);

    const res = await request(app).get(`/${shortCode}`);

    expect(res.status).toBe(302);
    expect(res.header.location).toBe(targetUrl);
    expect(redisGetSpy).toHaveBeenCalledWith(`url:${shortCode}`);
    
    // DB query shouldn't block the request, let's wait a bit to let the background promise resolve
    await new Promise((resolve) => process.nextTick(resolve));
    expect(incrementClickCountSpy).toHaveBeenCalledWith(shortCode);
    expect(findByShortUrlSpy).not.toHaveBeenCalled();
  });

  // ── 2. Cache Miss, DB Hit Scenario ──────────────────────────────────────
  it('acquires lock, queries DB, populates cache, releases lock, and redirects', async () => {
    const shortCode = 'sd-prep';
    const targetUrl = 'https://example.com/target';
    const dbRecord = makeUrl({ originalUrl: targetUrl, shortUrl: shortCode });

    redisGetSpy.mockResolvedValue(null);
    redisSetSpy.mockResolvedValue('OK'); // for lock acquisition and cache write
    findByShortUrlSpy.mockResolvedValue(dbRecord);
    incrementClickCountSpy.mockResolvedValue(undefined);

    const res = await request(app).get(`/${shortCode}`);

    expect(res.status).toBe(302);
    expect(res.header.location).toBe(targetUrl);

    expect(redisClient.set).toHaveBeenCalledWith(
      `lock:url:${shortCode}`,
      expect.any(String),
      'PX',
      2000,
      'NX'
    );
    expect(findByShortUrlSpy).toHaveBeenCalledWith(shortCode);

    // Wait for background caching & lock release & click increment
    await new Promise((resolve) => process.nextTick(resolve));
    expect(redisSetSpy).toHaveBeenCalledWith(`url:${shortCode}`, targetUrl, 'EX', 86400);
    expect(redisClient.eval).toHaveBeenCalled(); // lock release
    expect(incrementClickCountSpy).toHaveBeenCalledWith(shortCode);
  });

  // ── 3. Expired shortcode (410 Gone) ──────────────────────────────────────
  it('returns 410 Gone if URL has expired in DB', async () => {
    const shortCode = 'sd-prep';
    const dbRecord = makeUrl({ isExpired: true });

    redisGetSpy.mockResolvedValue(null);
    redisSetSpy.mockResolvedValue('OK');
    findByShortUrlSpy.mockResolvedValue(dbRecord);

    const res = await request(app).get(`/${shortCode}`);

    expect(res.status).toBe(410);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Gone');
    expect(res.body.message).toContain('expired');
  });

  // ── 4. Missing shortcode (404 Not Found) ──────────────────────────────────
  it('returns 404 Not Found if URL does not exist in DB', async () => {
    const shortCode = 'non-existent';

    redisGetSpy.mockResolvedValue(null);
    redisSetSpy.mockResolvedValue('OK');
    findByShortUrlSpy.mockResolvedValue(null);

    const res = await request(app).get(`/${shortCode}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('NotFound');
  });

  // ── 5. System/Reserved Keywords bypass ────────────────────────────────────
  it('bypasses redirect route for reserved keywords', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('OK');
    expect(redisGetSpy).not.toHaveBeenCalled();
    expect(findByShortUrlSpy).not.toHaveBeenCalled();
  });

  // ── 6. Lock Contention / Thundering Herd Polling ──────────────────────────
  it('polls cache and redirects when lock is held by another request', async () => {
    const shortCode = 'sd-prep';
    const targetUrl = 'https://example.com/target-from-cache';

    redisGetSpy
      .mockResolvedValueOnce(null) // first check: miss
      .mockResolvedValueOnce(targetUrl); // polling check: hit

    redisSetSpy.mockResolvedValue(null); // Lock acquisition fails
    incrementClickCountSpy.mockResolvedValue(undefined);

    const res = await request(app).get(`/${shortCode}`);

    expect(res.status).toBe(302);
    expect(res.header.location).toBe(targetUrl);
    expect(findByShortUrlSpy).not.toHaveBeenCalled();
    
    await new Promise((resolve) => process.nextTick(resolve));
    expect(incrementClickCountSpy).toHaveBeenCalledWith(shortCode);
  });
});

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as cheerio from 'cheerio';
import { UpcomingMatchParser } from './UpcomingMatchParser';

// ---------------------------------------------------------------------------
// Load fixture HTML once for the entire test-suite.
// ---------------------------------------------------------------------------
const fixturePath = join(__dirname, 'fixtures', 'upcomingMatchFixture.html');
const fixtureHtml = readFileSync(fixturePath, 'utf8');
const $ = cheerio.load(fixtureHtml);
const parser = new UpcomingMatchParser($);
const parsed = parser.parse();

describe('UpcomingMatchParser.parse', () => {
  it('should return at least one match', () => {
    expect(parsed.length).toBeGreaterThan(0);
  });

  it('should correctly parse the first (live) match card', () => {
    const first = parsed[0]!;
    expect(first).toMatchObject({
      id: '509209',
      date: 'Fri, June 27, 2025',
      time: '6:00 PM',
      status: 'LIVE',
      eta: null,
    });

    expect(first.teams[0]).toMatchObject({
      name: 'samuel autohaus',
      countryCode: 'de',
      score: 1,
    });
    expect(first.teams[1]).toMatchObject({
      name: 'RIZON Impact',
      countryCode: 'de',
      score: 1,
    });
  });

  it('should mark upcoming matches with an ETA', () => {
    const upcoming = parsed.find(m => m.id === '508864');
    expect(upcoming).toBeDefined();
    expect(upcoming!.status).toBe('Upcoming');
    expect(upcoming!.eta).not.toBeNull();
  });
}); 

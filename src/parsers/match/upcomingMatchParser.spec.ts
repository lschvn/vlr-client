import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as cheerio from 'cheerio';
import { UpcomingMatchParser } from './UpcomingMatchParser.js';

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
    expect(parsed).toHaveLength(50);
  });

  it('should correctly parse the first match card', () => {
    const first = parsed[0]!;
    expect(first).toMatchObject({
      id: '706359',
      date: 'Sat, July 25, 2026',
      time: '11:00 PM',
      status: 'Upcoming',
      eta: '1h 52m',
    });

    expect(first.teams[0]).toMatchObject({
      name: 'G2 Esports',
      countryCode: 'us',
      score: null,
    });
    expect(first.teams[1]).toMatchObject({
      name: 'Cloud9',
      countryCode: 'us',
      score: null,
    });

    expect(first.event).toMatchObject({
      name: 'VCT 2026: Americas Stage 2',
      stage: 'Group Stage–Week 2',
      iconUrl: 'https://owcdn.net/img/640f5ab71dfbb.png',
    });
    expect(first.statsStatus).toBe('Pending');
    expect(first.vodsStatus).toBe('Pending');
  });

  it('should mark upcoming matches with an ETA', () => {
    const upcoming = parsed.find(m => m.id === '706360');
    expect(upcoming).toBeDefined();
    expect(upcoming!.status).toBe('Upcoming');
    expect(upcoming!.eta).not.toBeNull();
  });

  it('should never produce NaN scores', () => {
    for (const match of parsed) {
      for (const team of match.teams) {
        expect(team.score === null || Number.isFinite(team.score)).toBe(true);
      }
    }
  });
}); 

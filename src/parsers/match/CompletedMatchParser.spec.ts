import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as cheerio from 'cheerio';
import { CompletedMatchParser } from './CompletedMatchParser.js';

// ---------------------------------------------------------------------------
// Load fixture HTML once for the entire test-suite.
// ---------------------------------------------------------------------------
const fixturePath = join(__dirname, 'fixtures', 'completedMatchFixture.html');
const fixtureHtml = readFileSync(fixturePath, 'utf8');
const $ = cheerio.load(fixtureHtml);
const parser = new CompletedMatchParser($);
const parsed = parser.parse('712821');

describe('CompletedMatchParser.parse', () => {
  it('should correctly parse the match details', () => {
    expect(parsed.id).toBe('712821');
    expect(parsed.status).toBe('final');
    expect(parsed.bestOf).toBe('Bo3');
    expect(parsed.date).toBe('Saturday, July 25');
    expect(parsed.time).toBe('7:00 PM CEST');
    expect(parsed.utcTimestamp).toBe('2026-07-25 13:00:00');
    expect(parsed.patch).toBe('Patch 13.01');

    expect(parsed.event).toMatchObject({
      name: 'VCT 2026: EMEA Stage 2',
      series: 'Group Stage: Week 2',
      link: 'https://www.vlr.gg/event/2976/vct-2026-emea-stage-2/group-stage',
      imageUrl: 'https://owcdn.net/img/65ab59620a233.png',
    });
  });

  it('should correctly parse the team details', () => {
    expect(parsed.team1).toMatchObject({
      name: 'Eternal Fire',
      score: 0,
      link: 'https://www.vlr.gg/team/6392/eternal-fire',
      logoUrl: 'https://owcdn.net/img/6628980dcdaea.png',
    });
    expect(parsed.team2).toMatchObject({
      name: 'GIANTX',
      score: 2,
      link: 'https://www.vlr.gg/team/14419/giantx',
      logoUrl: 'https://owcdn.net/img/657b2f3fcd199.png',
    });
  });

  it('should correctly parse streams', () => {
    expect(parsed.streams.length).toBeGreaterThan(0);
    for (const stream of parsed.streams) {
      expect(stream.name).not.toBe('');
      expect(stream.link).toMatch(/^https?:\/\//);
    }
  });

  it('should correctly parse the match maps', () => {
    expect(parsed.maps.length).toBeGreaterThanOrEqual(2);
    const [map1, map2] = parsed.maps;

    expect(map1).toBeDefined();
    if (!map1) return expect.fail('map1 is not defined');
    expect(map1.name).toBe('Split');
    expect(map1.duration).toBe('50:16');
    expect(map1.team1Score).toBe(5);
    expect(map1.team2Score).toBe(13);

    expect(map2).toBeDefined();
    if (!map2) return expect.fail('map2 is not defined');
    expect(map2.name).toBe('Ascent');
    expect(map2.duration).toBe('45:16');
    expect(map2.team1Score).toBe(7);
    expect(map2.team2Score).toBe(13);
  });

  it('should correctly parse player stats for the first map', () => {
    const map1 = parsed.maps[0]!;
    expect(map1.team1Stats).toHaveLength(5);
    expect(map1.team2Stats).toHaveLength(5);

    const player = map1.team1Stats[0]!;
    expect(player.name).toBe('Favian');
    expect(player.link).toBe('https://www.vlr.gg/player/41720/favian');
    expect(player.rating.all).toBe('1.06');
    expect(player.acs.all).toBe('207');
    expect(Number(player.k.all)).toBe(13);
    expect(Number(player.d.all)).toBe(15);
    expect(Number(player.a.all)).toBe(3);

    expect(player.agents.length).toBeGreaterThan(0);
    expect(player.agents.map((a) => a.name.toLowerCase())).toContain('raze');
    for (const agent of player.agents) {
      expect(agent.iconUrl).toMatch(/^https:\/\//);
    }
  });

  it('should correctly parse rounds for the first map', () => {
    const map1 = parsed.maps[0]!;
    expect(map1.rounds).toHaveLength(18);
    expect(map1.rounds[0]).toMatchObject({
      roundNum: 1,
      winningTeamSide: 'ct',
      outcome: 'defuse',
    });
  });
});

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as cheerio from 'cheerio';
import { CompletedMatchParser } from './CompletedMatchParser';

// ---------------------------------------------------------------------------
// Load fixture HTML once for the entire test-suite.
// ---------------------------------------------------------------------------
const fixturePath = join(__dirname, 'fixtures', 'completedMatchFixture.html');
const fixtureHtml = readFileSync(fixturePath, 'utf8');
const $ = cheerio.load(fixtureHtml);
const parser = new CompletedMatchParser($);
const parsed = parser.parse('494866');

describe('CompletedMatchParser.parse', () => {
  it('should correctly parse the match details', () => {
    expect(parsed.id).toBe('494866');
    expect(parsed.status).toBe('final');
    expect(parsed.bestOf).toBe('Bo3');
    expect(parsed.date).toBe('Friday, June 27th');
    expect(parsed.time).toBe('8:35 AM CEST');
    expect(parsed.patch).toBe('Patch 10.11');

    expect(parsed.event).toMatchObject({
      name: 'Game Changers 2025: Japan Split 2',
      series: 'Main Stage: Lower Round 2',
      link: 'https://www.vlr.gg/event/2419/game-changers-2025-japan-split-2/main-stage',
      imageUrl: 'https://owcdn.net/img/604be13d01964.png',
    });
  });

  it('should correctly parse the team details', () => {
    expect(parsed.team1).toMatchObject({
      name: 'Meteor',
      score: 2,
      elo: '1580',
      link: 'https://www.vlr.gg/team/15459/meteor',
      logoUrl: 'https://owcdn.net/img/661cd234cef60.png',
    });
    expect(parsed.team2).toMatchObject({
      name: 'DRX Changers',
      score: 0,
      elo: '1607',
      link: 'https://www.vlr.gg/team/10113/drx-changers',
      logoUrl: 'https://owcdn.net/img/63b17ac3a7d00.png',
    });
  });

  it('should correctly parse the match maps', () => {
    expect(parsed.maps).toHaveLength(2);
    const [map1, map2] = parsed.maps;

    expect(map1).toBeDefined();
    if (!map1) return expect.fail('map1 is not defined');
    expect(map1.name).toBe('Haven');
    expect(map1.duration).toBe('54:47');
    expect(map1.team1Score).toBe(13);
    expect(map1.team2Score).toBe(10);

    expect(map2).toBeDefined();
    if (!map2) return expect.fail('map2 is not defined');
    expect(map2.name).toBe('Pearl');
    expect(map2.duration).toBe('54:39');
    expect(map2.team1Score).toBe(13);
    expect(map2.team2Score).toBe(8);
  });

  it('should correctly parse player stats for the first map', () => {
    const map1 = parsed.maps[0]!;
    expect(map1.team1Stats).toHaveLength(5);
    expect(map1.team2Stats).toHaveLength(5);

    const player = map1.team1Stats[0]!;
    expect(player.name).toBe('Dia');
    expect(player.agents[0]!.name).toBe('Jett');
    expect(player.k.all).toBe('24');
    expect(player.d.all).toBe('15');
    expect(player.a.all).toBe('3');
  });

  it('should correctly parse rounds for the first map', () => {
    const map1 = parsed.maps[0]!;
    expect(map1.rounds).toHaveLength(23);
    expect(map1.rounds[0]).toMatchObject({
      roundNum: 1,
      winningTeamSide: 't',
      outcome: 'elim',
    });
    expect(map1.rounds[22]).toMatchObject({
      roundNum: 23,
      winningTeamSide: 'ct',
      outcome: 'defuse',
    });
  });
}); 

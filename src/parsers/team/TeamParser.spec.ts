import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as cheerio from 'cheerio';
import { TeamParser } from './TeamParser';

const fixturePath = join(__dirname, 'fixtures', 'teamFixture.html');
const fixtureHtml = readFileSync(fixturePath, 'utf8');
const $ = cheerio.load(fixtureHtml);
const parser = new TeamParser($);
const parsed = parser.parse();

describe('TeamParser.parse', () => {
  it('should correctly parse the team header', () => {
    expect(parsed.id).toBe('6392');
    expect(parsed.url).toBe('https://www.vlr.gg/team/6392/eternal-fire/');
    expect(parsed.name).toBe('Eternal Fire');
    expect(parsed.tag).toBe('EF');
    expect(parsed.logoUrl).toBe('https://owcdn.net/img/6628980dcdaea.png');
    expect(parsed.country).toBe('Türkiye');
    expect(parsed.countryCode).toBe('tr');
    expect(parsed.totalWinnings).toBe('$29,872');
  });

  it('should not treat social links as the website', () => {
    expect(parsed.website).toBeNull();
    expect(parsed.socials).toEqual([
      { name: 'twitter', url: 'https://x.com/eternalfiregg' },
    ]);
  });

  it('should parse the ranking block', () => {
    expect(parsed.ranking).toEqual({
      rank: 22,
      region: 'Europe',
      rating: 1672,
      record: { wins: 51, losses: 32 },
    });
  });

  it('should parse players and staff', () => {
    expect(parsed.roster.players).toHaveLength(6);
    expect(parsed.roster.staff).toHaveLength(2);

    const firstPlayer = parsed.roster.players[0]!;
    expect(firstPlayer).toMatchObject({
      id: '12670',
      alias: 'nekky',
      realName: 'Anıl Dağdeviren',
      countryCode: 'tr',
      isCaptain: true,
    });
    expect(firstPlayer.avatarUrl).toMatch(/^https:/);

    const firstStaff = parsed.roster.staff[0]!;
    expect(firstStaff).toMatchObject({
      id: '4891',
      alias: 'afr0nfire',
      realName: 'Hakan Pınarbaşı',
      role: 'head coach',
    });
  });

  it('should parse recent results with event name and stage', () => {
    expect(parsed.recentResults.length).toBeGreaterThan(0);
    const first = parsed.recentResults[0]!;
    expect(first).toMatchObject({
      id: '712821',
      url: 'https://www.vlr.gg/712821/eternal-fire-vs-giantx-vct-2026-emea-stage-2-w2',
      opponent: { name: 'GIANTX', tag: 'GX' },
      score: { team: 0, opponent: 2 },
      eventName: 'VCT 26: EMEA Stage 2',
      eventStage: 'Group Stage W2',
      date: '2026/07/25 7:00 pm',
    });
  });

  it('should parse event placements', () => {
    expect(parsed.eventPlacements.length).toBeGreaterThan(0);
    const first = parsed.eventPlacements[0]!;
    expect(first).toMatchObject({
      url: 'https://www.vlr.gg/event/2954/esports-world-cup-2026-emea-qualifier',
      eventName: 'Esports World Cup 2026: EMEA Qualifier',
      winnings: null,
      year: 2026,
    });
    expect(first.placement).toContain('7th–8th');
  });

  it('should parse related news', () => {
    expect(parsed.relatedNews).toHaveLength(5);
    expect(parsed.relatedNews[0]).toMatchObject({
      url: 'https://www.vlr.gg/720827/izzy-benched-from-eternal-fire-spear-to-debut-against-team-heretics',
      title: 'Izzy benched from Eternal Fire, Spear to debut against Team Heretics',
      date: '2026/07/22',
    });
  });
});

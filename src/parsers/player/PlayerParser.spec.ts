import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as cheerio from 'cheerio';
import { PlayerParser } from './PlayerParser';

const fixturePath = join(__dirname, 'fixtures', 'playerFixture.html');
const fixtureHtml = readFileSync(fixturePath, 'utf8');
const $ = cheerio.load(fixtureHtml);
const parser = new PlayerParser($);
const parsed = parser.parse();

describe('PlayerParser.parse', () => {
  it('should correctly parse the player header', () => {
    expect(parsed.id).toBe('41720');
    expect(parsed.url).toBe('https://www.vlr.gg/player/41720/favian');
    expect(parsed.alias).toBe('Favian');
    expect(parsed.realName).toBe('Enes Yiğiter');
    expect(parsed.avatarUrl).toBe('https://owcdn.net/img/69e226459b5e0.png');
    expect(parsed.country).toEqual({ name: 'Türkiye', code: 'tr' });
    expect(parsed.totalWinnings).toBe('$9,142');
  });

  it('should classify x.com links as twitter', () => {
    expect(parsed.socials).toEqual([
      { name: 'twitter', url: 'https://x.com/favianfps' },
    ]);
  });

  it('should parse agent stats from the st-table', () => {
    expect(parsed.agentStats.timespan).toBe('60d');
    expect(parsed.agentStats.stats.length).toBeGreaterThan(0);

    const first = parsed.agentStats.stats[0]!;
    expect(first.name).toBe('veto');
    expect(first.imageUrl).toBe(
      'https://www.vlr.gg/img/vlr/game/agents/veto.png'
    );
    expect(first.use).toBe('(4) 50%');
    expect(first.mapsPlayed).toBe(4);
    expect(first.usagePercent).toBe(50);
    expect(first.rounds).toBe(85);
    expect(first.rating).toBeCloseTo(1.15);
    expect(first.acs).toBeCloseTo(255.0);
    expect(first.kd).toBeCloseTo(1.23);
    expect(first.kast).toBe(65);
    expect(first.adr).toBeCloseTo(165.1);
    expect(first.kpr).toBeCloseTo(0.89);
    expect(first.apr).toBeCloseTo(0.16);
    expect(first.fkfd).toBeCloseTo(0.92);
    expect(first.kills).toBe(76);
    expect(first.deaths).toBe(62);
    expect(first.assists).toBe(14);
    expect(first.firstKills).toBe(11);
    expect(first.firstDeaths).toBe(12);
  });

  it('should parse recent matches', () => {
    expect(parsed.recentMatches.length).toBeGreaterThan(0);
    const first = parsed.recentMatches[0]!;
    expect(first.id).toBe('712821');
    expect(first.status).toBe('completed');
    expect(first.result.status).toBe('loss');
  });

  it('should parse current and past teams', () => {
    expect(parsed.teams).toHaveLength(4);
    const current = parsed.teams.find((t) => !t.isPast);
    expect(current).toMatchObject({
      id: '6392',
      name: 'Eternal Fire',
      url: 'https://www.vlr.gg/team/6392/eternal-fire',
    });
    expect(parsed.teams.filter((t) => t.isPast)).toHaveLength(3);
  });

  it('should parse event placements', () => {
    expect(parsed.eventPlacements.length).toBeGreaterThan(0);
    const first = parsed.eventPlacements[0]!;
    expect(first).toMatchObject({
      eventName: 'Esports World Cup 2026: EMEA Qualifier',
      eventUrl:
        'https://www.vlr.gg/event/2954/esports-world-cup-2026-emea-qualifier',
      team: 'Eternal Fire',
      year: 2026,
    });
    expect(first.placement).toContain('7th–8th');
  });

  it('should parse latest news', () => {
    expect(parsed.news).toHaveLength(1);
    expect(parsed.news[0]).toMatchObject({
      title: 'ULF Esports sweeps Mandatory, ascends to VCT EMEA 2026',
      url: 'https://www.vlr.gg/577650/ulf-esports-sweeps-mandatory-ascends-to-vct-emea-2026',
      date: '2025/10/25',
    });
  });
});

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as cheerio from 'cheerio';
import { TeamMatchesParser } from './TeamMatchesParser';

const fixturePath = join(__dirname, 'fixtures', 'teamMatchesFixture.html');
const fixtureHtml = readFileSync(fixturePath, 'utf8');
const $ = cheerio.load(fixtureHtml);
const parser = new TeamMatchesParser($);
const { matches, hasNextPage } = parser.parse();

describe('TeamMatchesParser.parse', () => {
  it('should parse all matches on the page', () => {
    expect(matches).toHaveLength(50);
  });

  it('should detect the next page', () => {
    expect(hasNextPage).toBe(true);
  });

  it('should correctly parse the first match', () => {
    const first = matches[0]!;
    expect(first).toMatchObject({
      id: '712821',
      url: 'https://www.vlr.gg/712821/eternal-fire-vs-giantx-vct-2026-emea-stage-2-w2',
      status: 'completed',
      date: '2026/07/25 7:00 pm',
    });
    expect(first.event).toMatchObject({
      name: 'VCT 26: EMEA Stage 2',
      stage: 'Group Stage W2',
      iconUrl: 'https://owcdn.net/img/65ab59620a233.png',
    });
    expect(first.opponent).toMatchObject({
      name: 'GIANTX',
      tag: 'GX',
      logoUrl: 'https://owcdn.net/img/657b2f3fcd199.png',
    });
    expect(first.result).toEqual({ own: 0, opponent: 2, status: 'loss' });
  });

  it('should parse games with agent compositions', () => {
    const first = matches[0]!;
    expect(first.games).toHaveLength(2);
    const game = first.games[0]!;
    expect(game.map).toBe('Split');
    expect(game.result).toEqual({ own: 5, opponent: 13, status: 'loss' });
    expect(game.agentCompositions.own.length).toBeGreaterThan(0);
    expect(game.agentCompositions.own[0]!.name).toBe('astra');
    expect(game.agentCompositions.own[0]!.imageUrl).toBe(
      'https://www.vlr.gg/img/vlr/game/agents/astra.png'
    );
  });

  it('should mark every fixture match as completed with numeric scores', () => {
    for (const match of matches) {
      expect(match.status).toBe('completed');
      expect(['win', 'loss']).toContain(match.result.status);
      expect(typeof match.result.own).toBe('number');
      expect(typeof match.result.opponent).toBe('number');
    }
  });

  it('should resolve protocol-relative image URLs', () => {
    for (const match of matches) {
      expect(match.event.iconUrl).toMatch(/^https:/);
      expect(match.opponent.logoUrl).toMatch(/^https:/);
    }
  });
});

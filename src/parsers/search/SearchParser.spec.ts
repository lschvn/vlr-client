import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as cheerio from 'cheerio';
import { SearchParser } from './SearchParser';

const fixturePath = join(__dirname, 'fixtures', 'searchFixture.html');
const fixtureHtml = readFileSync(fixturePath, 'utf8');
const $ = cheerio.load(fixtureHtml);
const parser = new SearchParser($);
const parsed = parser.parse();

describe('SearchParser.parse', () => {
  it('should parse all search results', () => {
    expect(parsed).toHaveLength(5);
  });

  it('should correctly parse the first player result', () => {
    const first = parsed[0]!;
    expect(first).toMatchObject({
      id: '9801',
      type: 'player',
      name: 'f0rsakeN',
      url: 'https://www.vlr.gg/search/r/player/9801/idx',
      imageUrl: 'https://owcdn.net/img/69735f135cf21.png',
    });
    expect(first.description).toBeUndefined();
  });

  it('should parse team results with the /search/r/ prefix stripped', () => {
    const team = parsed.find((r) => r.type === 'team');
    expect(team).toBeDefined();
    expect(team!.id).toBe('16464');
    expect(team!.name).toContain('Team f0rsakeN');
    expect(team!.imageUrl).toBe('https://www.vlr.gg/img/vlr/tmp/vlr.png');
  });

  it('should only emit known result types', () => {
    for (const result of parsed) {
      expect(['team', 'player', 'event', 'series']).toContain(result.type);
    }
  });
});

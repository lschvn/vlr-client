import { describe, it, expect } from 'vitest';
import * as cheerio from 'cheerio';
import { CompletedMatchParser } from '../parsers/match/CompletedMatchParser';

describe('CompletedMatchParser', () => {
  it('should instantiate and parse without throwing', () => {
    const html = '<html><body><div class="col mod-3"></div></body></html>';
    const $ = cheerio.load(html);
    const parser = new CompletedMatchParser($);
    // The minimal HTML will not contain expected data; ensure it still returns an object with id.
    const result = parser.parse('0');
    expect(result).toBeDefined();
    expect(result.id).toBe('0');
  });

  it('handles completely empty HTML gracefully', () => {
    const $ = cheerio.load('<html></html>');
    const parser = new CompletedMatchParser($);
    const result = parser.parse('42');
    expect(result.id).toBe('42');
    // Expect most strings to be empty – ensures no throw
    expect(result.event.name).toBe('');
    expect(result.team1.name).toBe('');
    expect(result.team2.name).toBe('');
  });

  it('maps known data points from a partial structure', () => {
    const partialHtml = `
      <div class="col mod-3">
        <div class="match-header-event">
          <img src="//logo.png" />
          <div><div>Test Cup</div></div>
        </div>
        <div class="match-header-date">
          <div class="moment-tz-convert" data-utc-ts="123">Jan 1</div>
          <div class="moment-tz-convert">12:00</div>
        </div>
      </div>`;
    const $ = cheerio.load(partialHtml);
    const parser = new CompletedMatchParser($);
    const result = parser.parse('99');
    expect(result.id).toBe('99');
    expect(result.event.name).toContain('Test Cup');
    expect(result.date).toBe('Jan 1');
    expect(result.time).toBe('12:00');
  });

  it('returns default/empty collections when maps or stats are missing', () => {
    const html = `
      <div class="col mod-3">
        <div class="match-header-event">
          <img src="//logo.png" />
          <div><div>Sample Cup</div></div>
        </div>
      </div>`;
    const parser = new CompletedMatchParser(cheerio.load(html));
    const result = parser.parse('77');
    expect(result.maps).toEqual([]);
    expect(result.head2head).toEqual([]);
  });

  it('does not throw when called with undefined / null HTML root', () => {
    // Simulate an API misuse: Cheerio instance wrapping nothing.
    const parser = new CompletedMatchParser(cheerio.load(''));
    expect(() => parser.parse('13')).not.toThrow();
  });
});
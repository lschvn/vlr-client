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
});
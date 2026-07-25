import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as cheerio from 'cheerio';
import { TeamTransactionParser } from './TeamTransactionParser';

const fixturePath = join(__dirname, 'fixtures', 'teamTransactionsFixture.html');
const fixtureHtml = readFileSync(fixturePath, 'utf8');
const $ = cheerio.load(fixtureHtml);
const parser = new TeamTransactionParser($);
const parsed = parser.parse();

describe('TeamTransactionParser.parse', () => {
  it('should parse all transactions', () => {
    expect(parsed).toHaveLength(64);
  });

  it('should correctly parse the first transaction', () => {
    const first = parsed[0]!;
    expect(first).toMatchObject({
      date: '2026/07/09',
      action: 'join',
      position: 'Assistant coach',
      referenceUrl: 'https://x.com/eternalfiregg/status/2075263715230810354',
    });
    expect(first.player).toEqual({
      id: '29002',
      url: 'https://www.vlr.gg/player/29002/haz-m-orhun-dalbeyler',
      alias: 'casteLL0',
      realName: 'Hazım Orhun Dalbeyler',
      countryCode: 'tr',
    });
  });

  it('should only emit known actions', () => {
    for (const txn of parsed) {
      expect(['join', 'leave', 'inactive']).toContain(txn.action);
    }
  });
});

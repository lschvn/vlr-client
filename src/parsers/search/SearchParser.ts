import type { CheerioAPI } from 'cheerio';
import type { SearchResult } from '../../models/Search.js';
import { Url } from '../../utils/Url.js';

export class SearchParser {
  constructor(private readonly $: CheerioAPI) {}

  private cleanText(text: string): string {
    return text.replace(/[\n\t]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  private static readonly VALID_TYPES: SearchResult['type'][] = [
    'team',
    'player',
    'event',
    'series',
  ];

  parse(): SearchResult[] {
    const results: SearchResult[] = [];
    this.$('a.wf-module-item.search-item').each((_, el) => {
      const item = this.$(el);
      const relativeUrl = item.attr('href') || '';
      if (!relativeUrl) return;

      const path = relativeUrl.startsWith('/search/r/')
        ? relativeUrl.slice('/search/r/'.length)
        : relativeUrl;
      const urlParts = path.split('/').filter((p) => p);
      if (urlParts.length < 2) return;

      const type = urlParts[0] as SearchResult['type'];
      const id = urlParts[1];
      if (!id || !SearchParser.VALID_TYPES.includes(type)) return;
      const name = this.cleanText(item.find('.search-item-title').text());
      const rawImageUrl = item.find('img').attr('src');
      const description =
        this.cleanText(item.find('.search-item-desc').text()) || undefined;

      results.push({
        id,
        url: Url.normalize(relativeUrl),
        name,
        imageUrl: rawImageUrl ? Url.normalize(rawImageUrl) : undefined,
        description,
        type,
      });
    });
    return results;
  }
} 

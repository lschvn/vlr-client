import type { CheerioAPI } from 'cheerio';
import type { SearchResult } from '../../models/Search';
import { Url } from '../../utils/Url';

export class SearchParser {
  constructor(private readonly $: CheerioAPI) {}

  private cleanText(text: string): string {
    return text.replace(/[\n\t]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  parse(): SearchResult[] {
    const results: SearchResult[] = [];
    this.$('a.wf-module-item.search-item').each((_, el) => {
      const item = this.$(el);
      const relativeUrl = item.attr('href') || '';
      if (!relativeUrl) return;

      const urlParts = relativeUrl.split('/').filter((p) => p);
      if (urlParts.length < 2) return;

      const type = urlParts[0] as SearchResult['type'];
      const id = urlParts[1];
      if (!id) return;
      const name = this.cleanText(item.find('.search-item-title').text());
      const imageUrl = item.find('img').attr('src') || '';
      const description =
        this.cleanText(item.find('.search-item-desc').text()) || undefined;

      results.push({
        id,
        url: Url.normalize(relativeUrl),
        name,
        imageUrl: Url.normalize(imageUrl),
        description,
        type,
      });
    });
    return results;
  }
} 

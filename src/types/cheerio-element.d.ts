declare module 'cheerio' {
  import type { Element as DomElement } from 'domhandler';
  export type Element = DomElement;
  /**
   * Cheerio v1 does not re-export the historical `CheerioAPI` helper type.
   * We alias it to the typeof root module so legacy imports continue to work.
   */
  export type CheerioAPI = typeof import('cheerio');
}
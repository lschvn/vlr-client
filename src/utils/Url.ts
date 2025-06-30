export class Url {
  private static readonly BASE_URL = 'https://www.vlr.gg';

  static normalize(url: string | undefined | null): string {
    if (!url) {
      return '';
    }
    if (url.startsWith('//')) {
      return `https:${url}`;
    }
    if (url.startsWith('/')) {
      return `${this.BASE_URL}${url}`;
    }
    return url;
  }
}

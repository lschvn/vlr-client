import type { CheerioAPI } from 'cheerio';
import { Url } from '../../utils/Url';
import type { TeamTransaction, TransactionAction } from '../../models/TeamTransaction';

export class TeamTransactionParser {
  constructor(private readonly $: CheerioAPI) {}

  private cleanText(text: string): string {
    return text.replace(/[\n\t]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  parse(): TeamTransaction[] {
    const transactions: TeamTransaction[] = [];
    this.$('table.wf-faux-table tbody tr.txn-item').each((_, element) => {
      const el = this.$(element);

      const date = this.cleanText(el.find('td').eq(0).text());
      
      const actionEl = el.find('.txn-item-action');
      let action: TransactionAction = 'join';
      if (actionEl.hasClass('mod-leave')) {
        action = 'leave';
      } else if (actionEl.hasClass('mod-inactive')) {
        action = 'inactive';
      }

      const countryClass = el.find('td').eq(2).find('i.flag').attr('class') || '';
      const countryCode = countryClass.split(' ').find(c => c.startsWith('mod-'))?.replace('mod-', '') || '';

      const playerLink = el.find('td').eq(3).find('a');
      const playerUrl = playerLink.attr('href') || '';
      const playerId = playerUrl.split('/')[2] || '';
      const playerAlias = this.cleanText(playerLink.text());
      const playerRealName = this.cleanText(el.find('td').eq(3).find('.ge-text-light').text());

      const position = this.cleanText(el.find('td').eq(4).text());
      const referenceUrl = el.find('td').eq(5).find('a').attr('href');

      transactions.push({
        date,
        action,
        player: {
          id: playerId,
          url: Url.normalize(playerUrl),
          alias: playerAlias,
          realName: playerRealName,
          countryCode,
        },
        position,
        referenceUrl: referenceUrl ? Url.normalize(referenceUrl) : undefined,
      });
    });

    return transactions;
  }
} 

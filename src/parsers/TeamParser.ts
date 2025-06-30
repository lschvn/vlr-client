import type { Cheerio, CheerioAPI } from 'cheerio';
import type { Element } from 'domhandler';
import type { Player, Staff, Team } from '../models/Team';
import { Url } from '../utils/Url';

export class TeamParser {
  constructor(private readonly $: CheerioAPI) {}

  private getPlayer(el: Cheerio<Element>): Player {
    const nameElement = el.find('.team-roster-item-name-alias');
    const countryClass = nameElement.find('i.flag').attr('class') || '';
    const countryCode = countryClass.replace('flag mod-', '');
    const isCaptain = nameElement.find('.fa-star').length > 0;
    const url = el.find('a').attr('href') || '';
    const id = url.split('/')[2] || '';

    return {
      url,
      id,
      alias: nameElement.text().trim(),
      realName: el.find('.team-roster-item-name-real').text().trim() || null,
      countryCode: countryCode,
      avatarUrl: Url.normalize(
        el.find('.team-roster-item-img img').attr('src') || ''
      ),
      isCaptain: isCaptain,
    };
  }

  private getStaff(el: Cheerio<Element>): Staff {
    const nameElement = el.find('.team-roster-item-name-alias');
    const countryClass = nameElement.find('i.flag').attr('class') || '';
    const countryCode = countryClass.replace('flag mod-', '');
    const url = el.find('a').attr('href') || '';
    const id = url.split('/')[2] || '';

    return {
      url,
      id,
      alias: nameElement.text().trim(),
      realName: el.find('.team-roster-item-name-real').text().trim() || null,
      countryCode: countryCode,
      avatarUrl: Url.normalize(
        el.find('.team-roster-item-img img').attr('src') || ''
      ),
      role: el.find('.team-roster-item-name-role').text().trim(),
    };
  }

  parse(): Team {
    const url = this.$('a.wf-nav-item.mod-active').attr('href') || '';
    const id = url.split('/')[2] || '';
    const header = this.$('.team-header');
    const name = header.find('.team-header-name h1').text().trim();
    const tag = header.find('.team-header-name h2').text().trim();
    const logoUrl = header.find('.team-header-logo img').attr('src') || '';
    const country = header.find('.team-header-country').text().trim();
    const countryClass =
      header.find('.team-header-country i.flag').attr('class') || '';
    const countryCode =
      countryClass
        .split(' ')
        .find((c) => c.startsWith('mod-'))
        ?.replace('mod-', '') || '';

    const website =
      header.find('.team-header-links a:first-child').attr('href') || null;
    const socials = header
      .find('.team-header-links a:not(:first-child)')
      .map((_, el) => ({
        name: this.$(el).text().trim(),
        url: this.$(el).attr('href') || '',
      }))
      .get();

    const totalWinnings =
      this.$('.team-summary-container-2 .wf-card')
        .first()
        .find('span')
        .first()
        .text()
        .trim() || 'N/A';
    const rank =
      parseInt(this.$('.core-rating-block.mod-active .rank-num').text()) || 0;
    const region =
      this.$('.core-rating-block.mod-active .rating-txt')
        .first()
        .text()
        .trim() || 'N/A';

    const players: Player[] = [];
    const staff: Staff[] = [];

    this.$('.wf-card .team-roster-item').each((_, el) => {
      const element = this.$(el);
      const title = element.closest('.wf-card')?.prev().text().trim();
      if (title === 'players') {
        players.push(this.getPlayer(element));
      } else if (title === 'staff') {
        staff.push(this.getStaff(element));
      }
    });

    return {
      id,
      url,
      name,
      tag,
      logoUrl: Url.normalize(logoUrl),
      country,
      countryCode,
      website,
      socials,
      totalWinnings,
      ranking: {
        rank,
        region,
      },
      roster: {
        players,
        staff,
      },
    };
  }
}

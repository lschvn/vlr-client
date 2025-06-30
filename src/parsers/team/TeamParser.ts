import type { Cheerio, CheerioAPI } from 'cheerio';
import type { Element } from 'domhandler';
import type {
  EventPlacement,
  NewsArticle,
  Player,
  RecentMatch,
  Staff,
  Team,
} from '../../models/Team';
import { Url } from '../../utils/Url';

export class TeamParser {
  constructor(private readonly $: CheerioAPI) {}

  private cleanText(text: string): string {
    return text.replace(/[\n\t]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  private getPlayer(el: Cheerio<Element>): Player {
    const nameElement = el.find('.team-roster-item-name-alias');
    const countryClass = nameElement.find('i.flag').attr('class') || '';
    const countryCode = countryClass.replace('flag mod-', '');
    const isCaptain = nameElement.find('.fa-star').length > 0;
    const relativeUrl = el.find('a').attr('href') || '';
    const id = relativeUrl.split('/')[2] || '';

    return {
      url: Url.normalize(relativeUrl),
      id,
      alias: this.cleanText(
        nameElement.clone().children().remove().end().text()
      ),
      realName: this.cleanText(el.find('.team-roster-item-name-real').text()),
      countryCode,
      avatarUrl: Url.normalize(
        el.find('.team-roster-item-img img').attr('src') || ''
      ),
      isCaptain,
    };
  }

  private getStaff(el: Cheerio<Element>): Staff {
    const nameElement = el.find('.team-roster-item-name-alias');
    const countryClass = nameElement.find('i.flag').attr('class') || '';
    const countryCode = countryClass.replace('flag mod-', '');
    const relativeUrl = el.find('a').attr('href') || '';
    const id = relativeUrl.split('/')[2] || '';

    return {
      url: Url.normalize(relativeUrl),
      id,
      alias: this.cleanText(
        nameElement.clone().children().remove().end().text()
      ),
      realName: this.cleanText(el.find('.team-roster-item-name-real').text()),
      countryCode,
      avatarUrl: Url.normalize(
        el.find('.team-roster-item-img img').attr('src') || ''
      ),
      role: this.cleanText(el.find('.team-roster-item-name-role').text()),
    };
  }

  parse(): Team {
    const relativeUrl = this.$('a.wf-nav-item.mod-active').attr('href') || '';
    const id = relativeUrl.split('/')[2] || '';
    const url = Url.normalize(relativeUrl);
    const header = this.$('.team-header');
    const name = this.cleanText(header.find('.team-header-name h1').text());
    const tag = this.cleanText(header.find('.team-header-name h2').text());
    const logoUrl = header.find('.team-header-logo img').attr('src') || '';
    const country = this.cleanText(header.find('.team-header-country').text());
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
      .find(".team-header-links a[href*='x.com']")
      .map((_, el) => ({
        name: this.cleanText(this.$(el).text()),
        url: this.$(el).attr('href') || '',
      }))
      .get();

    const totalWinnings =
      this.cleanText(
        this.$("div.wf-module-label:contains('Total Winnings')")
          .next('span')
          .text()
      ) || 'N/A';

    const ratingInfo = this.$('.core-rating-block.mod-active .team-rating-info');
    const rank =
      parseInt(ratingInfo.find('.mod-rank .rank-num').first().text()) || 0;
    const region = this.cleanText(
      ratingInfo.find('.mod-rank .rating-txt').first().text()
    );
    const rating =
      parseInt(
        ratingInfo
          .find('.mod-rating .rating-num')
          .contents()
          .first()
          .text()
      ) || 0;
    const record = {
      wins: parseInt(ratingInfo.find('.mod-streak .win').text()) || 0,
      losses: parseInt(ratingInfo.find('.mod-streak .loss').text()) || 0,
    };

    const players: Player[] = [];
    const staff: Staff[] = [];
    this.$('.team-roster-item').each((_, el) => {
      const element = this.$(el);
      const parentLabel = element
        .parent()
        .prev('.wf-module-label')
        .text()
        .trim();
      if (parentLabel === 'players') {
        players.push(this.getPlayer(element));
      } else if (parentLabel === 'staff') {
        staff.push(this.getStaff(element));
      }
    });

    const recentResults: RecentMatch[] = [];
    this.$("h2:contains('Recent Results')")
      .next()
      .find('a.m-item')
      .each((_, el) => {
        const item = this.$(el);
        const relativeUrl = item.attr('href') || '';
        const id = relativeUrl.split('/')[1] || '';
        const opponentName = this.cleanText(
          item.find('.m-item-team-name').last().text()
        );
        const opponentTag = this.cleanText(
          item.find('.m-item-team-tag').last().text()
        );
        const resultText = this.cleanText(item.find('.m-item-result').text());
        const scoreNodes = item.find('.m-item-result > span');
        const teamScore = parseInt(this.$(scoreNodes[0]).text());
        const opponentScore = parseInt(this.$(scoreNodes[1]).text());
        const score = {
          team: isNaN(teamScore) ? null : teamScore,
          opponent: isNaN(opponentScore) ? null : opponentScore,
        };
        const eventInfo = this.cleanText(
          item.find('.m-item-event').text()
        ).split('⋅');
        const eventName = eventInfo[0]?.trim() || '';
        const eventStage = eventInfo[1]?.trim() || '';
        const date = this.cleanText(item.find('.m-item-date').text());

        recentResults.push({
          id,
          url: Url.normalize(relativeUrl),
          opponent: {
            name: opponentName,
            tag: opponentTag,
          },
          result: resultText,
          score,
          eventName,
          eventStage,
          date,
        });
      });

    const eventPlacements: EventPlacement[] = [];
    this.$("h2:contains('Event Placements')")
      .next()
      .find('a.team-event-item')
      .each((_, el) => {
        const item = this.$(el);
        const relativeUrl = item.attr('href') || '';
        const eventName = this.cleanText(item.find('.text-of').text());
        const year =
          parseInt(this.cleanText(item.children().last().text())) || 0;

        const placementEl = item
          .find("div[style='margin-top: 5px; line-height: 1.2;']")
          .first();

        if (placementEl.length) {
          const placementText = this.cleanText(
            placementEl.find('.team-event-item-series').text()
          );
          const winnings =
            this.cleanText(
              placementEl.find("span[style*='font-weight: 700']").text()
            ) || null;

          eventPlacements.push({
            url: Url.normalize(relativeUrl),
            eventName,
            placement: placementText,
            winnings,
            year,
          });
        }
      });

    const relatedNews: NewsArticle[] = [];
    this.$("h2:contains('Related News')")
      .next()
      .find('a.wf-module-item')
      .each((_, el) => {
        const item = this.$(el);
        const relativeUrl = item.attr('href') || '';
        relatedNews.push({
          url: Url.normalize(relativeUrl),
          title: this.cleanText(
            item.find('div[style*="font-weight: 500"]').text()
          ),
          date: this.cleanText(item.find('.ge-text-light').text()),
        });
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
        rating,
        record,
      },
      roster: {
        players,
        staff,
      },
      recentResults,
      eventPlacements,
      relatedNews,
    };
  }
}

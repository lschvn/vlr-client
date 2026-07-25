import type { Cheerio, CheerioAPI } from 'cheerio';
import type { Element } from 'domhandler';
import { Url } from '../../utils/Url.js';
import type { TeamMatch, TeamMatchGame } from '../../models/TeamMatch.js';

export class TeamMatchesParser {
  constructor(private readonly $: CheerioAPI) {}

  private cleanText(text: string): string {
    return text.replace(/[\n\t]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  private getGames(matchId: string): TeamMatchGame[] {
    const games: TeamMatchGame[] = [];
    this.$(`div.m-item-games.match-id-${matchId} > a.m-item-games-item`).each((_, el) => {
      const gameEl = this.$(el);
      const map = this.cleanText(gameEl.find('.map').text());
      const score = this.cleanText(gameEl.find('.score').text()).split('-').map(s => parseInt(s.trim()));
      const ownScore = score[0] ?? 0;
      const opponentScore = score[1] ?? 0;

      const getAgents = (selector: string) => {
        return gameEl.find(selector).find('img').map((_, agentEl) => {
          const agentNode = this.$(agentEl);
          const src = agentNode.attr('src') || '';
          return {
            name: agentNode.attr('alt') || agentNode.attr('title') || src.split('/').pop()?.replace('.png', '') || '',
            imageUrl: Url.normalize(src),
          }
        }).get();
      };
      
      games.push({
        map,
        url: Url.normalize(gameEl.attr('href') || ''),
        result: {
          own: ownScore,
          opponent: opponentScore,
          status: ownScore > opponentScore ? 'win' : 'loss',
        },
        agentCompositions: {
          own: getAgents('.m-item-games-comp:not(.mod-right)'),
          opponent: getAgents('.m-item-games-comp.mod-right'),
        },
      });
    });
    return games;
  }

  parse(): { matches: TeamMatch[]; hasNextPage: boolean } {
    const matches: TeamMatch[] = [];
    this.$('a.wf-card.m-item').each((_, element) => {
      const el = this.$(element);
      const url = el.attr('href') || '';
      const id = url.split('/')[1];

      if (!id) return;

      const eventContainer = el.find('.m-item-event');
      const eventName = this.cleanText(eventContainer.find('div.text-of').first().text());
      const eventStage = this.cleanText(
        eventContainer.clone().children('div').remove().end().text().replace(/⋅/g, ' ')
      );

      const opponentEl = el.find('.m-item-team.mod-right');
      const opponentName = this.cleanText(opponentEl.find('.m-item-team-name').text());
      const opponentTag = this.cleanText(opponentEl.find('.m-item-team-tag').text());

      const resultEl = el.find('.m-item-result');
      const isCompleted = resultEl.hasClass('mod-win') || resultEl.hasClass('mod-loss');
      const scores = resultEl.find('span').map((i, scoreEl) => this.$(scoreEl).text().trim()).get();
      const parseScore = (s: string | undefined) => {
        const n = parseInt(s || '');
        return isNaN(n) ? null : n;
      };
      const ownScore = parseScore(scores[0]);
      const opponentScore = parseScore(scores[1]);

      const vods = el.find('.m-item-vods .wf-tag .full').map((_, vodEl) => this.cleanText(this.$(vodEl).text())).get();

      matches.push({
        id,
        url: Url.normalize(url),
        status: isCompleted ? 'completed' : 'upcoming',
        event: {
          name: eventName,
          stage: eventStage,
          iconUrl: Url.normalize(el.find('.m-item-thumb img').attr('src') || ''),
        },
        opponent: {
          name: opponentName,
          tag: opponentTag,
          logoUrl: Url.normalize(el.find('.m-item-logo.mod-right img').attr('src') || ''),
        },
        result: {
          own: ownScore,
          opponent: opponentScore,
          status: resultEl.hasClass('mod-win') ? 'win' : resultEl.hasClass('mod-loss') ? 'loss' : ownScore === null && opponentScore === null ? 'upcoming' : 'draw',
        },
        date: this.cleanText(el.find('.m-item-date').text()),
        games: this.getGames(String(resultEl.data('match-id'))),
        vods
      });
    });
    
    const pageContainer = this.$('.action-container-pages');
    const lastPageElementIsActive = pageContainer.children().last().hasClass('mod-active');
    const hasNextPage = pageContainer.children().length > 0 && !lastPageElementIsActive;

    return { matches, hasNextPage };
  }
} 

import * as cheerio from 'cheerio';
import type { CheerioAPI } from 'cheerio';
import type { Element } from 'domhandler';
import type {
  CompletedMatch,
  CompletedMatchMap,
  CompletedMatchStatus,
  HeadToHead,
  PastMatch,
  PlayerStatsCompleted,
  PlayerStatValue,
  Round,
  RoundOutcome,
} from '../../models/MatchCompleted.js';

const VLR_URL = 'https://www.vlr.gg';

export class CompletedMatchParser {
  constructor(private readonly $: CheerioAPI) {}

  public parse(matchId: string): CompletedMatch {
    const mainContainer = this.$('.col.mod-3');

    const eventSeriesEl = mainContainer.find('.match-header-event-series');
    let series = '', eventName = '';
    if (eventSeriesEl.length) {
      series = eventSeriesEl.text().trim().replace(/\s+/g, ' ');
      eventName = eventSeriesEl.prev().text().trim().replace(/\s+/g, ' ');
    } else {
      const nameCandidate = mainContainer.find('.match-header-event > div > div').first();
      eventName = nameCandidate.text().trim().replace(/\s+/g, ' ');
    }
    const event = {
      name: eventName,
      series,
      link: this.absUrl(mainContainer.find('.match-header-event').attr('href')),
      imageUrl: this.absUrl(mainContainer.find('.match-header-event img').attr('src')),
    };

    const date = mainContainer.find('.match-header-date > .moment-tz-convert').first().text().trim();
    const time = mainContainer.find('.match-header-date > .moment-tz-convert').last().text().trim();
    const utcTimestamp = (mainContainer.find('.match-header-date > .moment-tz-convert').data('utc-ts') as string | undefined) ?? '';

    const patch = mainContainer.find('.match-header-date > div > div').text().trim();

    const scoreTextRaw = mainContainer
      .find('.match-header-vs-score .sp-hide, .match-header-vs-score .js-spoiler')
      .first()
      .text()
      .replace(/\s+/g, ''); // e.g. "0:2"

    const scoreParts = scoreTextRaw.split(':');
    const leftScore = this.parseIntOr(scoreParts[0], 0);
    const rightScore = this.parseIntOr(scoreParts[1], 0);

    const team1 = {
      name: mainContainer.find('.match-header-link-name.mod-1 .wf-title-med').text().trim(),
      logoUrl: this.absUrl(mainContainer.find('.match-header-link.mod-1 img').attr('src')),
      link: this.absUrl(mainContainer.find('.match-header-link.mod-1').attr('href')),
      elo: mainContainer
        .find('.match-header-link-name.mod-1 .match-header-link-name-elo')
        .text()
        .trim()
        .replace(/\[|\]/g, ''),
      score: leftScore,
    };

    const team2 = {
      name: mainContainer.find('.match-header-link-name.mod-2 .wf-title-med').text().trim(),
      logoUrl: this.absUrl(mainContainer.find('.match-header-link.mod-2 img').attr('src')),
      link: this.absUrl(mainContainer.find('.match-header-link.mod-2').attr('href')),
      elo: mainContainer
        .find('.match-header-link-name.mod-2 .match-header-link-name-elo')
        .text()
        .trim()
        .replace(/\[|\]/g, ''),
      score: rightScore,
    };

    const statusText = mainContainer.find('.match-header-vs-note').first().text().trim().toLowerCase();
    const status: CompletedMatchStatus = statusText === 'final' ? statusText : 'final';
    const bestOf = mainContainer.find('.match-header-vs-note').last().text().trim();

    const streams: { name: string; link: string }[] = [];
    this.$('.match-streams .match-streams-container > *').each((_: number, el: Element) => {
      const $el = this.$(el);
      let name = '';
      let link = '';
      if ($el.is('a')) {
        name = $el.text().trim().replace(/\s+/g, ' ');
        link = this.absUrl($el.attr('href'));
      } else if ($el.find('.match-streams-btn-embed').length > 0) {
        name = $el.find('.match-streams-btn-embed').text().trim().replace(/\s+/g, ' ');
        link = this.absUrl($el.find('.match-streams-btn-external').attr('href'));
      }
      if (name && link) streams.push({ name, link });
    });

    const vods: { name: string; link: string }[] = [];
    this.$('.match-vods .wf-card a').each((_: number, el: Element) => {
      const $el = this.$(el);
      const link = this.absUrl($el.attr('href'));
      const name = $el.text().trim();
      if (link) vods.push({ name, link });
    });

    const maps = this.parseCompletedMatchMaps();
    const head2head = this.parseHeadToHead();
    const pastMatches = this.parsePastMatches();

    return {
      id: matchId,
      event,
      date,
      time,
      utcTimestamp,
      patch,
      team1,
      team2,
      status,
      bestOf,
      streams,
      vods,
      maps,
      head2head,
      pastMatchesTeam1: pastMatches.team1,
      pastMatchesTeam2: pastMatches.team2,
    };
  }

  private absUrl(path?: string): string {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    if (path.startsWith('//')) return 'https:' + path;
    return VLR_URL + (path.startsWith('/') ? path : '/' + path);
  }

  private parseIntOr(value: string | undefined, fallback: number): number {
    const n = parseInt((value ?? '').replace(/[^\d-]/g, ''), 10);
    return Number.isNaN(n) ? fallback : n;
  }

  private parsePastMatches(): { team1: PastMatch[]; team2: PastMatch[] } {
    const team1: PastMatch[] = [];
    const team2: PastMatch[] = [];
    const histories = this.$('.match-histories');
    histories.first().find('a.match-histories-item').each((_: number, el: Element) => {
      const $el = this.$(el);
      team1.push(this.extractPastMatch($el));
    });
    if (histories.length > 1) {
      histories.last().find('a.match-histories-item').each((_: number, el: Element) => {
        const $el = this.$(el);
        team2.push(this.extractPastMatch($el));
      });
    }
    return { team1, team2 };
  }

  private extractPastMatch($el: cheerio.Cheerio<Element>): PastMatch {
    const opponentName = $el.find('.match-histories-item-opponent-name').text().trim();
    const opponentLogoUrl = this.absUrl($el.find('.match-histories-item-opponent-logo').attr('src'));
    const result = `${$el.find('.rf').text().trim()}-${$el.find('.ra').text().trim()}`;
    const link = this.absUrl($el.attr('href'));
    const date = $el.find('.match-histories-item-date').text().trim();
    const win = $el.hasClass('mod-win');
    return { opponentName, opponentLogoUrl, result, link, date, win };
  }

  private parseHeadToHead(): HeadToHead[] {
    const h2h: HeadToHead[] = [];
    this.$('.match-h2h-matches a').each((_: number, el: Element) => {
      const $el = this.$(el);
      const scores = $el.find('.match-h2h-matches-score .rf');
      const score1 = parseInt(scores.first().text().trim(), 10);
      const score2 = parseInt(scores.last().text().trim(), 10);
      const result = `${score1}-${score2}`;
      const date = $el.find('.match-h2h-matches-date').text().trim();
      const link = this.absUrl($el.attr('href'));
      const winnerImg = $el.find('.match-h2h-matches-team.mod-win').attr('src');
      const team1img = this.absUrl(this.$('.match-h2h-header-team').first().find('img').attr('src'));
      const win = !!winnerImg && team1img.includes(winnerImg);
      h2h.push({ result, link, date, win });
    });
    return h2h;
  }

  private parseCompletedMatchMaps(): CompletedMatchMap[] {
    const maps: CompletedMatchMap[] = [];
    this.$('.vm-stats-game[data-game-id]').each((_: number, el: Element) => {
      const gameId = this.$(el).data('game-id');
      if (gameId === 'all') return;
      const mapElement = this.$(el).find('.map > div > span');
      if (!mapElement.length) return;
      const mapName = mapElement.contents().first().text().trim();
      if (mapName.toLowerCase() === 'tbd') return;
      const duration = this.$(el).find('.map-duration').text().trim();
      const team1Score = this.parseIntOr(this.$(el).find('.team:not(.mod-right) .score').text().trim(), 0);
      const team2Score = this.parseIntOr(this.$(el).find('.team.mod-right .score').text().trim(), 0);
      const team1SideStats = {
        defense: this.parseIntOr(this.$(el).find('.team:not(.mod-right) span.mod-ct').first().text().trim(), 0),
        attack: this.parseIntOr(this.$(el).find('.team:not(.mod-right) span.mod-t').first().text().trim(), 0),
      };
      const team2SideStats = {
        attack: this.parseIntOr(this.$(el).find('.team.mod-right span.mod-t').first().text().trim(), 0),
        defense: this.parseIntOr(this.$(el).find('.team.mod-right span.mod-ct').first().text().trim(), 0),
      };
      const rounds = this.parseRounds(el);
      const tables = this.$(el).find('.ovw-table');
      const team1Stats: PlayerStatsCompleted[] = [];
      const team2Stats: PlayerStatsCompleted[] = [];
      tables.eq(0).find('.ovw-row:not(.mod-head)').each((_: number, row: Element) => {
        team1Stats.push(this.parsePlayerStatsCompleted(row));
      });
      tables.eq(1).find('.ovw-row:not(.mod-head)').each((_: number, row: Element) => {
        team2Stats.push(this.parsePlayerStatsCompleted(row));
      });
      maps.push({ name: mapName, duration, team1Score, team2Score, team1SideStats, team2SideStats, rounds, team1Stats, team2Stats });
    });
    return maps;
  }

  private parseRounds(mapContainer: Element): Round[] {
    const rounds: Round[] = [];
    this.$(mapContainer).find('.vlr-rounds-row-col').each((_: number, roundEl: Element) => {
      const roundNumText = this.$(roundEl).find('.rnd-num').text().trim();
      if (!roundNumText) return;
      const roundNum = parseInt(roundNumText, 10);
      const winSideEl = this.$(roundEl).find('.rnd-sq.mod-win');
      if (winSideEl.length === 0) return;
      const winningTeamSide = winSideEl.hasClass('mod-ct') ? 'ct' : 't';
      const outcomeIcon = winSideEl.find('img').attr('src') || '';
      const outcomeMatch = outcomeIcon.match(/round\/(\w+)\.webp/);
      const outcome: RoundOutcome = outcomeMatch && ['defuse', 'elim', 'boom', 'time'].includes(outcomeMatch[1]!)
        ? (outcomeMatch[1] as RoundOutcome)
        : 'unknown';
      rounds.push({ roundNum, winningTeamSide, outcome, outcomeIconUrl: this.absUrl(outcomeIcon) });
    });
    return rounds;
  }

  private parsePlayerStatsCompleted(playerRow: Element): PlayerStatsCompleted {
    const $row = this.$(playerRow);

    const getSides = ($cell: cheerio.Cheerio<Element>): PlayerStatValue => ({
      all: $cell.find('.side.mod-both').first().text().trim(),
      attack: $cell.find('.side.mod-t').first().text().trim(),
      defense: $cell.find('.side.mod-ct').first().text().trim(),
    });

    const getStat = (col: string): PlayerStatValue => getSides($row.find(`.ovw-cell[data-col="${col}"]`));
    const getKdaStat = (col: string): PlayerStatValue =>
      getSides($row.find(`.ovw-cell.mod-kda .ovw-kda-stat[data-col="${col}"]`));

    return {
      name: $row.find('.ovw-cell.mod-player .ovw-player-name').first().text().trim(),
      link: this.absUrl($row.find('.ovw-cell.mod-player .ovw-player a[href^="/player/"]').first().attr('href')),
      agents: $row
        .find('.ovw-agents img')
        .map((_: number, agentEl: Element) => {
          const $img = this.$(agentEl);
          return {
            name: $img.attr('alt') || $img.attr('title') || '',
            iconUrl: this.absUrl($img.attr('src')),
          };
        })
        .get(),
      rating: getStat('rating2'),
      acs: getStat('acs'),
      k: getKdaStat('kills'),
      d: getKdaStat('deaths'),
      a: getKdaStat('assists'),
      kdDiff: getStat('kd-diff'),
      kast: getStat('kast'),
      adr: getStat('adr'),
      hsPercent: getStat('hsp'),
      fk: getStat('fb'),
      fd: getStat('fd'),
      fkDiff: getStat('fk-diff'),
    };
  }
}

import * as cheerio from 'cheerio';
import type { CheerioAPI } from 'cheerio';
import type { Element } from 'domhandler';
import type {
  VlrCompletedMatch,
  VlrCompletedMatchMap,
  VlrHeadToHead,
  VlrPastMatch,
  VlrPlayerStatsCompleted,
  VlrPlayerStatValue,
  VlrRound,
  VlrRoundOutcome,
} from '../../models/MatchCompleted';

const VLR_URL = 'https://www.vlr.gg';

export class CompletedMatchParser {
  constructor(private readonly $: CheerioAPI) {}

  public parse(matchId: string): VlrCompletedMatch {
    const mainContainer = this.$('.col.mod-3');

    const eventNameElement = mainContainer.find('.match-header-event > div > div');
    const series = eventNameElement.find('.match-header-event-series').text().trim().replace(/\s+/g, ' ');
    const eventName = eventNameElement.text().trim().replace(series, '').replace(/\s+/g, ' ').trim();

    const event = {
      name: eventName,
      series,
      link: VLR_URL + mainContainer.find('.match-header-event').attr('href'),
      imageUrl: 'https:' + mainContainer.find('.match-header-event img').attr('src'),
    };

    const date = mainContainer.find('.match-header-date > .moment-tz-convert').first().text().trim();
    const time = mainContainer.find('.match-header-date > .moment-tz-convert').last().text().trim();
    const utcTimestamp = mainContainer.find('.match-header-date > .moment-tz-convert').data('utc-ts') as string;

    const patch = mainContainer.find('.match-header-date > div > div').text().trim();

    const team1ScoreText = mainContainer.find('.match-header-vs-score .js-spoiler .match-header-vs-score-winner').text().trim();
    const team2ScoreText = mainContainer.find('.match-header-vs-score .js-spoiler .match-header-vs-score-loser').text().trim();

    const team1Elo = mainContainer.find('.match-header-link-name.mod-1 .match-header-link-name-elo').text().trim().replace(/\[|\]/g, '');
    const team2Elo = mainContainer.find('.match-header-link-name.mod-2 .match-header-link-name-elo').text().trim().replace(/\[|\]/g, '');

    const team1Data = {
      name: mainContainer.find('.match-header-link-name.mod-1 .wf-title-med').text().trim(),
      logoUrl: 'https:' + mainContainer.find('.match-header-link.mod-1 img').attr('src'),
      link: VLR_URL + mainContainer.find('.match-header-link.mod-1').attr('href'),
      elo: team1Elo,
      score: parseInt(team1ScoreText, 10),
    };

    const team2Data = {
      name: mainContainer.find('.match-header-link-name.mod-2 .wf-title-med').text().trim(),
      logoUrl: 'https:' + mainContainer.find('.match-header-link.mod-2 img').attr('src'),
      link: VLR_URL + mainContainer.find('.match-header-link.mod-2').attr('href'),
      elo: team2Elo,
      score: parseInt(team2ScoreText, 10),
    };

    const team1 = team1ScoreText > team2ScoreText ? team1Data : team2Data;
    const team2 = team1ScoreText > team2ScoreText ? team2Data : team1Data;

    if (mainContainer.find('.match-header-link-name.mod-1 .wf-title-med').text().trim() !== team1.name) {
      [team1.score, team2.score] = [team2.score, team1.score];
    }

    const status = mainContainer.find('.match-header-vs-note').first().text().trim() as 'final';
    const bestOf = mainContainer.find('.match-header-vs-note').last().text().trim();

    const streams: { name: string; link: string }[] = [];
    this.$('.match-streams .match-streams-container > *').each((_: number, el: Element) => {
      const $el = this.$(el);
      let name = '';
      let link: string | undefined = '';
      if ($el.is('a')) {
        name = $el.text().trim().replace(/\s+/g, ' ');
        link = $el.attr('href');
      } else if ($el.find('.match-streams-btn-embed').length > 0) {
        name = $el.find('.match-streams-btn-embed').text().trim().replace(/\s+/g, ' ');
        link = $el.find('.match-streams-btn-external').attr('href');
      }
      if (name && link) streams.push({ name, link });
    });

    const vods: { name: string; link: string }[] = [];
    this.$('.match-vods .wf-card a').each((_: number, el: Element) => {
      const $el = this.$(el);
      const link = $el.attr('href');
      const name = $el.text().trim();
      if (link) vods.push({ name, link: link.startsWith('http') ? link : 'https://' + link });
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

  private parsePastMatches(): { team1: VlrPastMatch[]; team2: VlrPastMatch[] } {
    const team1: VlrPastMatch[] = [];
    const team2: VlrPastMatch[] = [];
    const histories = this.$('.match-histories');
    histories.first().find('a.match-histories-item').each((_: number, el: Element) => {
      const $el = this.$(el);
      team1.push(this.extractPastMatch($el));
    });
    histories.last().find('a.match-histories-item').each((_: number, el: Element) => {
      const $el = this.$(el);
      team2.push(this.extractPastMatch($el));
    });
    return { team1, team2 };
  }

  private extractPastMatch($el: cheerio.Cheerio<Element>): VlrPastMatch {
    const opponentName = $el.find('.match-histories-item-opponent-name').text().trim();
    const opponentLogoUrl = 'https:' + $el.find('.match-histories-item-opponent-logo').attr('src');
    const result = `${$el.find('.rf').text().trim()}-${$el.find('.ra').text().trim()}`;
    const link = VLR_URL + $el.attr('href');
    const date = $el.find('.match-histories-item-date').text().trim();
    const win = $el.hasClass('mod-win');
    return { opponentName, opponentLogoUrl, result, link, date, win };
  }

  private parseHeadToHead(): VlrHeadToHead[] {
    const h2h: VlrHeadToHead[] = [];
    this.$('.match-h2h-matches a').each((_: number, el: Element) => {
      const $el = this.$(el);
      const scores = $el.find('.match-h2h-matches-score .rf');
      const score1 = parseInt(scores.first().text().trim(), 10);
      const score2 = parseInt(scores.last().text().trim(), 10);
      const result = `${score1}-${score2}`;
      const date = $el.find('.match-h2h-matches-date').text().trim();
      const link = VLR_URL + $el.attr('href');
      const winnerImg = $el.find('.match-h2h-matches-team.mod-win').attr('src');
      const team1img = 'https:' + this.$('.match-h2h-header-team').first().find('img').attr('src');
      const win = !!winnerImg && team1img.includes(winnerImg);
      h2h.push({ result, link, date, win });
    });
    return h2h;
  }

  private parseCompletedMatchMaps(): VlrCompletedMatchMap[] {
    const maps: VlrCompletedMatchMap[] = [];
    this.$('.vm-stats-game[data-game-id]').each((_: number, el: Element) => {
      const gameId = this.$(el).data('game-id');
      if (gameId === 'all') return;
      const mapElement = this.$(el).find('.map > div > span');
      if (!mapElement.length) return;
      const mapName = mapElement.contents().first().text().trim();
      if (mapName.toLowerCase() === 'tbd') return;
      const duration = this.$(el).find('.map-duration').text().trim();
      const team1Score = parseInt(this.$(el).find('.team:not(.mod-right) .score').text().trim(), 10);
      const team2Score = parseInt(this.$(el).find('.team.mod-right .score').text().trim(), 10);
      const statsSpans1 = this.$(el).find('.team:not(.mod-right) span[class^="mod-"]');
      const statsSpans2 = this.$(el).find('.team.mod-right span[class^="mod-"]');
      const team1SideStats = { defense: parseInt(statsSpans1.first().text().trim(), 10), attack: parseInt(statsSpans1.last().text().trim(), 10) };
      const team2SideStats = { attack: parseInt(statsSpans2.first().text().trim(), 10), defense: parseInt(statsSpans2.last().text().trim(), 10) };
      const rounds = this.parseRounds(el);
      const tables = this.$(el).find('table.wf-table-inset.mod-overview');
      const team1Stats: VlrPlayerStatsCompleted[] = [];
      const team2Stats: VlrPlayerStatsCompleted[] = [];
      tables.first().find('tbody tr').each((_: number, row: Element) => {
        team1Stats.push(this.parsePlayerStatsCompleted(row));
      });
      tables.last().find('tbody tr').each((_: number, row: Element) => {
        team2Stats.push(this.parsePlayerStatsCompleted(row));
      });
      maps.push({ name: mapName, duration, team1Score, team2Score, team1SideStats, team2SideStats, rounds, team1Stats, team2Stats });
    });
    return maps;
  }

  private parseRounds(mapContainer: any): VlrRound[] {
    const rounds: VlrRound[] = [];
    this.$(mapContainer).find('.vlr-rounds-row-col').each((_: number, roundEl: Element) => {
      const roundNumText = this.$(roundEl).find('.rnd-num').text().trim();
      if (!roundNumText) return;
      const roundNum = parseInt(roundNumText, 10);
      const winSideEl = this.$(roundEl).find('.rnd-sq.mod-win');
      const winningTeamSide = winSideEl.hasClass('mod-ct') ? 'ct' : 't';
      const outcomeIcon = winSideEl.find('img').attr('src') || '';
      const outcomeMatch = outcomeIcon.match(/round\/(\w+)\.webp/);
      const outcome = (outcomeMatch ? outcomeMatch[1] : 'unknown') as VlrRoundOutcome;
      rounds.push({ roundNum, winningTeamSide, outcome, outcomeIconUrl: VLR_URL + outcomeIcon });
    });
    return rounds;
  }

  private parsePlayerStatsCompleted(playerRow: any): VlrPlayerStatsCompleted {
    const getStat = (index: number): VlrPlayerStatValue => ({
      all: this.$(playerRow).find('.mod-stat').eq(index).find('.side.mod-side.mod-both').text().trim(),
      attack: this.$(playerRow).find('.mod-stat').eq(index).find('.side.mod-side.mod-t').text().trim(),
      defense: this.$(playerRow).find('.mod-stat').eq(index).find('.side.mod-side.mod-ct').text().trim(),
    });

    const getKDAStat = (className: string): VlrPlayerStatValue => ({
      all: this.$(playerRow).find(className).find('.side.mod-both').text().trim(),
      attack: this.$(playerRow).find(className).find('.side.mod-t').text().trim(),
      defense: this.$(playerRow).find(className).find('.side.mod-ct').text().trim(),
    });

    return {
      name: this.$(playerRow).find('.mod-player .text-of').text().trim(),
      link: VLR_URL + this.$(playerRow).find('.mod-player a').attr('href'),
      agents: this.$(playerRow).find('.mod-agents img').map((_: number, agentEl: Element) => ({ name: this.$(agentEl).attr('title') || '', iconUrl: 'https:' + this.$(agentEl).attr('src') })).get(),
      rating: getStat(0),
      acs: getStat(1),
      k: getKDAStat('.mod-vlr-kills'),
      d: { all: this.$(playerRow).find('.mod-vlr-deaths .side.mod-both').text().trim(), attack: this.$(playerRow).find('.mod-vlr-deaths .side.mod-t').text().trim(), defense: this.$(playerRow).find('.mod-vlr-deaths .side.mod-ct').text().trim() },
      a: getKDAStat('.mod-vlr-assists'),
      kdDiff: getStat(4),
      kast: getStat(5),
      adr: getStat(6),
      hsPercent: getStat(7),
      fk: getKDAStat('.mod-fb'),
      fd: getKDAStat('.mod-fd'),
      fkDiff: getStat(10),
    };
  }
}
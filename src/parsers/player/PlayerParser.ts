import type { CheerioAPI } from 'cheerio';
import { Url } from '../../utils/Url';
import type { Player, PlayerAgentStats, PlayerEventPlacement, PlayerNews, PlayerTeam } from '../../models/Player';
import { TeamMatchesParser } from '../team/TeamMatchesParser';

export class PlayerParser {
  constructor(private readonly $: CheerioAPI) {}

  private cleanText(text: string): string {
    return text.replace(/[\n\t]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  parse(): Player {
    const id = this.$('a.wf-nav-item.mod-active').attr('href')?.split('/')[2] || '';
    const url = Url.normalize(this.$('a.wf-nav-item.mod-active').attr('href') || '');
    const header = this.$('.player-header');
    const alias = this.cleanText(header.find('h1.wf-title').text());
    const realName = this.cleanText(header.find('h2.player-real-name').text());
    const avatarUrl = Url.normalize(header.find('.wf-avatar img').attr('src') || '');
    const countryEl = header.find('.ge-text-light i.flag');
    const countryName = this.cleanText(countryEl.parent().text());
    const countryCode = countryEl.attr('class')?.split(' ').find(c => c.startsWith('mod-'))?.replace('mod-', '') || '';

    const socials: { name: string, url: string }[] = [];
    header.find('a[href*="x.com"], a[href*="twitch.tv"]').each((_, el) => {
        const link = this.$(el).attr('href') || '';
        let name = 'unknown';
        if (link.includes('x.com') || link.includes('twitter.com')) name = 'twitter';
        if (link.includes('twitch.tv')) name = 'twitch';
        if(link) socials.push({ name, url: link });
    });
    
    const agentStats: PlayerAgentStats[] = [];
    const timespan = this.$('.player-stats-filter-btn.mod-active').text().trim() as Player['agentStats']['timespan'] || '60d';
    this.$('.wf-card.mod-table table.wf-table tbody tr').each((_, el) => {
      const row = this.$(el);
      const cells = row.find('td');
      const useText = this.cleanText(cells.eq(1).text());
      
      agentStats.push({
        name: row.find('img').attr('alt') || '',
        imageUrl: Url.normalize(row.find('img').attr('src') || ''),
        use: useText,
        rounds: parseInt(this.cleanText(cells.eq(2).text())),
        rating: parseFloat(this.cleanText(cells.eq(3).text())),
        acs: parseFloat(this.cleanText(cells.eq(4).text())),
        kd: parseFloat(this.cleanText(cells.eq(5).text())),
        adr: parseFloat(this.cleanText(cells.eq(6).text())),
        kast: parseFloat(this.cleanText(cells.eq(7).text().replace('%', ''))),
        kpr: parseFloat(this.cleanText(cells.eq(8).text())),
        apr: parseFloat(this.cleanText(cells.eq(9).text())),
        fkpr: parseFloat(this.cleanText(cells.eq(10).text())),
        fdpr: parseFloat(this.cleanText(cells.eq(11).text())),
        kills: parseInt(this.cleanText(cells.eq(12).text())),
        deaths: parseInt(this.cleanText(cells.eq(13).text())),
        assists: parseInt(this.cleanText(cells.eq(14).text())),
        firstKills: parseInt(this.cleanText(cells.eq(15).text())),
        firstDeaths: parseInt(this.cleanText(cells.eq(16).text())),
      });
    });

    const teamMatchesParser = new TeamMatchesParser(this.$);
    const { matches: recentMatches } = teamMatchesParser.parse();

    const teams: PlayerTeam[] = [];
    this.$('h2.wf-label:contains("Current Teams")').next('.wf-card').find('a.wf-module-item').each((_, el) => {
        const teamEl = this.$(el);
        const teamUrl = teamEl.attr('href') || '';
        const teamId = teamUrl.split('/')[2] || '';
        teams.push({
            id: teamId,
            url: Url.normalize(teamUrl),
            name: this.cleanText(teamEl.find('div[style*="font-weight: 500"]').text()),
            logoUrl: Url.normalize(teamEl.find('img').attr('src') || ''),
            dateRange: this.cleanText(teamEl.find('.ge-text-light').last().text()),
            isPast: false
        });
    });
    this.$('h2.wf-label:contains("Past Teams")').next('.wf-card').find('a.wf-module-item').each((_, el) => {
        const teamEl = this.$(el);
        const teamUrl = teamEl.attr('href') || '';
        const teamId = teamUrl.split('/')[2] || '';
        teams.push({
            id: teamId,
            url: Url.normalize(teamUrl),
            name: this.cleanText(teamEl.find('div[style*="font-weight: 500"]').text()),
            logoUrl: Url.normalize(teamEl.find('img').attr('src') || ''),
            dateRange: this.cleanText(teamEl.find('.ge-text-light').last().text()),
            isPast: true
        });
    });
    
    const news: PlayerNews[] = [];
    this.$('h2.wf-label:contains("Latest News")').next('.wf-card').find('a.wf-module-item').each((_, el) => {
        const newsEl = this.$(el);
        news.push({
            url: Url.normalize(newsEl.attr('href') || ''),
            title: this.cleanText(newsEl.find('div[style*="font-weight: 500"]').text()),
            date: this.cleanText(newsEl.find('.ge-text-light').text()),
        })
    });
    
    const eventPlacements: PlayerEventPlacement[] = [];
    const totalWinnings = this.cleanText(this.$("div.wf-module-label:contains('Total Winnings')").next('span').text());
    this.$('h2.wf-label:contains("Event Placements")').next('.wf-card').find('a.player-event-item').each((_, el) => {
        const eventEl = this.$(el);
        const placementInfo = eventEl.find('div[style*="margin-top: 5px"]');
        const teamName = this.cleanText(placementInfo.contents().last().text());
        const winningsText = placementInfo.find('span[style*="font-weight: 700"]').text();
        
        eventPlacements.push({
            eventName: this.cleanText(eventEl.find('div[style*="font-weight: 500"]').text()),
            eventUrl: Url.normalize(eventEl.attr('href') || ''),
            placement: this.cleanText(placementInfo.find('span.ge-text-light').text()),
            team: teamName,
            winnings: winningsText ? this.cleanText(winningsText) : undefined,
            year: parseInt(this.cleanText(eventEl.find('div').last().text()))
        });
    });

    return {
      id,
      url,
      alias,
      realName,
      avatarUrl,
      country: {
        name: countryName,
        code: countryCode
      },
      socials,
      totalWinnings,
      agentStats: {
        timespan,
        stats: agentStats
      },
      recentMatches,
      teams,
      eventPlacements,
      news
    };
  }
} 

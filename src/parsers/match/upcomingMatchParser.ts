import * as cheerio from 'cheerio';
import type { MatchIncoming, TeamMini, EventMini } from '../../models/MatchIncoming';

/**
 * Transform the raw HTML of `/matches` into structured data.
 *
 * @param html   Raw HTML string downloaded by HttpClient.
 * @returns      Array of upcoming / live matches in the same order as the page.
 */
export function parseUpcomingMatchList(html: string): MatchIncoming[] {
  const $ = cheerio.load(html);
  const matches: MatchIncoming[] = [];
  
  // The list is grouped by day: a date label comes first, followed by a `.wf-card`
  // that contains every match scheduled for that date. We therefore keep track of the
  // current date while iterating over the DOM tree.
  let currentDate: string = '';

  // Target the main column and iterate over its direct children which are either
  // date labels (`.wf-label`) or match containers (`.wf-card`).
  $('.col.mod-1 > div').each((_, element) => {
    const el = $(element);

    // Update `currentDate` every time we encounter a date label.
    if (el.hasClass('wf-label')) {
      // Grab the first text node only (skipping the "Today" span) and trim extra spaces.
      currentDate = el.contents().first().text().trim();
      return; // Skip to the next sibling.
    }

    // A `.wf-card` node contains one or more `<a>` tags, each representing a match.
    if (el.hasClass('wf-card')) {
      el.find('a.match-item').each((_, matchElement) => {
        const matchEl = $(matchElement);
        
        // 1. Extract match ID and URL
        const url = matchEl.attr('href');
        if (!url) return; // Safety-net: skip when the href is missing.
        const id = url.split('/')[1];

        // 2. Extract the scheduled time label
        const time = matchEl.find('.match-item-time').text().trim();

        // 3. Extract match banner status and ETA (time to start)
        const statusText = matchEl.find('.ml-status').text().trim();
        const status: 'LIVE' | 'Upcoming' = statusText === 'LIVE' ? 'LIVE' : 'Upcoming';
        const eta = status === 'Upcoming' ? matchEl.find('.ml-eta').text().trim() : null;
        
        // 4. Extract team information
        const teamElements = matchEl.find('.match-item-vs-team');
        const teams = teamElements.map((_, teamEl) => {
            const teamNode = $(teamEl);
            
            const name = teamNode.find('.match-item-vs-team-name .text-of').text().trim() || 'TBD';
            
            // Country code is encoded in the flag class (e.g. "flag mod-de")
            const flagClass = teamNode.find('.flag').attr('class') || '';
            const countryCode = flagClass.split(' ').find(c => c.startsWith('mod-'))?.replace('mod-', '') || 'un';
            
            const scoreText = teamNode.find('.match-item-vs-team-score').text().trim();
            // Score is a number when present, otherwise null.
            const score = scoreText === '–' ? null : parseInt(scoreText, 10);
            
            return { name, countryCode, score } as TeamMini;
        }).get();

        // 5. Extract event information (tournament, stage, small icon)
        const eventContainer = matchEl.find('.match-item-event');
        const stage = eventContainer.find('.match-item-event-series').text().trim();
        // The event name is the last text node within the container.
        const eventName = eventContainer.contents().last().text().trim();
        const iconUrl = matchEl.find('.match-item-icon img').attr('src') || '';
        
        const event: EventMini = { name: eventName, stage, iconUrl };

        // 6. Extract Stats / VODs availability badges (order is stable in the markup)
        const vodElements = matchEl.find('.match-item-vod');
        const statsStatus = $(vodElements.get(0)).contents().last().text().trim();
        const vodsStatus = $(vodElements.get(1)).contents().last().text().trim();

        // 7. Build the final object and push it to the array
        matches.push({
          id: id || '',
          url,
          date: currentDate,
          time,
          status,
          eta,
          teams: teams as [TeamMini, TeamMini], // Guaranteed to be a 2-teams tuple
          event,
          statsStatus,
          vodsStatus,
        });
      });
    }
  });

  return matches;
}

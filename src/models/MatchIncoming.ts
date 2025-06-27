/** Raw status banner shown by vlr (“LIVE”, “UPCOMING”). */
type MatchBannerStatus = 'LIVE' | 'Upcoming';

/**
 * Information about a team in a listing row.
 */
export interface TeamMini {
  /** Team display name as seen on vlr. */
  name: string;
  /** Country flag (ISO-3166-1 alpha-2), `"un"` when unknown/TBD. */
  countryCode: string;
  /** Score if the match is live, otherwise `null`. */
  score: number | null;
}

/**
 * Tournament / event information attached to the match.
 */
export interface EventMini {
  /** Full tournament name. */
  name: string;
  /** Bracket or stage – *“Group A - Round 2”*. */
  stage: string;
  /** URL of the small 24×24 icon. */
  iconUrl: string;
}

/* ─────────── Root entity ─────────── */

/**
 * All the structured information scraped from one match card
 * in the upcoming/live list.
 */
export interface MatchIncoming {
  /** Numeric ID extracted from the href. */
  id: string;
  /** Relative href to the match page (kept as-is). */
  url: string;
  /** Localised date label – e.g. “Fri, June 27, 2025”. */
  date: string;
  /** Start time label – e.g. “6:00 PM”. */
  time: string;
  /** “LIVE” or “Upcoming”. */
  status: MatchBannerStatus;
  /** “1h 9m” until start or `null` when live. */
  eta: string | null;
  /** Two contestants, order preserved. */
  teams: [TeamMini, TeamMini];
  /** Event information badge. */
  event: EventMini;
  /** Availability badge for detailed stats (“Pending” / “Soon” / …). */
  statsStatus: string;
  /** Availability badge for VODs. */
  vodsStatus: string;
}

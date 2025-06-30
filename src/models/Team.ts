export interface Player {
  id: string;
  url: string;
  alias: string;
  realName: string | null;
  countryCode: string;
  avatarUrl: string;
  isCaptain: boolean;
}

export interface Staff {
  id: string;
  url: string;
  alias: string;
  realName: string | null;
  countryCode: string;
  avatarUrl: string;
  role: string;
}

export interface RecentMatch {
  id: string;
  url: string;
  opponent: {
    name: string;
    tag: string;
  };
  result: string;
  score: {
    team: number | null;
    opponent: number | null;
  };
  eventName: string;
  eventStage: string;
  date: string;
}

export interface EventPlacement {
  url: string;
  eventName: string;
  placement: string;
  winnings: string | null;
  year: number;
}

export interface NewsArticle {
  url: string;
  title: string;
  date: string;
}

export interface Team {
  id: string;
  url: string;
  name: string;
  tag: string;
  logoUrl: string;
  country: string;
  countryCode: string;
  website: string | null;
  socials: { name: string; url: string }[];
  totalWinnings: string;
  ranking: {
    rank: number;
    region: string;
    rating: number;
    record: {
      wins: number;
      losses: number;
    };
  };
  roster: {
    players: Player[];
    staff: Staff[];
  };
  recentResults: RecentMatch[];
  eventPlacements: EventPlacement[];
  relatedNews: NewsArticle[];
}

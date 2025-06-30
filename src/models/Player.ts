import type { TeamMatch } from './TeamMatch';

export type AgentStatTimespan = '30d' | '60d' | '90d' | 'all';

export interface PlayerAgentStats {
  name: string;
  imageUrl: string;
  use: string;
  rounds: number;
  rating: number;
  acs: number;
  kd: number;
  adr: number;
  kast: number;
  kpr: number;
  apr: number;
  fkpr: number;
  fdpr: number;
  kills: number;
  deaths: number;
  assists: number;
  firstKills: number;
  firstDeaths: number;
}

export interface PlayerTeam {
  id: string;
  url: string;
  name: string;
  logoUrl: string;
  dateRange: string;
  isPast: boolean;
}

export interface PlayerEventPlacement {
  eventName: string;
  eventUrl: string;
  placement: string;
  team: string;
  winnings?: string;
  year: number;
}

export interface PlayerNews {
  title: string;
  url: string;
  date: string;
}

export interface Player {
  id: string;
  url: string;
  alias: string;
  realName: string;
  avatarUrl: string;
  country: {
    name: string;
    code: string;
  };
  socials: {
    name: string;
    url: string;
  }[];
  totalWinnings: string;
  agentStats: {
    timespan: AgentStatTimespan;
    stats: PlayerAgentStats[];
  };
  recentMatches: TeamMatch[];
  teams: PlayerTeam[];
  eventPlacements: PlayerEventPlacement[];
  news: PlayerNews[];
} 

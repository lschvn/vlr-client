import type { EventMini } from "./MatchUpcoming";

export type TeamInfoCompleted = {
  name: string;
  logoUrl: string;
  link: string;
  elo: string;
  score: number;
};

export type PlayerStatValue = {
  all: string;
  attack: string;
  defense: string;
};

export type PlayerStatsCompleted = {
  name: string;
  link: string;
  agents: { iconUrl: string; name: string }[];
  rating: PlayerStatValue;
  acs: PlayerStatValue;
  k: PlayerStatValue;
  d: PlayerStatValue;
  a: PlayerStatValue;
  kdDiff: PlayerStatValue;
  kast: PlayerStatValue;
  adr: PlayerStatValue;
  hsPercent: PlayerStatValue;
  fk: PlayerStatValue;
  fd: PlayerStatValue;
  fkDiff: PlayerStatValue;
};

export type RoundOutcome = 'defuse' | 'elim' | 'boom' | 'time' | 'unknown';

export type Round = {
  roundNum: number;
  winningTeamSide: 't' | 'ct';
  outcome: RoundOutcome;
  outcomeIconUrl: string;
};

export type CompletedMatchMap = {
  name: string;
  duration: string;
  team1Score: number;
  team2Score: number;
  team1SideStats: { attack: number; defense: number };
  team2SideStats: { attack: number; defense: number };
  rounds: Round[];
  team1Stats: PlayerStatsCompleted[];
  team2Stats: PlayerStatsCompleted[];
};

export type PastMatch = {
  opponentName: string;
  opponentLogoUrl: string;
  result: string; // e.g. "1-2"
  link: string;
  date: string;
  win: boolean;
};

export type HeadToHead = {
  result: string; // e.g. "2-1"
  link: string;
  date: string;
  win: boolean;
};

export type CompletedMatch = {
  id: string;
  event: Partial<EventMini>;
  date: string;
  time: string;
  utcTimestamp: string;
  patch: string;
  team1: TeamInfoCompleted;
  team2: TeamInfoCompleted;
  status: 'final';
  bestOf: string;
  streams: { name: string; link: string }[];
  vods: { name: string; link: string }[];
  maps: CompletedMatchMap[];
  head2head: HeadToHead[];
  pastMatchesTeam1: PastMatch[];
  pastMatchesTeam2: PastMatch[];
}; 

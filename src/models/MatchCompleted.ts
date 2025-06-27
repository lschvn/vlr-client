export type VlrTeamInfoCompleted = {
  name: string;
  logoUrl: string;
  link: string;
  elo: string;
  score: number;
};

export type VlrPlayerStatValue = {
  all: string;
  attack: string;
  defense: string;
};

export type VlrPlayerStatsCompleted = {
  name: string;
  link: string;
  agents: { iconUrl: string; name: string }[];
  rating: VlrPlayerStatValue;
  acs: VlrPlayerStatValue;
  k: VlrPlayerStatValue;
  d: VlrPlayerStatValue;
  a: VlrPlayerStatValue;
  kdDiff: VlrPlayerStatValue;
  kast: VlrPlayerStatValue;
  adr: VlrPlayerStatValue;
  hsPercent: VlrPlayerStatValue;
  fk: VlrPlayerStatValue;
  fd: VlrPlayerStatValue;
  fkDiff: VlrPlayerStatValue;
};

export type VlrRoundOutcome = 'defuse' | 'elim' | 'boom' | 'time' | 'unknown';

export type VlrRound = {
  roundNum: number;
  winningTeamSide: 't' | 'ct';
  outcome: VlrRoundOutcome;
  outcomeIconUrl: string;
};

export type VlrCompletedMatchMap = {
  name: string;
  duration: string;
  team1Score: number;
  team2Score: number;
  team1SideStats: { attack: number; defense: number };
  team2SideStats: { attack: number; defense: number };
  rounds: VlrRound[];
  team1Stats: VlrPlayerStatsCompleted[];
  team2Stats: VlrPlayerStatsCompleted[];
};

export type VlrEventInfo = {
  name: string;
  series: string;
  link: string;
  imageUrl: string;
};

export type VlrPastMatch = {
  opponentName: string;
  opponentLogoUrl: string;
  result: string; // e.g. "1-2"
  link: string;
  date: string;
  win: boolean;
};

export type VlrHeadToHead = {
  result: string; // e.g. "2-1"
  link: string;
  date: string;
  win: boolean;
};

export type VlrCompletedMatch = {
  id: string;
  event: VlrEventInfo;
  date: string;
  time: string;
  utcTimestamp: string;
  patch: string;
  team1: VlrTeamInfoCompleted;
  team2: VlrTeamInfoCompleted;
  status: 'final';
  bestOf: string;
  streams: { name: string; link: string }[];
  vods: { name: string; link: string }[];
  maps: VlrCompletedMatchMap[];
  head2head: VlrHeadToHead[];
  pastMatchesTeam1: VlrPastMatch[];
  pastMatchesTeam2: VlrPastMatch[];
}; 

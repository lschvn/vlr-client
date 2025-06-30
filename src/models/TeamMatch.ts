export interface TeamMatchGame {
  map: string;
  url: string;
  result: {
    own: number;
    opponent: number;
    status: 'win' | 'loss';
  };
  agentCompositions: {
    own: { name: string; imageUrl: string }[];
    opponent: { name: string; imageUrl: string }[];
  };
}

export interface TeamMatch {
  id: string;
  url: string;
  event: {
    name: string;
    stage: string;
    iconUrl?: string;
  };
  opponent: {
    id?: string;
    name: string;
    tag: string;
    logoUrl?: string;
  };
  result: {
    own: number;
    opponent: number;
    status: 'win' | 'loss' | 'draw';
  };
  vods: string[];
  date: string;
  games: TeamMatchGame[];
  status: 'upcoming' | 'completed';
} 

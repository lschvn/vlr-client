export type SearchCategory = 'all' | 'teams' | 'players' | 'events' | 'series';

export interface SearchResult {
  id: string;
  url: string;
  name: string;
  imageUrl?: string;
  description?: string;
  type: 'team' | 'player' | 'event' | 'series';
} 

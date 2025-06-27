import type { CheerioAPI } from 'cheerio';
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

  // ... existing code ...
}
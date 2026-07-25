# VLR Client

A simple, and lightweight TypeScript scraper for [VLR.gg](https://www.vlr.gg/), providing structured data for matches, teams, and players.

## Features

-   Get upcoming and live matches
-   Get completed match details
-   Get team details, match history, and transactions
-   Get player profiles, stats, and history
-   Search for teams, players, and events
-   Built-in in-memory caching

## Installation

```bash
npm install vlr-client
```
_Note: This package is not yet published to npm. This is a placeholder._

## API Reference

All methods are available through the `VlrClient` instance.

```typescript
import { VlrClient } from 'vlr-client';

const vlr = new VlrClient();
```

### Matches

#### `getUpcomingMatches(): Promise<Envelope<MatchUpcoming[]>>`

Retrieve the list of matches that are either *live* or *upcoming*.

```typescript
const { data: upcomingMatches } = await vlr.getUpcomingMatches();
console.log(upcomingMatches);
```

#### `getLiveMatches(): Promise<Envelope<MatchUpcoming[]>>`

Retrieve only the matches currently *live* (short cache TTL, since vlr.gg updates scores on page refresh only).

```typescript
const { data: liveMatches } = await vlr.getLiveMatches();
console.log(liveMatches);
```

#### `getMatchById(matchId: string): Promise<Envelope<Match | null>>`

Retrieve the details of a match whatever its status (`upcoming`, `live` or `completed`). For live matches this includes the current series score and the rounds played so far.

```typescript
const { data: match } = await vlr.getMatchById('123456');
console.log(match?.status, match?.team1.score, match?.team2.score);
```

#### `getCompletedMatch(matchId: string): Promise<Envelope<CompletedMatch | null>>`

Retrieve the details of a completed match. Returns `null` if the match is not finished yet (use `getMatchById` for live/upcoming matches).

```typescript
const { data: match } = await vlr.getCompletedMatch('123456');
console.log(match);
```

### Teams

#### `getTeamById(id: string): Promise<Envelope<Team | null>>`

Retrieve the details of a team by its ID.

```typescript
const { data: team } = await vlr.getTeamById('8877'); // Karmine Corp
console.log(team);
```

#### `getTeamMatches(teamId: string): Promise<Envelope<TeamMatch[]>>`

Retrieve the full match history for a team. This method handles pagination automatically.

```typescript
const { data: teamMatches } = await vlr.getTeamMatches('8877');
console.log(teamMatches);
```

#### `getTeamTransactions(teamId: string): Promise<Envelope<TeamTransaction[]>>`

Retrieve the transaction history (e.g., player joins/leaves) for a team.

```typescript
const { data: transactions } = await vlr.getTeamTransactions('8877');
console.log(transactions);
```

### Players

#### `getPlayerById(playerId: string): Promise<Envelope<Player | null>>`

Retrieve the details, stats, and history for a specific player.

```typescript
const { data: player } = await vlr.getPlayerById('5654'); // Avez
console.log(player);
```

## Contributing

This is a community-driven project, and contributions are highly welcome! Whether it's a bug report, a feature request, or a pull request, please feel free to get involved.

If you have any feedback or ideas, please open an issue to start a discussion.

## License

This project is licensed under the MIT License.

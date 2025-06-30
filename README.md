# VLR.gg Unofficial API

A simple, and lightweight TypeScript scraper for [VLR.gg](https://www.vlr.gg/), providing structured data for matches, teams, and players.

## Features

-   Get upcoming and live matches
-   Get completed match details
-   Get team details, match history, and transactions
-   Get player profiles, stats, and history
-   Search for teams, players, and events
-   Built-in in-memory caching
-   No external dependencies

## Installation

```bash
npm install vlr-gg-api
```
_Note: This package is not yet published to npm. This is a placeholder._

## API Reference

All methods are available through the `VlrClient` instance.

```typescript
import { VlrClient } from 'vlr-gg-api';

const vlr = new VlrClient();
```

### Matches

#### `getIncomingMatches(): Promise<Envelope<MatchUpcoming[]>>`

Retrieve the list of matches that are either *live* or *upcoming*.

```typescript
const { data: upcomingMatches } = await vlr.getIncomingMatches();
console.log(upcomingMatches);
```

#### `getCompletedMatch(matchId: string): Promise<Envelope<CompletedMatch | null>>`

Retrieve the details of a completed match.

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

### Search

#### `search(query: string, category?: SearchCategory): Promise<Envelope<SearchResult[]>>`

Search for teams, players, or events. The `category` parameter is optional and can be one of `'all'`, `'teams'`, `'players'`, `'events'`, `'series'`.

```typescript
const { data: searchResults } = await vlr.search('Karmine Corp', 'teams');
console.log(searchResults);
```

## Contributing

This is a community-driven project, and contributions are highly welcome! Whether it's a bug report, a feature request, or a pull request, please feel free to get involved.

If you have any feedback or ideas, please open an issue to start a discussion.

## License

This project is licensed under the MIT License.

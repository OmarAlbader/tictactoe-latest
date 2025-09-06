export default `#graphql
  type Player {
    _id: ID!
    username: String!
    stats: PlayerStats!
    isOnline: Boolean!
    isPlaying: Boolean!
    createdAt: String!
    lastSeenAt: String!
  }

  type PlayerStats {
    wins: Int!
    loses: Int!
    draws: Int!
    totalGames: Int!
  }

  type PlayerMapEntry {
    player: String!
    symbol: String!
  }

  type Game {
    _id: ID!
    players: [String!]!
    spectators: [String!]!
    board: [String!]!
    currentPlayer: String!
    playerMap: [PlayerMapEntry!]!
    status: String!
    winner: String
    createdAt: String!
    updatedAt: String!
  }

  type GameRequest {
    _id: ID!
    gameId: ID
    fromPlayer: String!
    toPlayer: String!
    status: String!
    createdAt: String!
  }

  type Move {
    gameId: ID!
    index: Int!
    username: String!
  }

  type Query {
    getGame(id: ID!): Game
    getPlayer(username: String!): Player
    getPlayers: [Player!]!
    getGameRequest(username: String!): [GameRequest!]!
  }

  type Mutation {
    createPlayer(username: String!): Player!
    markPlayerOnline(username: String!): Player!
    markPlayerOffline(username: String!): Player!
    sendGameRequest(fromPlayer: String!, toPlayer: String!): GameRequest!
    respondToGameRequest(requestId: ID!, response: String!): GameRequest!
    makeMove(gameId: ID!, index: Int!, username: String!): Move!
  }

  type Subscription {
    gameRequestReceived(username: String!): GameRequest!
    gameRequestResponded(username: String!): GameRequest!
    gameRequestAccepted(username: String!): Game!
    moveMade(gameId: ID!): Move!
    playerChanged: Player!
  }
`;

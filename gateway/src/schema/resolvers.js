import fetch from "node-fetch";
import pubsub from "./pubsub.js";

const MOVE_MADE = "MOVE_MADE";
const GAME_REQUEST_RECEIVED = "GAME_REQUEST_RECEIVED";
const GAME_REQUEST_RESPONDED = "GAME_REQUEST_RESPONDED";
const GAME_REQUEST_ACCEPTED = "GAME_REQUEST_ACCEPTED";
const PLAYERS_CHANGED = "PLAYERS_CHANGED";

const REST_ENDPOINTS = {
  player: "http://localhost:4001/players",
  game: "http://localhost:4002/games",
  gameRequest: "http://localhost:4003/gameRequest",
};

export default {
  Query: {
    getPlayers: async () => {
      const res = await fetch(`${REST_ENDPOINTS.player}`);
      const data = await res.json();

      return data.allPlayers || [];
    },
    getPlayer: async (_, { username }) => {
      const res = await fetch(`${REST_ENDPOINTS.player}/${username}`);
      const player = await res.json();

      if (!player || !player._id || !player.username) {
        throw new Error("Player not found.");
      }

      return player;
    },
    getGame: async (_, { id }) => {
      const res = await fetch(`${REST_ENDPOINTS.game}/${id}`);
      return await res.json();
    },
    getGameRequest: async (_, { username }) => {
      const res = await fetch(`${REST_ENDPOINTS.gameRequest}/${username}`);
      return await res.json();
    },
  },

  Mutation: {
    createPlayer: async (_, { username }) => {
      const res = await fetch(`${REST_ENDPOINTS.player}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });

      const createdPlayer = await res.json();

      if (!res.ok) {
        throw new Error(createdPlayer.error || "Failed to create player.");
      }

      return createdPlayer;
    },
    markPlayerOnline: async (_, { username }) => {
      try {
        const res = await fetch(
          `${REST_ENDPOINTS.player}/mark-online/${username}`,
          {
            method: "PATCH",
          }
        );

        const savedPlayer = await res.json();

        pubsub.publish(`${PLAYERS_CHANGED}`, {
          playerChanged: savedPlayer,
        });

        return savedPlayer;
      } catch (error) {
        return { ERROR: error.message };
      }
    },
    markPlayerOffline: async (_, { username }) => {
      try {
        const res = await fetch(
          `${REST_ENDPOINTS.player}/mark-offline/${username}`,
          {
            method: "PATCH",
          }
        );

        const savedPlayer = await res.json();

        pubsub.publish(`${PLAYERS_CHANGED}`, {
          playerChanged: savedPlayer,
        });

        return savedPlayer;
      } catch (error) {
        return { ERROR: error.message };
      }
    },

    sendGameRequest: async (_, { fromPlayer, toPlayer }) => {
      try {
        const res = await fetch(
          `${REST_ENDPOINTS.gameRequest}/send-game-request`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fromPlayer, toPlayer }),
          }
        );

        const savedRequest = await res.json();

        if (!res.ok && savedRequest.error) {
          return new Error(savedRequest.error);
        }

        pubsub.publish(`${GAME_REQUEST_RECEIVED}_${toPlayer}`, {
          gameRequestReceived: savedRequest,
        });

        return savedRequest;
      } catch (error) {
        return { error: error.message };
      }
    },

    respondToGameRequest: async (_, { requestId, response }) => {
      try {
        const res = await fetch(
          `${REST_ENDPOINTS.gameRequest}/respond-game-request`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              requestId,
              response,
            }),
          }
        );

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`REST error: ${res.status} ${text}`);
        }

        const gameRequest = await res.json();

        if (response === "rejected") {
          pubsub.publish(
            `${GAME_REQUEST_RESPONDED}_${gameRequest.fromPlayer}`,
            {
              gameRequestResponded: gameRequest,
            }
          );

          return gameRequest;
        }

        const gameRes = await fetch(
          `${REST_ENDPOINTS.game}/${gameRequest.gameId}`
        );

        if (!gameRes.ok) {
          const text = await gameRes.text();
          throw new Error(`REST error: ${gameRes.status} ${text}`);
        }

        const gameData = await gameRes.json();

        if (response === "accepted") {
          pubsub.publish(`${GAME_REQUEST_ACCEPTED}_${gameRequest.fromPlayer}`, {
            gameRequestAccepted: gameData,
          });

          pubsub.publish(`${GAME_REQUEST_ACCEPTED}_${gameRequest.toPlayer}`, {
            gameRequestAccepted: gameData,
          });

          return gameRequest;
        }

        pubsub.publish(`${GAME_REQUEST_RESPONDED}_${gameRequest.fromPlayer}`, {
          gameRequestResponded: gameRequest,
        });

        return gameRequest;
      } catch (error) {
        throw new Error(error.message || "Failed to respond to game request.");
      }
    },

    makeMove: async (_, { gameId, index, username }) => {
      const res = await fetch(`${REST_ENDPOINTS.game}/make-move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId,
          index,
          username,
        }),
      });

      const movePayload = await res.json();

      pubsub.publish(`${MOVE_MADE}_${gameId}`, {
        moveMade: movePayload,
      });

      return movePayload;
    },
  },

  Subscription: {
    moveMade: {
      subscribe: (_, { gameId }) => {
        return pubsub.asyncIterableIterator(`${MOVE_MADE}_${gameId}`);
      },
    },
    gameRequestReceived: {
      subscribe: (_, { username }) => {
        return pubsub.asyncIterableIterator(
          `${GAME_REQUEST_RECEIVED}_${username}`
        );
      },
    },
    gameRequestResponded: {
      subscribe: (_, { username }) => {
        return pubsub.asyncIterableIterator(
          `${GAME_REQUEST_RESPONDED}_${username}`
        );
      },
    },
    gameRequestAccepted: {
      subscribe: (_, { username }) => {
        return pubsub.asyncIterableIterator(
          `${GAME_REQUEST_ACCEPTED}_${username}`
        );
      },
    },
    playerChanged: {
      subscribe: () => {
        return pubsub.asyncIterableIterator(`${PLAYERS_CHANGED}`);
      },
    },
  },

  Game: {
    playerMap: (game) => {
      // If playerMap is a Map, convert to array of { player, symbol }
      if (!game.playerMap) return [];
      // If it's a Map object (from Mongo), convert to JS object
      const entries =
        typeof game.playerMap.entries === "function"
          ? Array.from(game.playerMap.entries())
          : Object.entries(game.playerMap);
      return entries.map(([player, symbol]) => ({
        player,
        symbol,
      }));
    },
  },
};

// function checkWinner(board) {
//   const lines = [
//     [0, 1, 2],
//     [3, 4, 5],
//     [6, 7, 8],
//     [0, 3, 6],
//     [1, 4, 7],
//     [2, 5, 8],
//     [0, 4, 8],
//     [2, 4, 6],
//   ];

//   for (const line of lines) {
//     const [a, b, c] = line;

//     if (board[a] && board[a] === board[b] && board[a] === board[c]) {
//       return board[a];
//     }
//   }

//   return null;
// }

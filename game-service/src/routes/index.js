import express from "express";
import { produceGameEvent } from "../kafka/producer.js";
import Game from "../models/Game.js";
import pubsub from "../schema/pubsub.js";

const MOVE_MADE = "MOVE_MADE";

const router = express.Router();

router.get("/", async (_, res) => {
  const allGames = await Game.find({});

  if (!allGames) {
    return res.status(400).json({ error: "Username does not exist." });
  }

  return res.json(allGames);
});

router.get("/:id", async (req, res) => {
  const { id } = req.params;
  const selectedGame = await Game.findById(id);

  if (!selectedGame) return res.send("No games found");

  return res.json(selectedGame);
});

router.post("/", async (req, res) => {
  const { fromPlayer, toPlayer } = req.body;

  if (!fromPlayer || !toPlayer)
    return res
      .status(400)
      .json({ error: "both fromPlayer and toPlayer should be provided" });

  const currentPlayer = [fromPlayer, toPlayer][Math.floor(Math.random() * 2)];

  const game = new Game({
    players: [fromPlayer, toPlayer],
    board: Array(9).fill(""),
    currentPlayer,
    playerMap: {
      [fromPlayer]: "O",
      [toPlayer]: "X",
    },
    status: "ONGOING",
  });

  const savedGame = await game.save();

  // pubsub.publish(`${GAME_REQUEST_ACCEPTED}_${fromPlayer}`, {
  //   gameRequestAccepted: savedGame,
  // });

  // pubsub.publish(`${GAME_REQUEST_ACCEPTED}_${toPlayer}`, {
  //   gameRequestAccepted: savedGame,
  // });

  await produceGameEvent({
    type: "GAME_CREATED",
    gameId: savedGame.id,
    players: savedGame.players,
    timestamp: new Date().toISOString(),
  });

  return res.send(savedGame);
});

router.post("/make-move", async (req, res) => {
  const { gameId, index, username } = req.body;

  const game = await Game.findById(gameId);

  if (game.board[index] || game.currentPlayer !== username)
    return res.status(400).json({ error: "Invalid move" });

  game.board[index] = game.playerMap.get(username);
  game.currentPlayer = game.players.find((p) => p !== username);

  const winner = checkWinner(game.board);
  const isDraw = !winner && game.board.every((cell) => cell !== "");

  if (winner || isDraw) {
    game.status = "FINISHED";
    if (winner) {
      game.winner =
        Array.from(game.playerMap.entries()).find(
          ([_, symbol]) => symbol === winner
        )[0] || null;
    } else game.winner = null;
    game.isDraw = isDraw;

    // TODO: call player api updatePlayerStatus
    await produceGameEvent({
      type: "GAME_FINISHED",
      gameId,
      players: game.players,
      timestamp: new Date().toISOString(),
    });
  }

  await game.save();

  const movePayload = { gameId, index, username };

  pubsub.publish(`${MOVE_MADE}_${gameId}`, {
    moveMade: movePayload,
  });

  await produceGameEvent({
    type: "MOVE_MADE",
    gameId,
    index,
    username,
    timestamp: new Date().toISOString(),
  });

  return res.send(movePayload);
});

function checkWinner(board) {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];

  for (const line of lines) {
    const [a, b, c] = line;

    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }

  return null;
}

export default router;

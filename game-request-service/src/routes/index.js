import express from "express";
import {
  produceGameEvent,
  produceGameRequestEvent,
} from "../kafka/producer.js";
import GameRequest from "../models/GameRequest.js";
import pubsub from "../schema/pubsub.js";

const gameServiceApi = "http://localhost:4002/games";

const GAME_REQUEST_RECEIVED = "GAME_REQUEST_RECEIVED";
const GAME_REQUEST_RESPONDED = "GAME_REQUEST_RESPONDED";
const GAME_REQUEST_ACCEPTED = "GAME_REQUEST_ACCEPTED";

const router = express.Router();

router.get("/:username", async (req, res) => {
  const { username } = req.params;

  const gameReq = await GameRequest.findOne({
    toPlayer: username,
    status: "pending",
  });

  if (!gameReq)
    return res.status(400).json({ error: "Game request does not found." });

  return res.json(gameReq);
});

router.post("/send-game-request", async (req, res) => {
  const { fromPlayer, toPlayer } = req.body;

  try {
    const existingRequest = await GameRequest.findOne({
      fromPlayer,
      toPlayer,
      status: "pending",
    });

    if (existingRequest) {
      return res
        .status(400)
        .json({ error: "Game request already sent to this player." });
    }

    const gameRequest = new GameRequest({
      fromPlayer,
      toPlayer,
      status: "pending",
    });

    const savedRequest = await gameRequest.save();

    await produceGameRequestEvent({
      type: "REQUEST_SENT",
      requestId: savedRequest.id,
      fromPlayer,
      toPlayer,
      timestamp: new Date().toISOString(),
    });

    return res.send(savedRequest);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/respond-game-request", async (req, res) => {
  const { requestId, response } = req.body;

  try {
    const gameRequest = await GameRequest.findById(requestId);
    if (!gameRequest) {
      return res.status(400).json({ error: "Game request not found." });
    }

    gameRequest.status = response; // 'accepted' or 'rejected'

    if (response === "accepted") {
      // Create game via game service
      const gameRes = await fetch(`${gameServiceApi}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromPlayer: gameRequest.fromPlayer,
          toPlayer: gameRequest.toPlayer,
        }),
      });

      if (!gameRes.ok) {
        const text = await gameRes.text();
        return res
          .status(500)
          .json({ error: `Failed to create game: ${text}` });
      }

      const savedGame = await gameRes.json();
      gameRequest.gameId = savedGame._id;

      pubsub.publish(`${GAME_REQUEST_ACCEPTED}_${gameRequest.fromPlayer}`, {
        gameRequestAccepted: savedGame,
      });

      pubsub.publish(`${GAME_REQUEST_ACCEPTED}_${gameRequest.toPlayer}`, {
        gameRequestAccepted: savedGame,
      });

      await produceGameRequestEvent({
        type: "REQUEST_ACCEPTED",
        requestId,
        gameId: savedGame._id,
        fromPlayer: gameRequest.fromPlayer,
        toPlayer: gameRequest.toPlayer,
        timestamp: new Date().toISOString(),
      });

      await produceGameEvent({
        type: "GAME_CREATED",
        gameId: savedGame._id,
        players: savedGame.players,
        timestamp: new Date().toISOString(),
      });
    } else {
      await produceGameRequestEvent({
        type: "REQUEST_REJECTED",
        requestId,
        fromPlayer: gameRequest.fromPlayer,
        toPlayer: gameRequest.toPlayer,
        timestamp: new Date().toISOString(),
      });

      // Send a clear rejection response
      const updatedRequest = await gameRequest.save();

      pubsub.publish(`${GAME_REQUEST_RESPONDED}_${gameRequest.fromPlayer}`, {
        gameRequestResponded: {
          ...updatedRequest.toObject(),
          message: "rejected your game request",
        },
      });

      return res.json({
        ...updatedRequest.toObject(),
        message: "rejected your game request",
      });
    }

    const updatedRequest = await gameRequest.save();

    pubsub.publish(`${GAME_REQUEST_RESPONDED}_${gameRequest.fromPlayer}`, {
      gameRequestResponded: updatedRequest,
    });

    return res.json(updatedRequest);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

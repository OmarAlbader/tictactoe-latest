import express from "express";
import { producePlayerEvent } from "../kafka/producer.js";
import Player from "../models/Player.js";

const router = express.Router();

router.get("/", async (req, res) => {
  const allPlayers = await Player.find({});

  if (!allPlayers) {
    return res.status(400).json({ error: "Username does not exist." });
  }

  res.json({ allPlayers });
});

router.get("/online", async (_, res) => {
  const onlinePlayers = await Player.find({ isOnline: true });

  if (!onlinePlayers) return res.send("No online players found");

  return res.json(onlinePlayers);
});

router.get("/:username", async (req, res) => {
  const username = req.params.username;
  const player = await Player.findOne({ username });

  if (!player) {
    return res.status(400).json({ error: "Username does not exist." });
  }

  res.json(player);
});

router.post("/", async (req, res) => {
  const { username } = req.body;

  if (!username) {
    console.log("Username is required.");
    return res.status(400).json({ error: "Username is required." });
  }

  const isExistedPlayer = await Player.findOne({ username });

  if (isExistedPlayer) {
    return res.status(400).json({ error: "Username already exists." });
  }

  const newPlayer = new Player({
    username,
    isOnline: true,
  });

  const savedPlayer = await newPlayer.save();

  await producePlayerEvent({
    type: "PLAYER_CREATED",
    username: savedPlayer.username,
    timestamp: new Date().toISOString(),
  });

  return res.json(newPlayer);
});

router.patch("/mark-online/:username", async (req, res) => {
  const { username } = req.params;

  try {
    const player = await Player.findOneAndUpdate({ username });

    if (!player) {
      return res.status(400).json({ error: error.message });
    }

    player.isOnline = true;

    const savedPlayer = await player.save();

    await producePlayerEvent({
      type: "PLAYER_ONLINE",
      username: savedPlayer.username,
      timestamp: new Date().toISOString(),
    });

    return res.send(savedPlayer);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

router.patch("/mark-offline/:username", async (req, res) => {
  const { username } = req.params;

  try {
    const player = await Player.findOneAndUpdate({ username });

    if (!player) {
      return res.status(400).json({ error: error.message });
    }

    player.isOnline = false;

    const savedPlayer = await player.save();

    await producePlayerEvent({
      type: "PLAYER_OFFLINE",
      username: savedPlayer.username,
      timestamp: new Date().toISOString(),
    });

    return res.send(savedPlayer);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

export default router;

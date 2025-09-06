import { Kafka } from "kafkajs";
import { config } from "../config/environment.js";
import Player from "../models/Player.js";

const kafka = new Kafka({
  clientId: "player-service",
  brokers: config.KAFKA_BROKERS,
});

const consumer = kafka.consumer({ groupId: "player-service-group" });

const handlePlayerEvent = async (event) => {
  console.log("👤 Processing player event:", event.type);

  switch (event.type) {
    case "PLAYER_CREATED":
      await Player.create({
        username: event.username,
        isOnline: true,
        lastSeenAt: new Date(),
      });
      break;

    case "PLAYER_ONLINE":
      await Player.findOneAndUpdate(
        { user: event.username },
        { isOnline: true, lastSeenAt: new Date() }
      );
      break;

    case "PLAYER_OFFLINE":
      await Player.findOneAndUpdate(
        { username: event.username },
        { isOnline: false, lastSeenAt: new Date() }
      );
      break;

    case "PLAYER_STATS_CHANGED":
      await Player.findOneAndUpdate(
        {
          username: event.username,
        },
        {
          $inc: {
            "stats.totalGames": 1,
            [event.username === event.game.winner
              ? "stats.wins"
              : "stats.loses"]: 1,
          },
          lastSeenAt: event.timestamp ?? new Date(),
        }
      );
      break;

    case "GAME_CREATED":
      await updatePlayerStatus(event.players, true);
      break;

    case "GAME_FINISHED":
      await updatePlayerStatus(event.players, false);
      await updatePlayerStats(event);
      break;

    default:
      console.log("❓ Unknown player event type:", event.type);
  }
};

const updatePlayerStatus = async (players, isPlaying) => {
  await Player.updateMany({ username: { $in: players } }, { isPlaying });
};

const updatePlayerStats = async (gameEvent) => {
  if (gameEvent.players) {
    if (gameEvent.winner) {
      await Player.findOneAndUpdate(
        { username: gameEvent.winner },
        {
          $inc: {
            "stats.wins": 1,
            "stats.totalGames": 1,
          },
        }
      );

      const loser = gameEvent.players.find((p) => p !== gameEvent.winner);

      if (loser) {
        await Player.findOneAndUpdate(
          { username: loser },
          {
            $inc: {
              "stats.loses": 1,
              "stats.totalGames": 1,
            },
          }
        );
      }
    } else if (gameEvent.isDraw) {
      await Player.updateMany(
        { username: { $in: gameEvent.players } },
        {
          $inc: {
            "stats.draws": 1,
            "stats.totalGames": 1,
          },
        }
      );
    }
  } else {
    throw new Error("No players found for this game.");
  }
};

export const startPlayerConsumer = async () => {
  try {
    await consumer.connect();
    console.log("✅ Kafka consumer connected");

    await consumer.subscribe({
      topic: "player-events",
      fromBeginning: false,
    });

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          if (!message.value) {
            console.error("❌ Received message with null value");
            return;
          }
          const event = JSON.parse(message.value.toString());
          console.log(`📥 Received event from topic '${topic}':`, event.type);

          switch (topic) {
            case "player-events":
              await handlePlayerEvent(event);
              break;

            default:
              console.log("❓ Unknown topic:", topic);
          }
        } catch (error) {
          console.error("❌ Error processing Kafka message:", error);
        }
      },
    });
  } catch (error) {
    console.error("❌ Error starting Kafka consumer:", error);
  }
};

export const stopConsumer = async () => {
  await consumer.disconnect();
  console.log("🔌 Kafka consumer disconnected");
};

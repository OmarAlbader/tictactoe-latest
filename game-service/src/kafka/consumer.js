import { Kafka } from "kafkajs";
import { config } from "../config/environment.js";
import Game from "../models/Game.js";
import pubsub from "../schema/pubsub.js";

const kafka = new Kafka({
  clientId: "game-service",
  brokers: config.KAFKA_BROKERS,
});

const consumer = kafka.consumer({ groupId: "game-service-group" });

const handleGameEvent = async (event) => {
  console.log("🎮 Processing game event:", event.type);

  switch (event.type) {
    case "MOVE_MADE":
      pubsub.publish(`MOVE_MADE_${event.gameId}`, {
        moveMade: event,
      });

      // await updateGameAnalytics(event);
      break;

    case "GAME_CREATED":
      console.log("GAME_CREATED");
      await updatePlayerStatus(event.players, true);
      break;

    case "GAME_FINISHED":
      console.log("GAME_FINISHED");
      await updatePlayerStatus(event.players, false);
      await updatePlayerStats(event);
      break;

    default:
      console.log("❓ Unknown game event type:", event.type);
  }
};

const updatePlayerStatus = async (players, isPlaying) => {
  await Game.updateMany({ username: { $in: players } }, { isPlaying });
};

const updatePlayerStats = async (gameEvent) => {
  console.log("Game Event:", gameEvent);
  if (gameEvent.players) {
    if (gameEvent.winner) {
      await Game.findOneAndUpdate(
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
        await Game.findOneAndUpdate(
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
      await Game.updateMany(
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

export const startGameConsumer = async () => {
  try {
    await consumer.connect();
    console.log("✅ Kafka consumer connected");

    await consumer.subscribe({
      topic: "game-events",
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
            case "game-events":
              await handleGameEvent(event);
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

(async () => {
  await consumer.connect();
  await consumer.subscribe({
    topic: "game-events",
    fromBeginning: false,
  });

  await consumer.run({
    eachMessage: async ({ message }) => {
      const move = JSON.parse(message.value.toString());
      pubsub.publish(`MOVE_MADE_${move.gameId}`, { moveMade: move });
    },
  });
})();

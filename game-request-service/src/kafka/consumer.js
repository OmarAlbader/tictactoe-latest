import { Kafka } from "kafkajs";
import { config } from "../config/environment.js";
// import pubsub from "../schema/pubsub.js";

const kafka = new Kafka({
  clientId: "game-request-service",
  brokers: config.KAFKA_BROKERS,
});

const consumer = kafka.consumer({ groupId: "game-request-service-group" });

const handleGameRequestEvent = async (event) => {
  console.log("🤝 Processing game request event:", event.type);

  switch (event.type) {
    case "REQUEST_SENT":
      // Log analytics or send notifications
      break;

    case "REQUEST_ACCEPTED":
      // Create game lobby or room
      break;

    case "REQUEST_REJECTED":
      // Log analytics
      break;

    default:
      console.log("❓ Unknown game request event type:", event.type);
  }
};

// const updatePlayerStatus = async (players, isPlaying) => {
//   await Game.updateMany({ username: { $in: players } }, { isPlaying });
// };

// const updatePlayerStats = async (gameEvent) => {
//   if (gameEvent.players) {
//     if (gameEvent.winner) {
//       await Game.findOneAndUpdate(
//         { username: gameEvent.winner },
//         {
//           $inc: {
//             "stats.wins": 1,
//             "stats.totalGames": 1,
//           },
//         }
//       );

//       const loser = gameEvent.players.find((p) => p !== gameEvent.winner);

//       if (loser) {
//         await Game.findOneAndUpdate(
//           { username: loser },
//           {
//             $inc: {
//               "stats.loses": 1,
//               "stats.totalGames": 1,
//             },
//           }
//         );
//       }
//     } else if (gameEvent.isDraw) {
//       await Game.updateMany(
//         { username: { $in: gameEvent.players } },
//         {
//           $inc: {
//             "stats.draws": 1,
//             "stats.totalGames": 1,
//           },
//         }
//       );
//     }
//   } else {
//     throw new Error("No players found for this game.");
//   }
// };

export const startGameRequestConsumer = async () => {
  try {
    await consumer.connect();
    console.log("✅ Kafka consumer connected");

    await consumer.subscribe({
      topic: "game-request-events",
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
            case "game-request-events":
              await handleGameRequestEvent(event);
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

// (async () => {
//   await consumer.connect();
//   await consumer.subscribe({
//     topic: "game-events",
//     fromBeginning: false,
//   });

//   await consumer.run({
//     eachMessage: async ({ message }) => {
//       const move = JSON.parse(message.value.toString());
//       pubsub.publish(`MOVE_MADE_${move.gameId}`, { moveMade: move });
//     },
//   });
// })();

import { Kafka } from "kafkajs";
import { config } from "../config/environment.js";

const kafka = new Kafka({
  clientId: "game-service",
  brokers: config.KAFKA_BROKERS,
});

const producer = kafka.producer();

let isConnected = false;

const connectProducer = async () => {
  if (!isConnected) {
    try {
      await producer.connect();
      isConnected = true;
      console.log("✅ Kafka producer connected");
    } catch (error) {
      console.error("❌ Error connecting to Kafka producer:", error);
      throw error;
    }
  }
};

(async () => {
  await connectProducer();
})();

const produceEvent = async (topic, event) => {
  try {
    await connectProducer();

    await producer.send({
      topic,
      messages: [
        {
          key: event.gameId,
          value: JSON.stringify({
            ...event,
            timestamp: event.timestamp ?? new Date().toISOString(),
          }),
          headers: {
            eventType: event.type,
            source: "game-service",
          },
        },
      ],
    });

    console.log(`📤 Event sent to Kafka topic '${topic}':`, event.type);
  } catch (error) {
    console.error(`❌ Error sending event to Kafka topic '${topic}':`, error);
    throw error;
  }
};

export const produceGameEvent = async (event) => {
  await produceEvent("game-events", event);
};

export const disconnectProducer = async () => {
  if (isConnected) {
    await producer.disconnect();
    isConnected = false;
    console.log("🔌 Kafka producer disconnected");
  }
};

import dotenv from "dotenv";

dotenv.config();

export const config = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: parseInt(process.env.PORT || "4001"),
  MONGODB_URI:
    process.env.MONGODB_URI ||
    "mongodb://root:password@localhost:27018/tic-tac-toe?authSource=admin",
  KAFKA_BROKERS: process.env.KAFKA_BROKERS?.split(",") || ["localhost:9092"],
  CORS_ORIGIN: process.env.CORS_ORIGIN || "http://localhost:5173",

  KAFKA_CLIENT_ID: process.env.KAFKA_CLIENT_ID || "player-service",
  KAFKA_GROUP_ID: process.env.KAFKA_GROUP_ID || "player-service-group",

  KAFKA_TOPICS: {
    PLAYER_EVENTS: "player-events",
  },
};

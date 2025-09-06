import dotenv from "dotenv";

dotenv.config();

export const config = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: parseInt(process.env.PORT || "4000"),
  MONGODB_URI:
    process.env.MONGODB_URI ||
    "mongodb://root:password@localhost:27018/tic-tac-toe?authSource=admin",
  KAFKA_BROKERS: process.env.KAFKA_BROKERS?.split(",") || ["localhost:9092"],
  CORS_ORIGIN: process.env.CORS_ORIGIN || "http://localhost:5173",

  KAFKA_CLIENT_ID: process.env.KAFKA_CLIENT_ID || "tic-tac-toe-game",
  KAFKA_GROUP_ID: process.env.KAFKA_GROUP_ID || "tic-tac-toe-group",

  KAFKA_TOPICS: {
    GAME_EVENTS: "game-events",
    PLAYER_EVENTS: "player-events",
    GAME_REQUEST_EVENTS: "game-request-events",
  },
};

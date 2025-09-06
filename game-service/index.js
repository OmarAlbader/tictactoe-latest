import express from "express";
import mongoose from "mongoose";
import { config } from "./src/config/environment.js";
import gameRouter from "./src/routes/index.js";
import { startGameConsumer } from "./src/kafka/consumer.js";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

mongoose
  .connect(config.MONGODB_URI, {
    dbName: "tic-tac-toe",
  })
  .then(() => {
    console.log("✅ Database connected successfully");
  })
  .catch((err) => {
    console.error("❌ Database connection failed:", err);
  });

app.use("/games", gameRouter);

app.get("/", (_, res) => {
  res.json("game-service is running");
});

const PORT = config.PORT || 4002;

app.listen(PORT, () => {
  console.log(
    "✅ Player Service is successfully running on http://localhost:4002"
  );
  startGameConsumer();
});

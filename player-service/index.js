import express from "express";
import { config } from "./src/config/environment.js";
import playerRouter from "./src/routes/index.js";
import mongoose from "mongoose";
import { startPlayerConsumer } from "./src/kafka/consumer.js";

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

app.use("/players", playerRouter);

app.get("/", (_, res) => {
  res.json("player-service is running");
});

const PORT = config.PORT || 4001;

app.listen(PORT, () => {
  console.log(
    "✅ Player Service is successfully running on http://localhost:4001"
  );
  startPlayerConsumer();
});

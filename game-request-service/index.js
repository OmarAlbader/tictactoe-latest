import express from "express";
import mongoose from "mongoose";
import { config } from "./src/config/environment.js";
import { startGameRequestConsumer } from "./src/kafka/consumer.js";
import gameRequestRouter from "./src/routes/index.js";

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

app.use("/gameRequest", gameRequestRouter);

app.get("/", (_, res) => {
  res.json("game-request-service is running");
});

const PORT = config.PORT || 4003;

app.listen(PORT, () => {
  console.log(
    "✅ Game Request Service is successfully running on http://localhost:4003"
  );
  startGameRequestConsumer();
});

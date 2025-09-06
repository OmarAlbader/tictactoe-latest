import mongoose from "mongoose";

const GameRequestSchema = new mongoose.Schema({
  fromPlayer: {
    type: String,
    required: true,
  },
  toPlayer: {
    type: String,
    required: true,
  },
  gameId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Game",
    required: false,
  },
  status: {
    type: String,
    enum: ["pending", "accepted", "rejected", "expired"],
    default: "pending",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("GameRequest", GameRequestSchema);

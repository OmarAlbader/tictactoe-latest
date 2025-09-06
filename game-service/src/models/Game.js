import mongoose from "mongoose";

const GameSchema = new mongoose.Schema({
  players: {
    type: [String],
    required: true,
    validate: {
      validator: function (v) {
        return v.length >= 1 && v.length <= 2;
      },
      message: "A game must have 1 or 2 players",
    },
  },
  playerMap: {
    type: Map,
    of: String,
    default: new Map(),
    validate: {
      validator: function (v) {
        const values = Array.from(v.values());
        return values.every((value) => value === "X" || value === "O");
      },
      message: "playerMap can only have X and O as values",
    },
  },
  spectators: {
    type: [String],
  },
  board: {
    type: [String],
    default: () => Array(9).fill(""),
    validate: {
      validator: function (v) {
        return v.length === 9;
      },
      message: "Board must have exactly 9 cells",
    },
  },
  currentPlayer: {
    type: String,
    required: true,
    default: "X",
  },
  status: {
    type: String,
    enum: ["WAITING", "ONGOING", "FINISHED"],
    default: "WAITING",
  },
  isDraw: {
    type: Boolean,
    default: false,
  },
  winner: {
    type: String,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

GameSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.model("Game", GameSchema);

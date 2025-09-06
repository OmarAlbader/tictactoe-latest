import mongoose from "mongoose";

const PlayerSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  stats: {
    type: {
      wins: {
        type: Number,
      },
      loses: {
        type: Number,
      },
      draws: {
        type: Number,
      },
      totalGames: {
        type: Number,
      },
    },
    default: () => ({
      totalGames: 0,
      wins: 0,
      loses: 0,
      draws: 0,
    }),
  },
  isOnline: {
    type: Boolean,
    default: false,
  },
  isPlaying: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  lastSeenAt: {
    type: Date,
    default: Date.now,
  },
});

// Only create the index if username doesn't have unique: true in schema
if (!PlayerSchema.paths.username.options.unique) {
  PlayerSchema.index({ username: 1 }, { unique: true });
}

export default mongoose.model("Player", PlayerSchema);

import { Schema, model } from "mongoose";

const userSchema = new Schema({
  id: { type: String, required: true, unique: true },
  language: { type: String, default: "pt-BR" },
  executedCommands: { type: Number, default: 0 },
  blacklist: {
    isBanned: { type: Boolean, default: false },
    since: { type: Date, default: null },
    reason: { type: String, default: null }
  },
  isSuspect: { type: Boolean, default: false },
  verified: { type: Boolean, default: false },
});

export default model("Users", userSchema);
import { Schema, model } from "mongoose";

const guildSchema = new Schema({
  id: { type: String, required: true, unique: true },
  prefix: { type: String, default: process.env.DEFAULT_PREFIX },
  premium: { type: Boolean, default: false },
  blacklist: { type: Boolean, default: false }
});

export default model("Guilds", guildSchema);
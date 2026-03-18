import { ActivityType } from "discord.js";

export default {
    name: "clientReady",
    once: true,
    execute(client) {
      client.user.setActivity("Still in Beta", {
        type: ActivityType.Playing,
      });
    }
};
import { ApplicationCommandType, MessageFlags } from "discord.js";

export default {
  name: "ping",
  description: "Shows the bot's latency",
  description_localizations: {
    "pt-BR": "Verifica a latência do Bot"
  },
  type: ApplicationCommandType.ChatInput,
  async execute(interaction) {
    await interaction.deferReply({
      flags: [MessageFlags.Ephemeral],
    });

    const reply = await interaction.fetchReply();
    const botLatency = Number.isFinite(reply.createdTimestamp)
      ? Math.max(0, reply.createdTimestamp - interaction.createdTimestamp)
      : Math.max(0, Date.now() - interaction.createdTimestamp);
    const gatewayPing = interaction.client.ws.ping;
    const apiLatencyText = Number.isFinite(gatewayPing) && gatewayPing >= 0
      ? `${Math.round(gatewayPing)}ms`
      : "Indisponivel";

    await interaction.editReply(`🏓 Pong! Latencia do bot: ${botLatency}ms | Latencia da API: ${apiLatencyText}`);
  },
};
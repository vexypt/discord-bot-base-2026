import { handleInteraction } from "../../utils/componentLoader.js";
import { ensureNotBlacklisted } from "../../utils/blacklist.js";
import { createLogger } from "../../utils/logger.js";

const logger = createLogger("event:load-components");

function isSupportedComponentInteraction(interaction) {
    return (
        interaction.isButton() ||
        interaction.isStringSelectMenu() ||
        interaction.isModalSubmit() ||
        interaction.isUserSelectMenu() ||
        interaction.isRoleSelectMenu()
    );
}

export default {
    name: "interactionCreate",
    async execute(interaction) {
        if (!isSupportedComponentInteraction(interaction)) {
            return;
        }

        try {
            const blacklistCheck = await ensureNotBlacklisted(interaction.client, interaction);
            if (blacklistCheck.blocked) {
                return;
            }

            await handleInteraction(interaction);
        } catch (error) {
            logger.error("Failed to handle component interaction.", error);
        }
    }
};
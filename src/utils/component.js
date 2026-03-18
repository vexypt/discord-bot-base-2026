import { createLogger } from "./logger.js";

const logger = createLogger("component");

class Component {
    constructor({ customId, componentType, run } = {}) {
        if (typeof customId !== 'string' || customId.trim().length === 0) {
            throw new TypeError('Invalid "customId". Expected a non-empty string.');
        }

        if (typeof run !== 'function') {
            throw new TypeError('Invalid "run" handler. Expected a function.');
        }

        this.customId = customId;
        this.componentType = componentType;
        this.run = run;
    }

    async handleInteraction(interaction) {
        try {
            await this.run(interaction);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);

            logger.error(
                `Failed to handle interaction for component "${this.customId}": ${errorMessage}`,
                error
            );
        }
    }
}

export default Component;
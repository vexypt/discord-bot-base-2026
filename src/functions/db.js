import userSchema from "../schemas/users.js";
import guildSchema from "../schemas/guilds.js";

const DEFAULT_PREFIX = process.env.DEFAULT_PREFIX;

function assertValidEntity(entity, entityName) {
    if (!entity || !entity.id) {
        throw new TypeError(`Invalid ${entityName} object. Expected an object with a valid "id" property.`);
    }
}

async function findOrCreateById(model, id, defaults = {}) {
    return model.findOneAndUpdate(
        { id },
        { $setOnInsert: { id, ...defaults } },
        {
            returnDocument: "after",
            upsert: true,
            setDefaultsOnInsert: true,
        }
    );
}

const db = {
    users: {
        async get(user) {
            assertValidEntity(user, 'user');
            return findOrCreateById(userSchema, user.id);
        },

        async delete(user) {
            assertValidEntity(user, 'user');

            const result = await userSchema.deleteOne({ id: user.id });
            return result.deletedCount > 0;
        },
    },

    guilds: {
        async get(guild) {
            assertValidEntity(guild, 'guild');
            return findOrCreateById(guildSchema, guild.id, { prefix: DEFAULT_PREFIX });
        },

        async delete(guild) {
            assertValidEntity(guild, 'guild');

            const result = await guildSchema.deleteOne({ id: guild.id });
            return result.deletedCount > 0;
        },
    },
};

export { db };
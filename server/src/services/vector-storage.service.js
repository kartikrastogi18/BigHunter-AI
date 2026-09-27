const { sequelize } = require("../config/database");


function formatVector(vector) {
    return `[${vector.join(",")}]`;
}


async function saveEmbedding(chunkId, embedding) {
    const vector = formatVector(embedding);

    await sequelize.query(
        `
        UPDATE code_chunks
        SET embedding = CAST(:vector AS vector)
        WHERE id = :chunkId
        `,
        {
            replacements: {
                vector,
                chunkId
            }
        }
    );
}


module.exports = {
    saveEmbedding
};
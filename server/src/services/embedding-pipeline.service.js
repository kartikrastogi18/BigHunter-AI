const CodeChunk = require("../models/code-chunk.model");
const { generateEmbedding } = require("./embedding.service");
const { saveEmbedding } = require("./vector-storage.service");


async function embedRepository(repositoryId) {

    const chunks = await CodeChunk.findAll({
        where: {
            repositoryId
        },
        order: [["createdAt", "ASC"]]
    });

    console.log(
        `Generating embeddings for ${chunks.length} code chunks`
    );

    let processed = 0;

    for (const chunk of chunks) {

        const embedding = await generateEmbedding(chunk.content);

        await saveEmbedding(
            chunk.id,
            embedding
        );

        processed++;

        console.log(
            `Embedded ${processed}/${chunks.length}`
        );
    }

    return {
        totalChunks: chunks.length,
        embeddedChunks: processed
    };
}


module.exports = {
    embedRepository
};
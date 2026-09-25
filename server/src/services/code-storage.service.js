const CodeChunk =
    require("../models/code-chunk.model");


async function saveCodeChunks(
    repositoryId,
    chunks
) {

    if (!chunks.length) {
        return [];
    }

    const records =
        chunks.map(chunk => ({
            repositoryId,

            filePath:
                chunk.filePath,

            language:
                chunk.language,

            symbolName:
                chunk.symbolName,

            chunkType:
                chunk.chunkType,

            startLine:
                chunk.startLine,

            endLine:
                chunk.endLine,

            content:
                chunk.content
        }));

    return CodeChunk.bulkCreate(
        records
    );
}


module.exports = {
    saveCodeChunks
};
const {
    generateEmbedding
} = require("./embedding.service");

const {
    searchCode
} = require("./code-search.service");


async function retrieveRelevantCode(
    repositoryId,
    query
) {

    const queryEmbedding =
        await generateEmbedding(query);

    const results =
        await searchCode(
            repositoryId,
            queryEmbedding,
            8
        );

    return results;
}


module.exports = {
    retrieveRelevantCode
};


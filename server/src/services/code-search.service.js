const { sequelize } = require("../config/database");


function formatVector(vector) {
    return `[${vector.join(",")}]`;
}


async function searchCode(
    repositoryId,
    queryEmbedding,
    limit = 8
) {

    const vector = formatVector(queryEmbedding);

    const [results] = await sequelize.query(
        `
        SELECT
            id,
            file_path,
            language,
            symbol_name,
            chunk_type,
            start_line,
            end_line,
            content,

            1 - (
                embedding <=> CAST(:vector AS vector)
            ) AS similarity

        FROM code_chunks

        WHERE repository_id = :repositoryId
          AND embedding IS NOT NULL

        ORDER BY embedding <=> CAST(:vector AS vector)

        LIMIT :limit
        `,
        {
            replacements: {
                vector,
                repositoryId,
                limit
            }
        }
    );

    return results;
}


module.exports = {
    searchCode
};
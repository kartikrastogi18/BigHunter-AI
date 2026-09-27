const AI_SERVICE_URL =
    process.env.AI_SERVICE_URL || "http://localhost:8000";


async function generateEmbedding(text) {
    const response = await fetch(`${AI_SERVICE_URL}/embed`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            text
        })
    });

    if (!response.ok) {
        const errorText = await response.text();

        throw new Error(
            `AI embedding service failed: ${response.status} ${errorText}`
        );
    }

    const data = await response.json();

    if (!data.success || !Array.isArray(data.embedding)) {
        throw new Error("Invalid embedding response from AI service");
    }

    return data.embedding;
}


module.exports = {
    generateEmbedding
};
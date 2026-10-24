const { retrieveRelevantCode } = require("./rag.service");

let AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://127.0.0.1:8000";
if (AI_SERVICE_URL.includes("localhost")) {
    AI_SERVICE_URL = AI_SERVICE_URL.replace("localhost", "127.0.0.1");
}

/**
 * Formats multiple code chunks into a clear prompt context for the AI.
 */
function formatCodeContext(chunks) {
    if (!chunks || chunks.length === 0) {
        return "";
    }

    return chunks
        .map((chunk, index) => {
            const header = `--- [Source File ${index + 1}: ${chunk.file_path} (Lines ${chunk.start_line || 1}-${chunk.end_line || 'End'})] ---`;
            return `${header}\n${chunk.content}`;
        })
        .join("\n\n");
}

/**
 * Investigates a bug in a repository using RAG and Gemini.
 */
async function investigateBug({ repositoryId, issueDescription, errorMessage, code, language }) {
    let codeContext = code || "";
    let relevantChunks = [];

    // If repositoryId is provided, retrieve the most relevant code chunks using RAG
    if (repositoryId) {
        try {
            const searchQuery = `${issueDescription} ${errorMessage || ""}`.trim();
            relevantChunks = await retrieveRelevantCode(repositoryId, searchQuery);

            const retrievedContext = formatCodeContext(relevantChunks);
            if (codeContext) {
                codeContext = `${codeContext}\n\n${retrievedContext}`;
            } else {
                codeContext = retrievedContext;
            }
        } catch (ragError) {
            console.warn("⚠️ RAG retrieval warning:", ragError.message);
        }
    }

    if (!codeContext) {
        throw new Error(
            repositoryId 
                ? "No matching code found in the repository for this issue. Please check if the repository is indexed or provide a code snippet."
                : "No code context provided. Either provide repositoryId or raw code."
        );
    }

    // Call Python AI Service
    const response = await fetch(`${AI_SERVICE_URL}/analyze-bug`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            code: codeContext,
            error_message: errorMessage || null,
            language: language || null
        }),
        signal: AbortSignal.timeout(120000)
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AI bug analysis failed: ${response.status} ${errorText}`);
    }

    const data = await response.json();

    return {
        success: true,
        analysis: data.analysis,
        codeContext: codeContext,
        relevantFiles: relevantChunks.map((chunk) => ({
            id: chunk.id,
            filePath: chunk.file_path,
            startLine: chunk.start_line,
            endLine: chunk.end_line,
            similarity: chunk.similarity
        }))
    };
}

/**
 * Generates a patch/fix for a specific bug and code snippet.
 */
async function generatePatch({ code, issueDescription, language }) {
    if (!code || !issueDescription) {
        throw new Error("Both 'code' and 'issueDescription' are required to generate a patch.");
    }

    const response = await fetch(`${AI_SERVICE_URL}/generate-patch`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            code,
            issue_description: issueDescription,
            language: language || null
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AI patch generation failed: ${response.status} ${errorText}`);
    }

    const data = await response.json();

    return {
        success: true,
        patch: data.patch
    };
}

/**
 * Generates an executable reproduction unit test for a bug.
 */
async function generateReproductionTest({ repositoryId, code, issueDescription, framework, language }) {
    let codeContext = code || "";

    if (repositoryId && !codeContext) {
        try {
            const chunks = await retrieveRelevantCode(repositoryId, issueDescription);
            codeContext = formatCodeContext(chunks);
        } catch (ragError) {
            console.warn("⚠️ RAG retrieval warning for test generator:", ragError.message);
        }
    }

    if (!codeContext || !issueDescription) {
        throw new Error("Both code context and issueDescription are required to generate reproduction tests.");
    }

    const response = await fetch(`${AI_SERVICE_URL}/generate-test`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            code: codeContext,
            issue_description: issueDescription,
            framework: framework || null,
            language: language || null
        }),
        signal: AbortSignal.timeout(120000)
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AI test generation failed: ${response.status} ${errorText}`);
    }

    const data = await response.json();

    return {
        success: true,
        test: data.test
    };
}

module.exports = {
    investigateBug,
    generatePatch,
    generateReproductionTest
};

const fs = require("fs/promises");
const path = require("path");

const IGNORED_DIRECTORIES = new Set([
    ".git",
    "node_modules",
    "dist",
    "build",
    ".next",
    ".vite",
    "coverage",
    "__pycache__",
    "venv",
    ".venv"
]);

const SUPPORTED_EXTENSIONS = {
    ".js": "JavaScript",
    ".jsx": "JavaScript",
    ".ts": "TypeScript",
    ".tsx": "TypeScript",
    ".py": "Python",
    ".java": "Java",
    ".cpp": "C++",
    ".c": "C",
    ".go": "Go",
    ".rs": "Rust",
    ".html": "HTML",
    ".css": "CSS",
    ".scss": "SCSS",
    ".sql": "SQL"
};

const MAX_CHUNK_LINES = 80;


/**
 * Recursively find source files.
 */
async function findSourceFiles(
    repositoryPath,
    currentPath = repositoryPath
) {
    const entries = await fs.readdir(
        currentPath,
        {
            withFileTypes: true
        }
    );

    const files = [];

    for (const entry of entries) {

        const fullPath = path.join(
            currentPath,
            entry.name
        );

        if (entry.isDirectory()) {

            if (
                IGNORED_DIRECTORIES.has(
                    entry.name
                )
            ) {
                continue;
            }

            const nested =
                await findSourceFiles(
                    repositoryPath,
                    fullPath
                );

            files.push(...nested);

            continue;
        }

        const extension =
            path.extname(entry.name)
                .toLowerCase();

        if (!SUPPORTED_EXTENSIONS[extension]) {
            continue;
        }

        files.push(fullPath);
    }

    return files;
}


/**
 * Split a source file into chunks.
 */
function createChunks(
    content,
    maxLines = MAX_CHUNK_LINES
) {
    const lines = content.split("\n");

    const chunks = [];

    for (
        let i = 0;
        i < lines.length;
        i += maxLines
    ) {

        const chunkLines =
            lines.slice(
                i,
                i + maxLines
            );

        chunks.push({
            startLine: i + 1,

            endLine:
                Math.min(
                    i + maxLines,
                    lines.length
                ),

            content:
                chunkLines.join("\n")
        });
    }

    return chunks;
}


/**
 * Index an entire repository.
 */
async function indexRepository(
    repositoryPath
) {

    console.log(
        "📚 Starting code indexing..."
    );

    const files =
        await findSourceFiles(
            repositoryPath
        );

    console.log(
        `📄 Source files found: ${files.length}`
    );

    const chunks = [];

    for (const filePath of files) {

        try {

            const content =
                await fs.readFile(
                    filePath,
                    "utf-8"
                );

            if (!content.trim()) {
                continue;
            }

            const extension =
                path.extname(filePath)
                    .toLowerCase();

            const language =
                SUPPORTED_EXTENSIONS[
                    extension
                ];

            const relativePath =
                path.relative(
                    repositoryPath,
                    filePath
                );

            const fileChunks =
                createChunks(content);

            for (
                const chunk
                of fileChunks
            ) {

                chunks.push({

                    filePath:
                        relativePath,

                    language,

                    symbolName:
                        null,

                    chunkType:
                        "block",

                    startLine:
                        chunk.startLine,

                    endLine:
                        chunk.endLine,

                    content:
                        chunk.content
                });
            }

        } catch (error) {

            console.warn(
                `⚠️ Could not read ${filePath}`
            );

        }
    }

    console.log(
        `🧩 Code chunks created: ${chunks.length}`
    );

    return chunks;
}


module.exports = {
    indexRepository
};
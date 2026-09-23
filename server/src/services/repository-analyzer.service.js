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

const LANGUAGE_MAP = {
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

const IMPORTANT_FILES = new Set([
    "package.json",
    "package-lock.json",
    "yarn.lock",
    "pnpm-lock.yaml",
    "requirements.txt",
    "pyproject.toml",
    "Dockerfile",
    "docker-compose.yml",
    "README.md",
    ".env.example"
]);


/**
 * Recursively scans a repository.
 */
async function scanDirectory(
    repositoryPath,
    currentPath = repositoryPath
) {
    const entries = await fs.readdir(currentPath, {
        withFileTypes: true
    });

    const files = [];
    const directories = [];

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

            const relativeDirectory =
                path.relative(
                    repositoryPath,
                    fullPath
                );

            directories.push(relativeDirectory);

            const nested =
                await scanDirectory(
                    repositoryPath,
                    fullPath
                );

            files.push(...nested.files);
            directories.push(...nested.directories);

            continue;
        }

        const relativeFile =
            path.relative(
                repositoryPath,
                fullPath
            );

        files.push(relativeFile);
    }

    return {
        files,
        directories
    };
}


/**
 * Detect programming languages.
 */
function detectLanguages(files) {

    const languages = {};

    for (const file of files) {

        const extension =
            path.extname(file).toLowerCase();

        const language =
            LANGUAGE_MAP[extension];

        if (!language) {
            continue;
        }

        languages[language] =
            (languages[language] || 0) + 1;
    }

    return languages;
}


/**
 * Find important project files.
 */
function detectImportantFiles(files) {

    return files.filter(file => {

        const filename =
            path.basename(file);

        return IMPORTANT_FILES.has(filename);
    });
}


/**
 * Analyze package.json.
 */
async function analyzeNodeProject(
    repositoryPath
) {

    const packageJsonPath =
        path.join(
            repositoryPath,
            "package.json"
        );

    try {

        const content =
            await fs.readFile(
                packageJsonPath,
                "utf-8"
            );

        const packageJson =
            JSON.parse(content);

        const dependencies = {
            ...(packageJson.dependencies || {}),
            ...(packageJson.devDependencies || {})
        };

        const frameworks = [];

        if (
            dependencies.react ||
            dependencies["react-dom"]
        ) {
            frameworks.push("React");
        }

        if (dependencies.express) {
            frameworks.push("Express");
        }

        if (dependencies.next) {
            frameworks.push("Next.js");
        }

        if (dependencies.vue) {
            frameworks.push("Vue");
        }

        if (dependencies["@angular/core"]) {
            frameworks.push("Angular");
        }

        return {
            packageManager: "npm",
            frameworks,
            dependencies: Object.keys(
                dependencies
            )
        };

    } catch {
        return {
            packageManager: null,
            frameworks: [],
            dependencies: []
        };
    }
}


/**
 * Main repository analysis function.
 */
async function analyzeRepository(
    repositoryPath
) {

    console.log(
        "📂 Scanning repository..."
    );

    const {
        files,
        directories
    } = await scanDirectory(
        repositoryPath
    );

    console.log(
        `📄 Found ${files.length} files`
    );

    const languages =
        detectLanguages(files);

    const importantFiles =
        detectImportantFiles(files);

    const nodeAnalysis =
        await analyzeNodeProject(
            repositoryPath
        );

    return {

        totalFiles: files.length,

        totalDirectories:
            directories.length,

        languages,

        frameworks:
            nodeAnalysis.frameworks,

        packageManagers:
            nodeAnalysis.packageManager
                ? [nodeAnalysis.packageManager]
                : [],

        importantFiles,

        dependencies:
            nodeAnalysis.dependencies,

        directories,

        files
    };
}


module.exports = {
    analyzeRepository
};
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

const IMPORTANT_FILES = new Set([
    "package.json",
    "requirements.txt",
    "pyproject.toml",
    "pom.xml",
    "build.gradle",
    "Dockerfile",
    "docker-compose.yml",
    "README.md",
    ".env.example"
]);

async function getRepositoryFiles(directory, currentPath = directory) {
    const entries = await fs.readdir(currentPath, {
        withFileTypes: true
    });

    const files = [];

    for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);

        if (
            entry.isDirectory() &&
            IGNORED_DIRECTORIES.has(entry.name)
        ) {
            continue;
        }

        if (entry.isDirectory()) {
            const nestedFiles = await getRepositoryFiles(
                directory,
                fullPath
            );

            files.push(...nestedFiles);
            continue;
        }

        const relativePath = path.relative(
            directory,
            fullPath
        );

        files.push(relativePath);
    }

    return files;
}

function detectLanguages(files) {
    const languages = {};

    const extensions = {
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
        ".scss": "SCSS"
    };

    for (const file of files) {
        const extension = path.extname(file).toLowerCase();

        const language = extensions[extension];

        if (!language) {
            continue;
        }

        languages[language] =
            (languages[language] || 0) + 1;
    }

    return languages;
}

function detectImportantFiles(files) {
    return files.filter(file => {
        const filename = path.basename(file);

        return IMPORTANT_FILES.has(filename);
    });
}

async function detectProjectInfo(repositoryPath, files) {
    const result = {
        frameworks: [],
        packageManagers: [],
        dependencies: {}
    };

    const packageJsonPath = path.join(
        repositoryPath,
        "package.json"
    );

    try {
        const packageJsonContent =
            await fs.readFile(packageJsonPath, "utf-8");

        const packageJson =
            JSON.parse(packageJsonContent);

        result.packageManagers.push("npm");

        const dependencies = {
            ...(packageJson.dependencies || {}),
            ...(packageJson.devDependencies || {})
        };

        result.dependencies = dependencies;

        if (
            dependencies.react ||
            dependencies["react-dom"]
        ) {
            result.frameworks.push("React");
        }

        if (dependencies.express) {
            result.frameworks.push("Express");
        }

        if (dependencies.next) {
            result.frameworks.push("Next.js");
        }

        if (dependencies.vue) {
            result.frameworks.push("Vue");
        }
    } catch (error) {
        // package.json doesn't exist or isn't valid JSON
    }

    return result;
}

async function analyzeRepository(repositoryPath) {
    const files = await getRepositoryFiles(
        repositoryPath
    );

    const languages = detectLanguages(files);

    const importantFiles =
        detectImportantFiles(files);

    const projectInfo =
        await detectProjectInfo(
            repositoryPath,
            files
        );

    return {
        totalFiles: files.length,
        languages,
        importantFiles,
        frameworks: projectInfo.frameworks,
        packageManagers: projectInfo.packageManagers,
        dependencies: projectInfo.dependencies,
        files
    };
}

module.exports = {
    analyzeRepository
};
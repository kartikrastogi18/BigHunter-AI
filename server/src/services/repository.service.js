const simpleGit = require("simple-git");
const fs = require("fs/promises");
const path = require("path");
const os = require("os");

function extractRepositoryName(repoUrl) {
    const cleanUrl = repoUrl.replace(/\/$/, "");

    const parts = cleanUrl.split("/");

    let repoName = parts[parts.length - 1];

    if (repoName.endsWith(".git")) {
        repoName = repoName.slice(0, -4);
    }

    return repoName;
}

async function cloneRepository(repoUrl) {
    const repoName = extractRepositoryName(repoUrl);

    const baseDirectory = path.join(
        os.tmpdir(),
        "bughunter-repositories"
    );

    await fs.mkdir(baseDirectory, {
        recursive: true
    });

    const repositoryPath = path.join(
        baseDirectory,
        `${repoName}-${Date.now()}`
    );

    const git = simpleGit();

    console.log(`Cloning repository: ${repoUrl}`);

    await git.clone(repoUrl, repositoryPath);

    console.log(`Repository cloned to: ${repositoryPath}`);

    return {
        name: repoName,
        path: repositoryPath
    };
}

module.exports = {
    cloneRepository
};
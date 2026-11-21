const {
    validateGitHubToken,
    generatePRSummary,
    createPullRequest
} = require("../services/github-pr.service");
const Repository = require("../models/repository.model");
const BugInvestigation = require("../models/bug-investigation.model");

/**
 * Validates a GitHub Personal Access Token.
 */
async function validateTokenController(req, res) {
    try {
        const token = req.body.token || req.headers["x-github-token"] || process.env.GITHUB_TOKEN;

        if (!token) {
            return res.status(400).json({
                success: false,
                message: "GitHub token is required"
            });
        }

        const result = await validateGitHubToken(token);
        return res.json({
            success: true,
            user: result.user
        });
    } catch (error) {
        console.error("❌ GitHub token validation failed:", error.message);
        return res.status(401).json({
            success: false,
            message: error.message || "Failed to validate GitHub token"
        });
    }
}

/**
 * Generates an AI-powered Pull Request Title & Description.
 */
async function generatePRSummaryController(req, res) {
    try {
        const {
            repositoryId,
            repoUrl,
            issueDescription,
            analysis,
            patch,
            test
        } = req.body;

        if (!issueDescription && !patch) {
            return res.status(400).json({
                success: false,
                message: "issueDescription or patch is required to generate PR summary"
            });
        }

        let repoName = null;
        if (repositoryId) {
            const repo = await Repository.findByPk(repositoryId);
            if (repo) {
                repoName = repo.name;
            }
        }

        const summary = await generatePRSummary({
            issueDescription,
            analysis,
            patch,
            test,
            repoName: repoName || repoUrl
        });

        return res.json({
            success: true,
            title: summary.title,
            description: summary.description
        });
    } catch (error) {
        console.error("❌ PR summary generation failed:", error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to generate PR summary",
            error: error.message
        });
    }
}

/**
 * Opens a GitHub Pull Request with the patched code and reproduction test.
 */
async function createPRController(req, res) {
    try {
        const {
            token,
            investigationId,
            repositoryId,
            repoUrl: inputRepoUrl,
            baseBranch,
            branchName,
            title,
            body,
            files
        } = req.body;

        const activeToken = token || req.headers["x-github-token"] || process.env.GITHUB_TOKEN;
        if (!activeToken) {
            return res.status(400).json({
                success: false,
                message: "GitHub Personal Access Token is required to create a Pull Request."
            });
        }

        let repoUrl = inputRepoUrl;
        let defaultBranch = baseBranch;

        // If repositoryId provided, retrieve details from database
        if (repositoryId) {
            const repo = await Repository.findByPk(repositoryId);
            if (repo) {
                repoUrl = repoUrl || repo.githubUrl;
                defaultBranch = defaultBranch || repo.defaultBranch;
            }
        }

        if (!repoUrl) {
            return res.status(400).json({
                success: false,
                message: "Repository URL or a valid repositoryId is required."
            });
        }

        if (!files || !Array.isArray(files) || files.length === 0) {
            return res.status(400).json({
                success: false,
                message: "At least one file (e.g. patched source file) is required."
            });
        }

        console.log(`🚀 Creating Pull Request for ${repoUrl}...`);

        const result = await createPullRequest({
            token: activeToken,
            repoUrl,
            baseBranch: defaultBranch,
            branchName,
            title,
            body,
            files
        });

        if (investigationId && result.pullRequest) {
            await BugInvestigation.update(
                {
                    prUrl: result.pullRequest.htmlUrl,
                    prNumber: result.pullRequest.number,
                    prTitle: result.pullRequest.title,
                    status: "PR_CREATED"
                },
                { where: { id: investigationId } }
            ).catch((e) => console.warn("⚠️ History PR update note:", e.message));
        }

        return res.json({
            success: true,
            pullRequest: result.pullRequest,
            alreadyExisted: result.alreadyExisted || false,
            message: "Pull Request created successfully!"
        });
    } catch (error) {
        console.error("❌ Pull Request creation failed:", error.message);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to create Pull Request"
        });
    }
}

module.exports = {
    validateToken: validateTokenController,
    generatePRSummary: generatePRSummaryController,
    createPullRequest: createPRController
};

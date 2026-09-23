const {
    cloneRepository
} = require("../services/repository.service");

const {
    analyzeRepository
} = require("../services/repository-analyzer.service");

async function analyzeRepositoryController(req, res) {
    try {
        const { repoUrl } = req.body;

        if (!repoUrl) {
            return res.status(400).json({
                success: false,
                message: "Repository URL is required"
            });
        }

        console.log("🔗 Cloning repository...");

        const repository =
            await cloneRepository(repoUrl);

        console.log("🔍 Analyzing repository...");

        const analysis =
            await analyzeRepository(
                repository.path
            );

        return res.status(201).json({
            success: true,

            repository: {
                name: repository.name,
                path: repository.path
            },

            analysis
        });

    } catch (error) {
        console.error(
            "Repository analysis error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to analyze repository",
            error: error.message
        });
    }
}

module.exports = {
    analyzeRepository: analyzeRepositoryController
};
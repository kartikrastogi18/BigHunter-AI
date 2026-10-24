const {
    investigateBug,
    generatePatch,
    generateReproductionTest
} = require("../services/bug-investigation.service");

async function investigateBugController(req, res) {
    try {
        const {
            repositoryId,
            issueDescription,
            errorMessage,
            code,
            language
        } = req.body;

        if (!issueDescription && !errorMessage) {
            return res.status(400).json({
                success: false,
                message: "Either issueDescription or errorMessage is required"
            });
        }

        if (!repositoryId && !code) {
            return res.status(400).json({
                success: false,
                message: "Either repositoryId or code snippet is required"
            });
        }

        console.log(`🔍 Investigating bug for repo: ${repositoryId || 'Direct Code'}...`);

        const result = await investigateBug({
            repositoryId,
            issueDescription,
            errorMessage,
            code,
            language
        });

        return res.json({
            success: true,
            issueDescription,
            analysis: result.analysis,
            codeContext: result.codeContext,
            relevantFiles: result.relevantFiles
        });
    } catch (error) {
        console.error("❌ Bug investigation failed:", error);
        return res.status(500).json({
            success: false,
            message: "Bug investigation failed",
            error: error.message
        });
    }
}

async function generatePatchController(req, res) {
    try {
        const {
            code,
            issueDescription,
            language
        } = req.body;

        if (!code || !issueDescription) {
            return res.status(400).json({
                success: false,
                message: "Both code and issueDescription are required"
            });
        }

        console.log("🛠️ Generating code patch with AI...");

        const result = await generatePatch({
            code,
            issueDescription,
            language
        });

        return res.json({
            success: true,
            patch: result.patch
        });
    } catch (error) {
        console.error("❌ Patch generation failed:", error);
        return res.status(500).json({
            success: false,
            message: "Patch generation failed",
            error: error.message
        });
    }
}

async function generateTestController(req, res) {
    try {
        const {
            repositoryId,
            code,
            issueDescription,
            framework,
            language
        } = req.body;

        if (!issueDescription) {
            return res.status(400).json({
                success: false,
                message: "issueDescription is required"
            });
        }

        if (!repositoryId && !code) {
            return res.status(400).json({
                success: false,
                message: "Either repositoryId or code snippet is required"
            });
        }

        console.log("🧪 Generating reproduction unit test with AI...");

        const result = await generateReproductionTest({
            repositoryId,
            code,
            issueDescription,
            framework,
            language
        });

        return res.json({
            success: true,
            test: result.test
        });
    } catch (error) {
        console.error("❌ Test generation failed:", error);
        return res.status(500).json({
            success: false,
            message: "Test generation failed",
            error: error.message
        });
    }
}

module.exports = {
    investigateBug: investigateBugController,
    generatePatch: generatePatchController,
    generateTest: generateTestController
};

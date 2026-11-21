const {
    investigateBug,
    generatePatch,
    generateReproductionTest,
    detectDefect,
    getDefectModelInfo
} = require("../services/bug-investigation.service");
const {
    verifyPatchInSandbox
} = require("../services/sandbox-runner.service");
const BugInvestigation = require("../models/bug-investigation.model");
const Repository = require("../models/repository.model");

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

        console.log(`🔍 Investigating bug for repo: ${repositoryId || "Direct Code"}...`);

        const result = await investigateBug({
            repositoryId,
            issueDescription,
            errorMessage,
            code,
            language
        });

        let investigationId = null;
        try {
            let repoName = null;
            if (repositoryId) {
                const repo = await Repository.findByPk(repositoryId);
                if (repo) repoName = repo.name;
            }

            const saved = await BugInvestigation.create({
                repositoryId: repositoryId || null,
                repositoryName: repoName,
                mode: repositoryId ? "repo" : "snippet",
                issueDescription: issueDescription || errorMessage,
                errorMessage: errorMessage || null,
                codeContext: result.codeContext,
                analysis: result.analysis,
                relevantFiles: result.relevantFiles || [],
                status: "INVESTIGATED"
            });
            investigationId = saved.id;
        } catch (dbErr) {
            console.warn("⚠️ Could not persist investigation history:", dbErr.message);
        }

        return res.json({
            success: true,
            investigationId,
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
            investigationId,
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

        if (investigationId) {
            await BugInvestigation.update(
                {
                    generatedPatch: result.patch,
                    cleanPatch: result.cleanCode || result.patch,
                    status: "PATCHED"
                },
                { where: { id: investigationId } }
            ).catch((e) => console.warn("⚠️ History patch update note:", e.message));
        }

        return res.json({
            success: true,
            patch: result.patch,
            cleanCode: result.cleanCode
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
            investigationId,
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

        if (investigationId) {
            await BugInvestigation.update(
                { generatedTest: result.cleanTest || result.test },
                { where: { id: investigationId } }
            ).catch((e) => console.warn("⚠️ History test update note:", e.message));
        }

        return res.json({
            success: true,
            test: result.test,
            cleanTest: result.cleanTest,
            testFileName: result.testFileName
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

async function verifyPatchController(req, res) {
    try {
        const {
            investigationId,
            buggyCode,
            patchedCode,
            issueDescription,
            testCode,
            language
        } = req.body;

        if (!buggyCode || !patchedCode || !issueDescription) {
            return res.status(400).json({
                success: false,
                message: "buggyCode, patchedCode, and issueDescription are required for sandbox verification"
            });
        }

        console.log("🛡️ Starting autonomous dual-stage sandbox patch verification...");

        const verification = await verifyPatchInSandbox({
            buggyCode,
            patchedCode,
            issueDescription,
            testCode,
            language
        });

        if (investigationId) {
            await BugInvestigation.update(
                {
                    verificationVerdict: verification.verdict,
                    verificationReport: verification,
                    status: verification.verdict === "VERIFIED_PASS" ? "VERIFIED" : "PATCHED"
                },
                { where: { id: investigationId } }
            ).catch((e) => console.warn("⚠️ History verification update note:", e.message));
        }

        return res.json(verification);
    } catch (error) {
        console.error("❌ Sandbox verification failed:", error);
        return res.status(500).json({
            success: false,
            message: "Sandbox verification failed",
            error: error.message
        });
    }
}

async function detectDefectController(req, res) {
    try {
        const { code, investigationId } = req.body;
        if (!code || !code.trim()) {
            return res.status(400).json({
                success: false,
                message: "Source code is required for ML defect detection"
            });
        }

        console.log("🤖 Running CodeXGLUE PyTorch Bi-GRU defect risk scan...");
        const prediction = await detectDefect({ code });

        if (investigationId) {
            await BugInvestigation.update(
                {
                    defectScore: prediction.defect_probability,
                    defectRiskLevel: prediction.risk_level
                },
                { where: { id: investigationId } }
            ).catch((e) => console.warn("⚠️ History defect update note:", e.message));
        }

        return res.json(prediction);
    } catch (error) {
        console.error("❌ Defect detection failed:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Defect detection failed"
        });
    }
}

async function getDefectModelInfoController(req, res) {
    try {
        const info = await getDefectModelInfo();
        return res.json(info);
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch defect model info"
        });
    }
}

async function getInvestigationHistoryController(req, res) {
    try {
        const history = await BugInvestigation.findAll({
            order: [["created_at", "DESC"]],
            limit: 50
        });
        return res.json({
            success: true,
            history
        });
    } catch (error) {
        console.error("❌ Failed to fetch investigation history:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch investigation history",
            error: error.message
        });
    }
}

async function deleteInvestigationController(req, res) {
    try {
        const { id } = req.params;
        const deleted = await BugInvestigation.destroy({ where: { id } });
        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: "Investigation record not found"
            });
        }
        return res.json({
            success: true,
            message: "Investigation record removed"
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to delete investigation record",
            error: error.message
        });
    }
}

module.exports = {
    investigateBug: investigateBugController,
    generatePatch: generatePatchController,
    generateTest: generateTestController,
    verifyPatch: verifyPatchController,
    detectDefect: detectDefectController,
    getDefectModelInfo: getDefectModelInfoController,
    getInvestigationHistory: getInvestigationHistoryController,
    deleteInvestigation: deleteInvestigationController
};

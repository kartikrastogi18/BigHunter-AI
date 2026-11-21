const express = require("express");
const {
    investigateBug,
    generatePatch,
    generateTest,
    verifyPatch,
    detectDefect,
    getDefectModelInfo,
    getInvestigationHistory,
    deleteInvestigation
} = require("../controllers/bug.controller");

const router = express.Router();

router.post("/investigate", investigateBug);
router.post("/patch", generatePatch);
router.post("/test", generateTest);
router.post("/generate-test", generateTest);
router.post("/verify-patch", verifyPatch);
router.post("/detect-defect", detectDefect);
router.get("/defect-model-info", getDefectModelInfo);
router.get("/history", getInvestigationHistory);
router.delete("/history/:id", deleteInvestigation);

module.exports = router;

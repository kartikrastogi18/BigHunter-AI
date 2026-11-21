const express = require("express");
const {
    validateToken,
    generatePRSummary,
    createPullRequest
} = require("../controllers/github.controller");

const router = express.Router();

router.post("/validate-token", validateToken);
router.post("/generate-pr-summary", generatePRSummary);
router.post("/create-pr", createPullRequest);

module.exports = router;

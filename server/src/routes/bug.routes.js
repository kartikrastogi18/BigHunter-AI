const express = require("express");
const {
    investigateBug,
    generatePatch,
    generateTest
} = require("../controllers/bug.controller");

const router = express.Router();

router.post("/investigate", investigateBug);
router.post("/patch", generatePatch);
router.post("/test", generateTest);
router.post("/generate-test", generateTest);

module.exports = router;

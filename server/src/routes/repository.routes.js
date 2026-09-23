const express = require("express");

const {
    analyzeRepository
} = require("../controllers/repository.controller");

const router = express.Router();

router.post(
    "/analyze",
    analyzeRepository
);

module.exports = router;
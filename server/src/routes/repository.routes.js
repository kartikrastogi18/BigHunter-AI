const express = require("express");

const {
    analyzeRepository,
    getAllRepositories,
    deleteRepository
} = require("../controllers/repository.controller");

const router = express.Router();

router.get("/", getAllRepositories);
router.post("/analyze", analyzeRepository);
router.delete("/:id", deleteRepository);

module.exports = router;
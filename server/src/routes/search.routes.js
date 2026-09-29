const express = require("express");

const {
    retrieveRelevantCode
} = require("../services/rag.service");


const router = express.Router();


router.post("/code", async (req, res) => {

    try {

        const {
            repositoryId,
            query
        } = req.body;


        if (!repositoryId || !query) {

            return res.status(400).json({
                success: false,
                message:
                    "repositoryId and query are required"
            });

        }


        const results =
            await retrieveRelevantCode(
                repositoryId,
                query
            );


        return res.json({
            success: true,
            query,
            results
        });

    } catch (error) {

        console.error(
            "❌ Code search failed:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Code search failed",
            error:
                error.message
        });
    }
});


module.exports = router;
const {
    cloneRepository
} = require("../services/repository.service");

const {
    analyzeRepository
} = require("../services/repository-analyzer.service");

const {
    indexRepository
} = require("../services/code-indexer.service");

const {
    saveCodeChunks
} = require("../services/code-storage.service");

const Repository =
    require("../models/repository.model");

const { embedRepository } = require("../services/embedding-pipeline.service");


function extractOwner(repoUrl) {

    try {

        const url = new URL(repoUrl);

        const parts =
            url.pathname
                .split("/")
                .filter(Boolean);

        return parts[0] || null;

    } catch {

        return null;
    }
}


function extractRepositoryName(repoUrl) {

    try {

        const url = new URL(repoUrl);

        const parts =
            url.pathname
                .split("/")
                .filter(Boolean);

        let name = parts[1];

        if (!name) {
            return null;
        }

        if (name.endsWith(".git")) {
            name = name.slice(0, -4);
        }

        return name;

    } catch {

        return null;
    }
}


async function analyzeRepositoryController(
    req,
    res
) {

    try {

        const { repoUrl } = req.body;


        if (!repoUrl) {

            return res.status(400).json({

                success: false,

                message:
                    "Repository URL is required"

            });
        }


        // Prevent duplicate repositories
        const existing =
            await Repository.findOne({
                where: {
                    githubUrl: repoUrl
                }
            });


        if (existing) {

            return res.status(200).json({

                success: true,

                message:
                    "Repository already exists",

                repository: existing

            });
        }


        console.log(
            "📥 Cloning repository..."
        );


        const repository =
            await cloneRepository(
                repoUrl
            );


        console.log(
            "🔍 Analyzing repository..."
        );


        const analysis =
            await analyzeRepository(
                repository.path
            );

            console.log(
                "📚 Indexing source code..."
            );
            
            const chunks =
                await indexRepository(
                    repository.path
                );
            
            console.log(
                `🧩 Generated ${chunks.length} chunks`
            );


        console.log(
            "💾 Saving repository..."
        );


        const savedRepository =
            await Repository.create({

                name:
                    repository.name,

                githubUrl:
                    repoUrl,

                owner:
                    extractOwner(repoUrl),

                defaultBranch:
                    "main",

                languages:
                    analysis.languages,

                frameworks:
                    analysis.frameworks,

                totalFiles:
                    analysis.totalFiles,

                totalDirectories:
                    analysis.totalDirectories,

                status:
                    "ANALYZED"

            });
            console.log(
                "💾 Saving code chunks..."
            );
            
            await saveCodeChunks(
                savedRepository.id,
                chunks
            );
            const embeddingResult = await embedRepository(
                savedRepository.id
            );
            console.log(
                "✅ Code chunks saved"
            );


        console.log(
            "✅ Repository saved:",
            savedRepository.id
        );


        return res.status(201).json({

            success: true,

            message:
                "Repository analyzed and saved",

            repository: {

                id:
                    savedRepository.id,

                name:
                    savedRepository.name,

                githubUrl:
                    savedRepository.githubUrl,

                owner:
                    savedRepository.owner,

                languages:
                    savedRepository.languages,

                frameworks:
                    savedRepository.frameworks,

                totalFiles:
                    savedRepository.totalFiles,

                totalDirectories:
                    savedRepository.totalDirectories,

                status:
                    savedRepository.status
                
            },
            embedding:
                embeddingResult

        });

    } catch (error) {

        console.error(
            "❌ Repository analysis failed:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Failed to analyze repository",

            error:
                error.message

        });
    }
}


module.exports = {
    analyzeRepository:
        analyzeRepositoryController
};
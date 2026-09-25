require("dotenv").config();

const app = require("./app");

const {
    sequelize,
    connectDatabase
} = require("./config/database");

require("./models/repository.model");
require("./models/code-chunk.model");


const PORT = process.env.PORT || 5000;


async function startServer() {

    try {

        await connectDatabase();

        await sequelize.sync();

        console.log(
            "📦 Database models synchronized"
        );

        app.listen(PORT, () => {

            console.log(
                `🚀 BugHunter API running on port ${PORT}`
            );

        });

    } catch (error) {

        console.error(
            "❌ Failed to start server:",
            error.message
        );

        process.exit(1);
    }
}


startServer();
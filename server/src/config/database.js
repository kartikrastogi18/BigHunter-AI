const { Sequelize } = require("sequelize");

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        dialect: "postgres",

        logging: false,

        pool: {
            max: 10,
            min: 0,
            acquire: 30000,
            idle: 10000
        }
    }
);

async function connectDatabase() {
    try {

        await sequelize.authenticate();

        console.log(
            "🐘 PostgreSQL connected successfully"
        );

    } catch (error) {

        console.error(
            "❌ PostgreSQL connection failed:",
            error.message
        );

        throw error;
    }
}

module.exports = {
    sequelize,
    connectDatabase
};
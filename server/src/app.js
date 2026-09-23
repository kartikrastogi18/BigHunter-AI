const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const repositoryRoutes = require("./routes/repository.routes");

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        message: "BugHunter AI server is running"
    });
});

app.use(
    "/api/repositories",
    repositoryRoutes
);

module.exports = app;
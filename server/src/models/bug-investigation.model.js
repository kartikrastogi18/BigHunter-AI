const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const BugInvestigation = sequelize.define(
    "BugInvestigation",
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        repositoryId: {
            type: DataTypes.UUID,
            allowNull: true
        },
        repositoryName: {
            type: DataTypes.STRING,
            allowNull: true
        },
        mode: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: "snippet"
        },
        issueDescription: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        errorMessage: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        codeContext: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        analysis: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        relevantFiles: {
            type: DataTypes.JSONB,
            allowNull: false,
            defaultValue: []
        },
        defectScore: {
            type: DataTypes.FLOAT,
            allowNull: true
        },
        defectRiskLevel: {
            type: DataTypes.STRING,
            allowNull: true
        },
        generatedPatch: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        cleanPatch: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        generatedTest: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        verificationVerdict: {
            type: DataTypes.STRING,
            allowNull: true
        },
        verificationReport: {
            type: DataTypes.JSONB,
            allowNull: true
        },
        prUrl: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        prNumber: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        prTitle: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        status: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: "INVESTIGATED"
        }
    },
    {
        tableName: "bug_investigations",
        timestamps: true,
        underscored: true
    }
);

module.exports = BugInvestigation;


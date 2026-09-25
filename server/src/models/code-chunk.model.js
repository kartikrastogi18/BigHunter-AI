const { DataTypes } = require("sequelize");

const { sequelize } = require("../config/database");

const CodeChunk = sequelize.define(
    "CodeChunk",

    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },

        repositoryId: {
            type: DataTypes.UUID,
            allowNull: false
        },

        filePath: {
            type: DataTypes.TEXT,
            allowNull: false
        },

        language: {
            type: DataTypes.STRING,
            allowNull: true
        },

        symbolName: {
            type: DataTypes.STRING,
            allowNull: true
        },

        chunkType: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: "block"
        },

        startLine: {
            type: DataTypes.INTEGER,
            allowNull: true
        },

        endLine: {
            type: DataTypes.INTEGER,
            allowNull: true
        },

        content: {
            type: DataTypes.TEXT,
            allowNull: false
        }
    },

    {
        tableName: "code_chunks",
        timestamps: true,
        underscored: true
    }
);

module.exports = CodeChunk;
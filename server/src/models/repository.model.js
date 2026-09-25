const {
    DataTypes
} = require("sequelize");

const {
    sequelize
} = require("../config/database");


const Repository = sequelize.define(
    "Repository",

    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },

        name: {
            type: DataTypes.STRING,
            allowNull: false
        },

        githubUrl: {
            type: DataTypes.TEXT,
            allowNull: false,
            unique: true
        },

        owner: {
            type: DataTypes.STRING,
            allowNull: true
        },

        defaultBranch: {
            type: DataTypes.STRING,
            allowNull: true
        },

        languages: {
            type: DataTypes.JSONB,
            allowNull: false,
            defaultValue: {}
        },

        frameworks: {
            type: DataTypes.JSONB,
            allowNull: false,
            defaultValue: []
        },

        totalFiles: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },

        totalDirectories: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },

        status: {
            type: DataTypes.ENUM(
                "CLONING",
                "ANALYZING",
                "ANALYZED",
                "FAILED"
            ),
            defaultValue: "CLONING"
        }
    },

    {
        tableName: "repositories",
        timestamps: true,
        underscored: true
    }
);

const CodeChunk =
    require("./code-chunk.model");

Repository.hasMany(CodeChunk, {
    foreignKey: "repositoryId",
    onDelete: "CASCADE"
});

CodeChunk.belongsTo(Repository, {
    foreignKey: "repositoryId"
});

module.exports = Repository;
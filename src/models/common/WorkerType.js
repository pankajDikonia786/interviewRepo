const Sq = require("sequelize");
const sequelize = require('../../config/DbConfig');
const { modelCommonAttributes, modelRenameDateAttributes } = require("../ModelAttributes");

const WorkerType = sequelize.define("worker_type", {

    Worker_type_uuid: {
        type: Sq.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sq.literal('uuid_generate_v4()'),
    },
    worker_type: Sq.STRING,
    ...modelCommonAttributes,

}, {
    paranoid: false,
    timestamps: true,
    freezeTableName: true,
    schema: 'common',
    ...modelRenameDateAttributes
});

module.exports = WorkerType;
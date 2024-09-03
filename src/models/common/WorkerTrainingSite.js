const Sq = require("sequelize");
const sequelize = require('../../config/DbConfig');
const { modelCommonAttributes, modelRenameDateAttributes } = require("../ModelAttributes");

const WorkerTrainingSite = sequelize.define("worker_training_site", {

    worker_training_site_uuid: {
        allowNull: false,
        type: Sq.UUID,
        primaryKey: true,
        defaultValue: Sq.literal('uuid_generate_v4()'),
    },
    site_uuid: { type: Sq.UUID, allowNull: false },
    worker_uuid: { type: Sq.UUID, allowNull: false },
    is_training_completed: { type: Sq.BOOLEAN, defaultValue: false, allowNull: false },

    ...modelCommonAttributes,
}, {
    indexes: [
        {
            unique: true,
            fields: ['site_uuid', "worker_uuid"]
        }
    ],
    paranoid: false,
    timestamps: true,
    freezeTableName: true,
    schema: 'common',
    ...modelRenameDateAttributes

}
);

module.exports = WorkerTrainingSite;

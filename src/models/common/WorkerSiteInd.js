const Sq = require("sequelize");
const sequelize = require('../../config/DbConfig');
const { modelCommonAttributes, modelRenameDateAttributes } = require("../ModelAttributes");

const WorkerSiteInd = sequelize.define("worker_site_ind", {

    worker_site_ind_uuid: {
        allowNull: false,
        type: Sq.UUID,
        primaryKey: true,
        defaultValue: Sq.literal('uuid_generate_v4()'),
    },
    site_uuid: { type: Sq.UUID, allowNull: false },
    site_induction_uuid: { type: Sq.UUID, allowNull: false },
    worker_uuid: { type: Sq.UUID, allowNull: false },
    is_induction_completed: { type: Sq.BOOLEAN, defaultValue: false },
    expiry_date: { type: Sq.DATE },

    ...modelCommonAttributes,
}, {
    indexes: [
        {
            unique: true,
            fields: ['site_induction_uuid', "worker_uuid"]
        }
    ],
    paranoid: false,
    timestamps: true,
    freezeTableName: true,
    schema: 'common',
    ...modelRenameDateAttributes

}
);

module.exports = WorkerSiteInd;

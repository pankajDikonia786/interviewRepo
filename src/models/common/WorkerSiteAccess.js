const Sq = require("sequelize");
const sequelize = require('../../config/DbConfig');
const { modelCommonAttributes, modelRenameDateAttributes } = require("../ModelAttributes");

const WorkerSiteAccess = sequelize.define("worker_site_access", {

    worker_site_access_uuid: {
        allowNull: false,
        type: Sq.UUID,
        primaryKey: true,
        defaultValue: Sq.literal('uuid_generate_v4()'),
    },
    worker_uuid: { type: Sq.UUID, allowNull: false },
    client_org_uuid: { type: Sq.UUID, allowNull: false },
    site_uuid: { type: Sq.UUID, allowNull: false },
    individual_uuid: { type: Sq.UUID, allowNull: false },
    clock_in_out_status: { type: Sq.BOOLEAN, allowNull: false, defaultValue: true },
    estimate_clockout_time: Sq.DATE,
    photo: Sq.TEXT,
    sign_in_date: Sq.DATE,
    sign_out_date: Sq.DATE,

    ...modelCommonAttributes,

}, {
    indexes: [
        {
            unique: false,
            fields: ['worker_uuid', 'site_uuid', 'client_org_uuid']
        }
    ],
    paranoid: false,
    timestamps: true,
    freezeTableName: true,
    schema: 'common',
    ...modelRenameDateAttributes

}

);
module.exports = WorkerSiteAccess;
const Sq = require("sequelize");
const sequelize = require('../../config/DbConfig');
const { modelCommonAttributes, modelRenameDateAttributes } = require("../ModelAttributes");

const WorkerSiteNotifi = sequelize.define("worker_site_notifi", {

    worker_site_notifi_uuid: {
        allowNull: false,
        type: Sq.UUID,
        primaryKey: true,
        defaultValue: Sq.literal('uuid_generate_v4()'),
    },
    worker_uuid: { type: Sq.UUID, allowNull: false },
    site_uuid: { type: Sq.UUID, allowNull: false },
    client_org_uuid: { type: Sq.UUID, allowNull: false },
    desc: { type: Sq.BOOLEAN, defaultValue: false, allowNull: false },
    doc_status: { type: Sq.BOOLEAN, defaultValue: false, allowNull: false },
    is_read: { type: Sq.BOOLEAN, defaultValue: false, allowNull: false },

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

module.exports = WorkerSiteNotifi;

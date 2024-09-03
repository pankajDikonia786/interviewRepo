const Sq = require("sequelize");
const sequelize = require('../../config/DbConfig');
const { modelCommonAttributes, modelRenameDateAttributes } = require("../ModelAttributes");

const WorkerAssign = sequelize.define("worker_assign", {

    worker_assign_uuid: {
        allowNull: false,
        type: Sq.UUID,
        primaryKey: true,
        defaultValue: Sq.literal('uuid_generate_v4()'),
    },
    worker_uuid: { type: Sq.UUID, allowNull: false },
    provider_org_uuid: { type: Sq.UUID, allowNull: false },
    client_org_uuid: { type: Sq.UUID, allowNull: false },

    ...modelCommonAttributes,

}, {
    indexes: [
        {
            unique: false,
            fields: ['worker_uuid', "provider_org_uuid", "client_org_uuid"]
        }
    ],
    paranoid: true,
    timestamps: true,
    freezeTableName: true,
    schema: 'common',
    ...modelRenameDateAttributes

}
);
WorkerAssign.beforeDestroy(async (workerAssign, option) => {
    const { worker_uuid, provider_org_uuid } = workerAssign;
    await WorkerAssign.update({
        deleted_by: option.user_uuid
    }, { paranoid: false, where: { worker_uuid, provider_org_uuid } });

});

module.exports = WorkerAssign;
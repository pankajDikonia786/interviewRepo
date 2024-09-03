const Sq = require("sequelize");
const sequelize = require('../../config/DbConfig');
const { modelCommonAttributes, modelRenameDateAttributes } = require("../ModelAttributes");

const Workers = sequelize.define("workers", {

    worker_uuid: {
        allowNull: false,
        type: Sq.UUID,
        primaryKey: true,
        defaultValue: Sq.literal('uuid_generate_v4()'),
    },
    individual_uuid: { type: Sq.UUID, allowNull: false },
    provider_org_uuid: { type: Sq.UUID, allowNull: false },//provider organisation uuid (this field we can be allownull:true if worker directly  without client)
    worker_job_title: Sq.STRING,
    license_number: { type: Sq.STRING },

    ...modelCommonAttributes,

}, {
    indexes: [
        {
            unique: true,
            fields: ['individual_uuid', "provider_org_uuid"]
        }
    ],
    paranoid: true,
    timestamps: true,
    freezeTableName: true,
    schema: 'common',
    ...modelRenameDateAttributes

}

);
Workers.beforeDestroy(async (workers, option) => {

    await Workers.update({
        deleted_by: option.user_uuid
    }, { paranoid: false, where: { worker_uuid: workers.worker_uuid } });

});

module.exports = Workers;
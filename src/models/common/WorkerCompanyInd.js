const Sq = require("sequelize");
const sequelize = require('../../config/DbConfig');
const { modelCommonAttributes, modelRenameDateAttributes } = require("../ModelAttributes");

const WorkerCompanyInd = sequelize.define("worker_company_ind", {

    worker_company_ind_uuid: {
        allowNull: false,
        type: Sq.UUID,
        primaryKey: true,
        defaultValue: Sq.literal('uuid_generate_v4()'),
    },
    company_induction_uuid: { type: Sq.UUID, allowNull: false },
    worker_uuid: { type: Sq.UUID, allowNull: false },
    is_comp_ind_completed: { type: Sq.BOOLEAN, defaultValue: false },
    // expiry_date: { type: Sq.DATE },

    ...modelCommonAttributes,
}, {
    indexes: [
        {
            unique: true,
            fields: ['company_induction_uuid', "worker_uuid"]
        }
    ],
    paranoid: false,
    timestamps: true,
    freezeTableName: true,
    schema: 'common',
    ...modelRenameDateAttributes

}
);

module.exports = WorkerCompanyInd;

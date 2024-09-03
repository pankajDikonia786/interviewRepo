const Sq = require('sequelize');
const sequelize = require('../../config/DbConfig');
const { modelCommonAttributes, modelRenameDateAttributes } = require("../ModelAttributes");
const ClientDetails = sequelize.define(
    'client_details',
    {
        client_detail_uuid: {
            allowNull: false,
            type: Sq.UUID,
            primaryKey: true,
            defaultValue: Sq.literal('uuid_generate_v4()'),
        },
        organisation_uuid: { type: Sq.UUID, allowNull: false },//client organisation_uuid
        allow_receive_ac: { type: Sq.BOOLEAN, allowNull: false, defaultValue: false },
        send_client_confirm_ac: { type: Sq.BOOLEAN, allowNull: false, defaultValue: false },
        show_worker_ic_photo: { type: Sq.BOOLEAN, allowNull: false, defaultValue: false },
        show_worker_ic_client_logo: { type: Sq.BOOLEAN, allowNull: false, defaultValue: false },
        show_worker_ic_back: { type: Sq.BOOLEAN, allowNull: false, defaultValue: false },

        ...modelCommonAttributes
    },
    {
   
        paranoid: false,
        timestamps: true,
        freezeTableName: true,
        schema: 'common',
        ...modelRenameDateAttributes

    },
);

module.exports = ClientDetails;

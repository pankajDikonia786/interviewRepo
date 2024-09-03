const Sq = require('sequelize');
const sequelize = require('../../config/DbConfig');
const { modelCommonAttributes, modelRenameDateAttributes } = require("../ModelAttributes");

const FARelations = sequelize.define(
    'f_a_relations',
    {
        f_a_relation_uuid: {
            allowNull: false,
            type: Sq.UUID,
            primaryKey: true,
            defaultValue: Sq.literal('uuid_generate_v4()'),
        },
        parent_uuid: { type: Sq.UUID, allowNull: false },
        child_uuid: { type: Sq.UUID, allowNull: false },
        f_a_relation_type: { type: Sq.ENUM("client_provider", "client_sub_client", "provider_sub_provider"), allowNull: false },
        is_active: { type: Sq.BOOLEAN, defaultValue: true, allowNull: false },

        ...modelCommonAttributes
    },
    {
        indexes: [
            {
                unique: true,
                fields: ['parent_uuid', "child_uuid", "f_a_relation_type"]
            }
        ],
        paranoid: false,
        timestamps: true,
        freezeTableName: true,
        schema: 'common',
        ...modelRenameDateAttributes
    },
);


module.exports = FARelations;

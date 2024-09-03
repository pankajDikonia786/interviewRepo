const Sq = require('sequelize');
const sequelize = require('../../config/DbConfig');
const { modelCommonAttributes, modelRenameDateAttributes } = require("../ModelAttributes");
const FunctionMainUser = sequelize.define(
    'function_main_users',
    {
        function_user_uuid: {
            allowNull: false,
            type: Sq.UUID,
            primaryKey: true,
            defaultValue: Sq.literal('uuid_generate_v4()'),
        },
        user_uuid: { type: Sq.UUID, allowNull: false },//provider billing or primary contact
        provider_org_uuid: { type: Sq.UUID, allowNull: false },
        is_billing_user: { type: Sq.BOOLEAN, defaultValue: false, allowNull: false },
        is_primary_user: { type: Sq.BOOLEAN, defaultValue: false, allowNull: false },

        ...modelCommonAttributes
    },
    {
        indexes: [
            {
                unique: true,
                fields: ['user_uuid', "provider_org_uuid",]
            }
        ],

        paranoid: false,
        timestamps: true,
        freezeTableName: true,
        schema: 'common',
        ...modelRenameDateAttributes

    },
);
FunctionMainUser.addHook('beforeSave', async (instance) => {
    if (instance.is_primary_user) {
        const primaryUserExists = await FunctionMainUser.findOne({
            where: {
                provider_org_uuid: instance.provider_org_uuid,
                is_primary_user: true,
                function_user_uuid: { [Sq.Op.ne]: instance.function_user_uuid }, // Exclude the current instance
            },
        });

        if (primaryUserExists) {
            throw new Error('There can only be one primary user per provider organization.');
        }
    }

    if (instance.is_billing_user) {
        const billingUserExists = await FunctionMainUser.findOne({
            where: {
                provider_org_uuid: instance.provider_org_uuid,
                is_billing_user: true,
                function_user_uuid: { [Sq.Op.ne]: instance.function_user_uuid }, // Exclude the current instance
            },
        });

        if (billingUserExists) {
            throw new Error('There can only be one billing user per provider organization.');
        }
    }
});


module.exports = FunctionMainUser;

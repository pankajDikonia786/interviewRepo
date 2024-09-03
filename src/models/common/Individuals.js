const Sq = require('sequelize');
const sequelize = require('../../config/DbConfig');
const { modelCommonAttributes, modelRenameDateAttributes } = require("../ModelAttributes");
const Individuals = sequelize.define(
    'individuals',
    {
        individual_uuid: {
            allowNull: false,
            type: Sq.UUID,
            primaryKey: true,
            defaultValue: Sq.literal('uuid_generate_v4()'),
        },
        user_uuid: { type: Sq.UUID },
        title: { type: Sq.STRING, },
        first_name: { type: Sq.STRING, allowNull: false },
        last_name: { type: Sq.STRING, allowNull: false },
        email: { type: Sq.STRING, allowNull: false, unique: true },
        phone: { type: Sq.STRING, },
        phone_optional: { type: Sq.STRING },
        state_id: { type: Sq.INTEGER },
        country_id: { type: Sq.INTEGER },
        avatar: { type: Sq.TEXT },
        is_provider_primary: { type: Sq.BOOLEAN, allowNull: false, defaultValue: false },
        is_conserve_team: { type: Sq.BOOLEAN, allowNull: false, defaultValue: false },
        //Worker also should be exist with atleast one provider (now not need this functionality)
        // is_worker: { type: Sq.BOOLEAN, defaultValue: false, allowNull: false },
        occupation: { type: Sq.STRING },//if individual are worker also

        ...modelCommonAttributes
    },
    {
        indexes: [
            {
                unique: true,
                fields: ['user_uuid', "email"]
            }
        ],
        paranoid: true,
        timestamps: true,
        freezeTableName: true,
        schema: 'common',
        ...modelRenameDateAttributes,
        hooks: {
            beforeDestroy: beforeDestroyHookHandler,
        },
    },
);
/* Hooks handler */
async function beforeDestroyHookHandler(individual, options) {

    const individualUpdate = { deleted_by: options.login_user.user_uuid };
    await Individuals.update(individualUpdate, { paranoid: false, where: { individual_uuid: individual.individual_uuid } });
};

module.exports = Individuals;

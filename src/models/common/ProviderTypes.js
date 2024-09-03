const Sq = require('sequelize');
const sequelize = require('../../config/DbConfig');
const ProviderTypeLogs = require("../../models/common/ProviderTypeLogs");
const { modelCommonAttributes, modelRenameDateAttributes } = require("../ModelAttributes");

const ProivderTypes = sequelize.define(
    'provider_types',
    {
        provider_type_uuid: {
            allowNull: false,
            type: Sq.UUID,
            primaryKey: true,
            defaultValue: Sq.literal('uuid_generate_v4()'),
        },
        provider_type_name: { type: Sq.STRING, allowNull: false },
        client_pay_default: { type: Sq.BOOLEAN, defaultValue: false, },
        can_invite_workers: { type: Sq.BOOLEAN, defaultValue: false, allowNull: false },
        licence_fee: { type: Sq.DECIMAL(10, 2), defaultValue: 0 },
        assignment_fee: { type: Sq.DECIMAL(10, 2), defaultValue: 0 },
        worker_fee: { type: Sq.DECIMAL(10, 2), defaultValue: 0 },
        validation_criteria_limit: { type: Sq.STRING(10), defaultValue: 0 },//0 unlimited
        change_effective_date: { type: Sq.DATE },//last updation effect date

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
ProivderTypes.addHook("afterCreate", async (providerType, options) => {
    try {
        const { provider_type_uuid } = providerType;
        const { transaction, user_uuid } = options;
        // Create provider type logs
        const ProivderTypesLogsData = {
            action_type: "create",
            provider_type_uuid: provider_type_uuid,
            desc_html: [`<p>Provider type created</p>`],//client trading_name
            new_value: providerType,
            created_by: user_uuid
        };

        await ProviderTypeLogs.create(ProivderTypesLogsData, { transaction });
    } catch (error) {
        throw error;
    };
});
ProivderTypes.addHook("afterUpdate", async (providerType, options) => {
    try {

        let { transaction, login_user, oldProviderTypesRes, ProviderTypeDetails } = options;
        const { provider_type_uuid } = ProviderTypeDetails;
        const { user_uuid, individual: { first_name, last_name } } = login_user;
        const { provider_name, client_pay_default, can_invite_workers, licence_fee,
            assignment_fee, worker_fee, validation_criteria_limit, change_effective_date
        } = oldProviderTypesRes;

        // Convert string dates to Luxon DateTime objects
        const oldEffectUnixDate = new Date(change_effective_date).getTime();
        const newEffectUnixDate = new Date(providerType.change_effective_date).getTime();
        let desc_html = [];
        let date_effect = `(Effective from ${providerType.change_effective_date})`;
        ProviderTypeDetails.client_pay_default = ProviderTypeDetails.client_pay_default === 'true' || ProviderTypeDetails.client_pay_default === true;
        ProviderTypeDetails.can_invite_workers = ProviderTypeDetails.can_invite_workers === 'true' || ProviderTypeDetails.can_invite_workers === true;

        // Create provider type logs
        if (provider_name !== ProviderTypeDetails.provider_name) {
            desc_html.push(`${first_name + ' ' + last_name} has edited provider type ${date_effect}`)

        } if (client_pay_default !== ProviderTypeDetails.client_pay_default) {

            desc_html.push(`Does Client pay by dafault? status has updated ${date_effect}`)
        } if (can_invite_workers !== ProviderTypeDetails.can_invite_workers) {

            desc_html.push(`Can account invite Workers? status has updated ${date_effect}`)
        } if (Math.floor(licence_fee) !== Math.floor(ProviderTypeDetails.licence_fee)) {

            desc_html.push(`Licence fee updated from $${licence_fee} to $${ProviderTypeDetails.licence_fee} ${date_effect}`)
        } if (Math.floor(assignment_fee) !== Math.floor(ProviderTypeDetails.assignment_fee)) {

            desc_html.push(`Assignment fee updated from $${assignment_fee} to $${ProviderTypeDetails.assignment_fee} ${date_effect}`)
        } if (Math.floor(worker_fee) !== Math.floor(ProviderTypeDetails.worker_fee)) {

            desc_html.push(`Worker fee updated from $${worker_fee} to $${ProviderTypeDetails.worker_fee} ${date_effect}`)
        } if (validation_criteria_limit != ProviderTypeDetails.validation_criteria_limit) {

            desc_html.push(`Validation criteria limit updated from $${validation_criteria_limit} to $${ProviderTypeDetails.validation_criteria_limit} ${date_effect}`)
        } if (oldEffectUnixDate !== newEffectUnixDate) {
            desc_html.push(`Change to effect date has updated from ${change_effective_date} to ${ProviderTypeDetails.change_effective_date}`)
        };
        if (desc_html.length > 0) {
            const ProivderTypesLogsData = {
                action_type: "update",
                provider_type_uuid,
                desc_html,
                new_value: ProviderTypeDetails,
                created_by: user_uuid
            };

            await ProviderTypeLogs.create(ProivderTypesLogsData, { transaction });
        };
        return
    } catch (error) {
        throw error;
    };
});

module.exports = ProivderTypes;

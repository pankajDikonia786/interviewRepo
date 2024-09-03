const Sq = require("sequelize");
const sequelize = require('../../config/DbConfig');
const { modelCommonAttributes, modelRenameDateAttributes } = require("../ModelAttributes");

const DocHistory = sequelize.define("doc_history", {
    doc_history_uuid: {
        allowNull: false,
        type: Sq.UUID,
        primaryKey: true,
        defaultValue: Sq.literal('uuid_generate_v4()'),
    },
    document_uuid: { type: Sq.UUID, allowNull: false },
    provider_doc_appr_uuid: { type: Sq.UUID },
    worker_doc_appr_uuid: { type: Sq.UUID },
    action_type: { type: Sq.STRING, allowNull: false },
    desc_html: { type: Sq.ARRAY(Sq.TEXT) },
    column_names: { type: Sq.ARRAY(Sq.STRING) },
    new_value: { type: Sq.JSONB },
    is_worker_doc: { type: Sq.BOOLEAN, allowNull: false, defaultValue: false },
    ...modelCommonAttributes,

},
    {
        paranoid: false,
        timestamps: true,
        freezeTableName: true,
        schema: 'common',
        ...modelRenameDateAttributes
    },
);

module.exports = DocHistory;
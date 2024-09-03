const Sq = require("sequelize");
const modelCommonAttributes = {
    created_by: Sq.UUID,
    updated_by: Sq.UUID,
    deleted_by: Sq.UUID,
    created_date: { type: Sq.DATE, allowNull: true },
    updated_date: { type: Sq.DATE, allowNull: true },
    deleted_date: { type: Sq.DATE, allowNull: true },

};
const modelRenameDateAttributes = {
    createdAt: 'created_date',
    updatedAt: 'updated_date',
    deletedAt: 'deleted_date',
};
module.exports = {
    modelCommonAttributes,
    modelRenameDateAttributes
};
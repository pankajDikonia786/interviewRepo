const Sq = require('sequelize');
const sequelize = require('../../config/DbConfig');
const { modelCommonAttributes, modelRenameDateAttributes } = require("../ModelAttributes");

const Modules = sequelize.define(
    'modules',
    {
        module_uuid: {
            allowNull: false,
            type: Sq.UUID,
            primaryKey: true,
            defaultValue: Sq.literal('uuid_generate_v4()'),
        },
        module_name: { type: Sq.STRING, allowNull: false },
        module_desc: { type: Sq.TEXT, },
        module_type: { type: Sq.ENUM("site induction", "company induction"), allowNull: false },
        content_link_title: { type: Sq.STRING },
        content_info: { type: Sq.TEXT },
        content_info_type: { type: Sq.ENUM("file", "text", "url", "video_url", 'file_image', 'file_video') },
        pdf_page_range: { type: Sq.JSONB },
        sort_order: { type: Sq.INTEGER },
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

module.exports = Modules;

const Sq = require("sequelize");
const sequelize = require('../../config/DbConfig'); 
const { modelCommonAttributes, modelRenameDateAttributes } = require("../ModelAttributes");

const Notifications = sequelize.define("notifications", {
    notification_uuid: {
        type: Sq.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sq.literal("uuid_generate_v4()")
    },
    message: {
        type: Sq.TEXT,
        allowNull: false
    },
    rooms: {  // Changed from 'room' to 'rooms' to store multiple rooms
        type: Sq.ARRAY(Sq.STRING),
        allowNull: true
    },
    organisation_uuid: {
        type: Sq.STRING,
        allowNull: true
    },
    user_uuid:{
        type: Sq.STRING,
        allowNull: true 
    },
    trading_name:{
        type:Sq.STRING,
        allowNull:true
    },
    is_notification:{
        type:Sq.BOOLEAN,
        defaultValue: true
    },

    is_task:{
        type:Sq.BOOLEAN,
        defaultValue: false
    },
    // notification_type: { type: Sq.ENUM("client", "provider","worker"), defaultValue: null },
    task_assgined: {  // Changed from 'room' to 'rooms' to store multiple rooms
        type: Sq.ARRAY(Sq.STRING),
        allowNull: true
    },

}, {
    paranoid: false,
    timestamps: true,
    freezeTableName: true,
    schema: "common",
    ...modelRenameDateAttributes
});

// Notifications.sync({alter:true})
module.exports = Notifications;

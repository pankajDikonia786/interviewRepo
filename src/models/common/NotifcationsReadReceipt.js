// ReadReceipt model
const Sq = require("sequelize");
const sequelize = require("../../config/DbConfig");
const {
  modelCommonAttributes,
  modelRenameDateAttributes,
} = require("../ModelAttributes");
const NotificationReadReceipt = sequelize.define(
  "notification_read_receipt",
  {
    notification_uuid: {
      type: Sq.UUID,
      allowNull: false,
      primaryKey: true,
    },
    user_uuid: {
      type: Sq.UUID,
      allowNull: false,
      primaryKey: true,
    },
    is_read: {
      type: Sq.BOOLEAN,
      defaultValue: false,
    },
    task_read: {
      type: Sq.BOOLEAN,
      defaultValue: false,
    },
    is_archived: {
      type: Sq.BOOLEAN,
      defaultValue: false,
    },

  
    // ...modelCommonAttributes
    // Additional fields for specific dashboard views
    task_read_client_dashboard: {
      type: Sq.BOOLEAN,
      defaultValue: false,
    },
    task_read_provider_dashboard: {
      type: Sq.BOOLEAN,
      defaultValue: false,
    },
    task_read_worker_dashboard: {
      type: Sq.BOOLEAN,
      defaultValue: false,
    },
    task_archived_client_dashboard: {
      type: Sq.BOOLEAN,
      defaultValue: false,
    },
    task_archived_provider_dashboard: {
      type: Sq.BOOLEAN,
      defaultValue: false,
    },
    task_archived_worker_dashboard: {
      type: Sq.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    paranoid: false,
    timestamps: true,
    freezeTableName: true,
    schema: "common",
    indexes: [
      {
        unique: true,
        fields: ["notification_uuid", "user_uuid"],
      },
    ],
    ...modelRenameDateAttributes,
  }
);
// NotificationReadReceipt.sync({alter:true})
module.exports = NotificationReadReceipt;

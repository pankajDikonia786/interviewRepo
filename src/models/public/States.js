const sequelize = require("../../config/DbConfig")
const Sq = require("sequelize");
const States = sequelize.define(
    "states",
    {
        state_id: {
            type: Sq.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },

        state_name: Sq.STRING,
        country_id: Sq.INTEGER,
        country_code: Sq.STRING,
        country_name: Sq.STRING,
        state_code: Sq.STRING,
    },
    {
        timestamps: true,
        freezeTableName: true,
        schema: "public",
        createdAt: "created_date",
        updatedAt: "updated_date",
        deletedAt: "deleted_date",
        paranoid: true,

    }
);



module.exports = States;

const sequelize = require("../../config/DbConfig")
const Sq = require("sequelize");
const Cities = sequelize.define(
    "cities",
    {
        city_id: {
            type: Sq.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },

        city_name: Sq.STRING,

        state_id: Sq.INTEGER,

        created_by: Sq.STRING,
        updated_by: Sq.STRING,
        deleted_by: Sq.STRING,
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


module.exports = Cities;

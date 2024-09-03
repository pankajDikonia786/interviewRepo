const sequelize = require("../../config/DbConfig")
const Sq = require("sequelize");
const Countries = sequelize.define(
    "countries",
    {
        country_id: {
            type: Sq.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },

        country_code: Sq.STRING,
        name: Sq.STRING(255),
        capital: Sq.STRING,
        currency: Sq.STRING,
        currency_name: Sq.STRING,
        iso3: Sq.STRING,
        phone_code: Sq.INTEGER,
        numeric_code: Sq.INTEGER,
        region: Sq.STRING,
        latitude: Sq.STRING,
        longitude: Sq.STRING,
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


module.exports = Countries;

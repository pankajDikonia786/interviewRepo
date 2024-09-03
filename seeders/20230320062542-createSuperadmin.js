'use strict';
const { Individuals } = require("../src/models/common")
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // //Add seed commands here.
    const resIndividuals = await queryInterface.bulkInsert({ tableName: 'individuals', schema: "common" }, [{
      first_name: 'super',
      last_name: "admin",
      email: "superasmin@mail.in",
      // contact_type_uuid:
      created_date: new Date()
    }], { returning: true });
// console.log("-----------",resIndividuals)
    // await queryInterface.insert({ tableName: 'users', schema: "common" }, [{
    //   individual_uuid: resIndividuals.individual_uuid,
    //   created_date: new Date()
    // }], { returning: true });

  },

  async down(queryInterface, Sequelize) {
    /**
     * Add commands to revert seed here.
     *
     * Example:
     * await queryInterface.bulkDelete('People', null, {});
     */
  }
};

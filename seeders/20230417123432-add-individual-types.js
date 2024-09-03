'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // //Add seed commands here.
    await queryInterface.bulkInsert({ tableName: 'individual_types', schema: "common" },
      [{ individual_type: 'super admin', created_date: new Date() },
      { individual_type: 'provider contact', created_date: new Date() },
      { individual_type: 'provider primary', created_date: new Date() },
      { individual_type: 'client primary', created_date: new Date() },
      { individual_type: 'client contact', created_date: new Date() },
      ], {});

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

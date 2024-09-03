'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {

    // Add seed commands here.

    await queryInterface.bulkInsert({ tableName: 'functions', schema: "common" }, [
      { function_name: "conserve-team", created_date: new Date() },
      { function_name: "client", created_date: new Date() },
      { function_name: "provider", created_date: new Date() }
    ], );
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

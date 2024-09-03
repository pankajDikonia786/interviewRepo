'use strict';
const { modelCommonAttributes, modelRenameDateAttributes } = require("../src/models/ModelAttributes");
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sq) {
    // Add altering commands here.
    await queryInterface.createTable({ tableName: "site_inductions", schema: "common" },
      {
        site_induction_uuid: {
          allowNull: false,
          type: Sq.UUID,
          primaryKey: true,
          defaultValue: Sq.literal('uuid_generate_v4()'),
        },
        site_project_uuid: Sq.UUID,
        provider_site_uuid: Sq.UUID,
        site_induction_name: Sq.STRING,
        project_no: Sq.STRING,
        is_site_induction_active: { type: Sq.BOOLEAN, defaultValue: true, allowNull: false },
        ...modelCommonAttributes
      });
  },

  async down(queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
  }
};

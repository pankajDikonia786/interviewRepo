const Sq = require("sequelize");
const sequelize = require('../../../../config/DbConfig.js');
const { GETSUCCESS, } = require('../../../../constants/ResponseConstants.js');
const { commonAttributes, } = require("../../../../services/Helper.js");
const { CompanyInductions, } = require("../../../../models/common/index.js");

//Get all not active inductions for specific client
const DashboardClientCompanyInductions = async (req, res, next) => {
    try {
        const { function_assignment_uuid } = req.query;//client function_assignment_uuid

        const companyIndutionsRes = await CompanyInductions.findAll({
            where: { company_ind_status: { [Sq.Op.eq]: "draft" }, function_assignment_uuid, },
            attributes: ["company_induction_uuid", "company_ind_name", "company_ind_publish_date"]
        },);

        GETSUCCESS(res, companyIndutionsRes, "Get Client Dashboard inactive Inductions successfully! ");

    } catch (error) {
        console.log(error);
        next(error);
    };
};

module.exports = {
    DashboardClientCompanyInductions

};
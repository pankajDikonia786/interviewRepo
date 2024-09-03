const Sq = require("sequelize");
const sequelize = require('../../../../config/DbConfig.js');
const { GETSUCCESS, } = require('../../../../constants/ResponseConstants.js');
const { commonAttributes, } = require("../../../../services/Helper.js");
const { CompanyInductions, Organisations, } = require("../../../../models/common/index.js");

//Get all not active inductions for specific client
const DashboardAllClientsCompanyInd = async (req, res, next) => {
    try {

        const companyIndutionsRes = await CompanyInductions.findAll({
            where: { company_ind_status: { [Sq.Op.eq]: "draft" }, },
            attributes: ["company_induction_uuid", "company_ind_name", "company_ind_publish_date"],
            include: {
                model: Organisations, as: 'CompIndOrg',
                attributes: ['trading_name']

            }
        },);

        GETSUCCESS(res, companyIndutionsRes, "Get All inactive Clients Dashboard Inductions successfully! ");

    } catch (error) {
        console.log(error);
        next(error);
    };
};

const DashboardGetAllClientsStatusChart = async (req, res, next) => {
    try {
        const { function_uuid } = req.query;
        const counts = await Organisations.findAll({
            attributes: [
                [Sq.literal("SUM(CASE WHEN is_org_active = true THEN 1 ELSE 0 END)"), "activeCount"],
                [Sq.literal("SUM(CASE WHEN is_org_active = false THEN 1 ELSE 0 END)"), "inactiveCount"]
            ],
            where: { function_uuid },
            raw: true
        });

        GETSUCCESS(res, counts[0], 'Get Dashboard All clients Status chart successfully!');
    } catch (error) {
        console.error('Error counting active and inactive organisations:', error);
    }
};

module.exports = {
    DashboardAllClientsCompanyInd,
    DashboardGetAllClientsStatusChart

};
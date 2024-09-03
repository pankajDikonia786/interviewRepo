const sequelize = require('../../../../config/DbConfig.js');
const { DateTime } = require('luxon');
const Sq = require("sequelize");
const { SUCCESS, GETSUCCESS } = require('../../../../constants/ResponseConstants.js');
const { Sites, WorkerSiteAccess, Individuals, Workers, Organisations } = require('../../../../models/common');
const { commonAttributes, } = require('../../../../services/Helper');

const GetClientSites = async (req, res, next) => {

    try {
        const { function_assignment_uuid, search } = req.query;

        let whereObj = { function_assignment_uuid, is_site_active: true };
        if (search) {
            whereObj = {
                ...whereObj,
                site_name: { [Sq.Op.iLike]: `%${search}%` }
            };
        };
        const sitesRes = await Sites.findAll({
            where: whereObj,
            attributes: ["site_uuid", "site_name",
            ],

        });
        GETSUCCESS(res, sitesRes, "Get all Sites of client successfully!");

    } catch (error) {
        console.log(error);
        next(error);
    };
};

const GetAllWorkersAttendanceOfSpecificSite = async (req, res, next) => {
    try {
        const { site_uuid, sign_in_date } = req.query;
        const dateGot = DateTime.fromISO(sign_in_date).toFormat("yyyy-MM-dd");
        const siteUsers = await WorkerSiteAccess.findAll({

            where: {
                [Sq.Op.and]: [{ site_uuid, },
                sequelize.where(Sq.fn("date", Sq.col("sign_in_date")), "=", dateGot),
                ],
            },
            attributes: ["worker_site_access_uuid", "worker_uuid", "client_org_uuid",
                "individual_uuid", "clock_in_out_status", "sign_in_date", "sign_out_date",
                [Sq.col("WorkerSiteIndi.first_name"), "first_name"],
                [Sq.col("WorkerSiteIndi.last_name"), "last_name"],
                [Sq.col("WorkerSiteIndi.occupation"), "occupation"],
                [Sq.col("WorkerSiteIndi.phone"), "phone"],
                [Sq.col("SiteAccessWorker.workerProvider.trading_name"), "trading_name"],

            ],
            include: [
                {
                    model: Individuals,
                    as: "WorkerSiteIndi",
                    attributes: [],
                },
                {
                    model: Workers, as: "SiteAccessWorker",
                    attributes: [],

                    include: { model: Organisations, as: "workerProvider" }
                }

            ],
        });

        GETSUCCESS(res, siteUsers, "Get all workers of specific site succssfully");
    } catch (error) {
        console.log(error);
        next(error);
    }
};
//here may be need to show additionallly worker_job_title
const GetSpecificWorkerAttendance = async (req, res, next) => {
    try {

        let { individual_uuid, site_uuid, from_date, to_date } = req.query;
        let where_query = { site_uuid };

        if (from_date && to_date) {

            if (from_date && to_date) {
                where_query[Sq.Op.and] = [
                    {
                        sign_in_date: {
                            [Sq.Op.gte]: DateTime.fromFormat(from_date, "yyyy-MM-dd").startOf('day').toUTC().toISO(),
                        },
                    },
                    {
                        sign_in_date: {
                            [Sq.Op.lte]: DateTime.fromFormat(to_date, "yyyy-MM-dd").endOf('day').toUTC().toISO(),
                        },
                    },
                ];
            }
        };

        const siteUsers = await WorkerSiteAccess.findAll({

            where: where_query,
            attributes: ["worker_site_access_uuid", "worker_uuid", "client_org_uuid",
                "individual_uuid", "clock_in_out_status", "sign_in_date", "sign_out_date",
                [Sq.col("WorkerSiteIndi.first_name"), "first_name"],
                [Sq.col("WorkerSiteIndi.last_name"), "last_name"],
                [Sq.col("WorkerSiteIndi.occupation"), "occupation"],
                
            ],
            include: [
                {
                    model: Individuals,
                    as: "WorkerSiteIndi",
                    where: { individual_uuid },
                    attributes: [],
                },
            
            ],
        });

        GETSUCCESS(res, siteUsers, "Get specific Worker attendance for a site successfully!");
    } catch (error) {
        console.log(error);
        next(error);
    }
};


module.exports = {
    GetClientSites,
    GetAllWorkersAttendanceOfSpecificSite,
    GetSpecificWorkerAttendance

};
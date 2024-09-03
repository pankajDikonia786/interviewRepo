
const path = require("path");
const Sq = require("sequelize");
const sequelize = require('../../../../config/DbConfig.js');
const { commonAttributes, deleteS3BucketFile } = require("../../../../services/Helper.js");
const { SUCCESS, GETSUCCESS, } = require('../../../../constants/ResponseConstants.js');
const {
    Workers,
    Organisations,
    Sites,
    CompanyInductions,
    WorkerCompanyInd,
    SiteInductions,
    SiteIndModule,
    WorkerSiteInd,
    WorkerAssign,
    CompanyInductionModule,
} = require('../../../../models/common');


const GetIndStatusOfWorkerByAssignedClients = async (req, res, next) => {
    try {
        const { worker_uuid, sort, order, page, limit, search, inductionType } = req.query;

        const query_obj = {};
        let where_obj = { worker_uuid };

        if (search) {

            where_obj = {
                ...where_obj,
                [Sq.Op.or]: [
                    Sq.where(Sq.col('clientAssign.trading_name'), { [Sq.Op.iLike]: `%${search}%` }),
                ]
            };
        };

        if (sort && order) {
            let orderArr = [];
            if (sort === 'trading_name') {
                orderArr.push([Sq.col('trading_name'), order]);

            } else {
                orderArr.push([sort, order]);
            };

            query_obj.order = orderArr;
        };

        if (page && limit) {
            query_obj.offset = 0 + (page - 1) * limit;
            query_obj.limit = limit;
        };

        let workerAssingRes;
        if (inductionType === 'site') {
            workerAssingRes = await WorkerAssign.findAndCountAll({
                where: where_obj,
                attributes: ["worker_uuid",
                    [Sq.col('clientAssign.trading_name'), "trading_name"],//for fix
                    [Sq.col('clientAssign.organisation_uuid'), "organisation_uuid"],
                ],
                include: {
                    model: Organisations, as: 'clientAssign',
                    attributes: ['organisation_uuid', 'trading_name', 'function_assignment_uuid'],
                    required: true,
                    include: [{
                        model: Sites, as: 'clientOrgSites',
                        where: { is_site_active: true },
                        attributes: ['site_name'],
                        required: true,
                        include: [
                            {
                                model: SiteInductions, as: 'siteInd',
                                where: { site_ind_status: 'active' },
                                required: true,
                                attributes: ['site_induction_uuid', 'site_ind_name',
                                    [
                                        Sq.literal(`(
                                        SELECT COUNT(*)
                                        FROM "common"."site_ind_module" AS "SIModule"
                                        WHERE "SIModule"."site_induction_uuid" =
                                         "clientAssign->clientOrgSites->siteInd"."site_induction_uuid"
                                    )`),
                                        'siteIndModuleCount'
                                    ]
                                ],
                                include: [{
                                    model: WorkerSiteInd, where: { worker_uuid }, as: 'siteIndWorker',
                                    attributes: ['is_induction_completed', 'updated_date'], required: false
                                },]
                            },
                        ]
                    },
                    ],
                },
                ...query_obj,
                distinct: true,
            });
        };

        if (inductionType === 'company') {
            workerAssingRes = await WorkerAssign.findAndCountAll({
                where: where_obj,
                attributes: ["worker_uuid",
                    [Sq.col('clientAssign.trading_name'), "trading_name"],
                    [Sq.col('clientAssign.organisation_uuid'), "organisation_uuid"],
                ],
                include: {
                    model: Organisations, as: 'clientAssign',
                    attributes: ['function_assignment_uuid'],
                    required: true,
                    include: [
                        {
                            model: CompanyInductions, as: 'clientCompInd',
                            where: { company_ind_status: 'active' },
                            order: [[sort, order]],
                            required: true,
                            attributes: ['company_induction_uuid', 'company_ind_name',
                                [
                                    Sq.literal(`(
                                        SELECT COUNT(*)
                                        FROM "common"."company_induction_module" AS "module"
                                        WHERE "module"."company_induction_uuid" = "clientAssign->clientCompInd"."company_induction_uuid"
                                    )`),
                                    'companyIndModuleCount'
                                ],

                            ],
                            include: [
                                {
                                    model: WorkerCompanyInd, as: 'workerCompInd',
                                    where: { worker_uuid },
                                    attributes: ['is_comp_ind_completed', 'updated_date',
                                    ],
                                    required: false,

                                },
                            ]
                        }]
                }, ...query_obj,
                distinct: true,

            });
        };

        GETSUCCESS(res, workerAssingRes, 'Get Worker site Induction by Specific clients of Provider successfully!');
    } catch (error) {
        console.log(error);
        next(error);
    };
};
module.exports = {
    GetIndStatusOfWorkerByAssignedClients

};
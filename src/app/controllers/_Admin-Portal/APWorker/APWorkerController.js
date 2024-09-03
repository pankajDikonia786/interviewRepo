const Sq = require("sequelize");
const fs = require("fs");
const ParseCsv = require("csv-parse").parse;
const sequelize = require('../../../../config/DbConfig');
const { commonAttributes, convert_key_array } = require("../../../../services/Helper");
const { SUCCESS, GETSUCCESS, } = require('../../../../constants/ResponseConstants');
const { Workers, Individuals, Invite, Organisations, Addresses } = require('../../../../models/common');
const States = require("../../../../models/public/States");
const Countries = require("../../../../models/public/Countries");

//get all worker per provider wise data
const AdminGetAllWorkers = async (req, res, next) => {
    try {
        const { sort, order, page, limit, search, } = req.query;

        let query_obj = {};
        let where_obj = {};

        if (search) {
            where_obj = {
                ...where_obj,
                [Sq.Op.or]: [
                    Sq.where(Sq.fn("concat", Sq.col("worker_individual.first_name"),
                        " ", Sq.col("worker_individual.last_name")), { [Sq.Op.iLike]: `%${search}%` }),
                ],
            };
        };

        if (sort && order) {

            query_obj.order = [['worker_individual', sort, order]]
        };
        if (page && limit) {

            query_obj.offset = 0 + (page - 1) * limit;
            query_obj.limit = limit;

        };
        // worker_individual
        const workerResponse = await Workers.findAndCountAll({
            where: where_obj,
            attributes: ['worker_uuid', 'individual_uuid', 'worker_job_title',
                [Sq.fn("concat", Sq.col("worker_individual.first_name"),
                    " ", Sq.col("worker_individual.last_name")), "workerName"],
                [Sq.col("worker_individual.phone"), "phone"],
                [Sq.col("worker_individual.avatar"), "avatar"],
                [Sq.col("worker_individual.state.state_name"), "state_name"],//worker state
            ],
            include: [{
                model: Organisations, as: "workerProvider",
                attributes: ['organisation_uuid', 'trading_name'],
            },
            {
                model: Individuals, as: 'worker_individual', attributes: [],
                include: { model: States, attributes: [] }
            }
            ],
            subQuery: false,
            ...query_obj
        });

        GETSUCCESS(res, workerResponse, "Get all Workers successfully!");
    } catch (error) {
        console.log(error);
        next(error);
    };

};


module.exports = {
    AdminGetAllWorkers,

};
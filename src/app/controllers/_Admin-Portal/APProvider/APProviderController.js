const Sq = require("sequelize");
const sequelize = require('../../../../config/DbConfig');
const { SUCCESS, GETSUCCESS, } = require('../../../../constants/ResponseConstants');
const {
    Individuals,
    Organisations,
    ProviderOrgDetails,
    Addresses,
    FARelations,
    MasterSettings,
    DocHistory,
    ProviderDocApproval,
    Documents,
    IndividualOrg
} = require('../../../../models/common');

//pending renewal date discuss pending
const GetAllProviders = async (req, res, next) => {
    try {
        const { sort, order, page, limit, search, function_uuid, contact_type_uuid } = req.query;

        let where_obj = { function_uuid };//provider
        let query_obj = {};

        if (search) {
            where_obj = {
                ...where_obj,
                [Sq.Op.or]: [
                    Sq.where(Sq.col("trading_name"), { [Sq.Op.iLike]: `%${search}%` }),
                    Sq.where(Sq.col("abn_nzbn"), { [Sq.Op.iLike]: `%${search}%` }),
                ],
            };
        };
        if (sort && order) {
            let orderArray = []

            if (sort === "phone") {
                orderArray = [{ model: Individuals, as: "individual_data", }, sort, order];
            };
            if (sort === "created_date" || sort === "trading_name") {
                orderArray = [sort, order];
            };
            query_obj.order = [orderArray]
        };

        if (page && limit) {
            query_obj.offset = 0 + (page - 1) * limit;
            query_obj.limit = limit;
        };

        const orgRes = await Organisations.findAndCountAll({
            where: where_obj,
            attributes: ["organisation_uuid", "function_uuid", "trading_name", "abn_nzbn",
                // [Sq.col("individual_data.phone"), "contact"],
                [Sq.col("provider_org_detail.master_setting.meta_value_one"), "meta_value_one"],
                [Sq.col("org_address_data.state_name"), "state_name"],
            ],
            include: [
                // {
                //     model: FunctionAssignments, as: "org_fun_assign",
                //     attributes: [],
                // },
                {
                    model: ProviderOrgDetails,
                    attributes: [],
                    include: {
                        model: MasterSettings,
                        attributes: [],
                    },
                },
                {
                    model: Individuals, as: "individual_data",
                    attributes: [],
                    through: { where: { is_user: true, contact_type_uuid }, attributes: [] },
                },
                {
                    model: Addresses, as: "org_address_data", attributes: [],
                    through: { attributes: [] }
                }
            ],
            ...query_obj,
            distinct: true,
            subQuery: false,

        });
        return GETSUCCESS(res, orgRes, 'Get all Provider details successfully!');

    } catch (error) {
        console.log(error);
        next(error);
    };
};



// invite and create user and worker and check if invited worker is already user or not

//working-------------------
// const GetAllClientsOfSpecificProvider = async (req, res, next) => {
//     try {
//         const { function_assignment_uuid } = req.body;



//     } catch (error) {
//         console.log(error);
//         next(error);

//     };
// };


// client email pending confirmation working------
/* Documents (Admin approval)*/




module.exports = {
    GetAllProviders,


};


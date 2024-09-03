const otpGenerator = require('otp-generator');
const bcrypt = require("bcrypt");
const Sq = require("sequelize");
const { login2faVerificationEmailLink, forgotPasswordEmailLink, } = require("../../../services/UserServices.js")
const { sendMobile2faOtpEmail, sendMobileForgotPasswordEmail, } = require('../../../utils/EmailUtils.js');
const { SUCCESS, AUTHSUCCESS, INVALIDRESPONSE, CUSTOMRESPONSE } = require('../../../constants/ResponseConstants.js');
const { MessageConstants } = require('../../../constants/StringConstants.js');
const {
    Individuals,
    Users,
    FAUserPermissions,
    Organisations,
    FunctionAssignments,
    RoleAssignments,
    Workers
} = require('../../../models/common/index.js');
const { generateAccessToken, } = require('../../../middlewares/AuthMiddleware.js');
const { commonAttributes } = require('../../../services/Helper.js');

/* Mobile Client Auth Api's*/
//device_token and related fields needs to decide yet and need to discuss email redirect link pending
const LoginClient = async (req, res, next) => {

    try {
        let { email, password, two_factor_auth, mobile_type, device_token } = req.body;

        //check email
        const individualRes = await Individuals.findOne({
            where: { email: { [Sq.Op.iLike]: email, }, user_uuid: { [Sq.Op.ne]: null } },
            attributes: { exclude: commonAttributes },
            include: [{
                model: Users, as: "user_data", attributes: ["user_uuid", "password"],
                attributes: { exclude: commonAttributes },
                required: true,
                include: {
                    model: FAUserPermissions, as: "userPerm", where: {
                        is_user_perm_active: true,
                        // is_default_preferred_login:true,
                        org_function_type: "client"
                    }, attributes: ["fa_user_permission_uuid", "function_assignment_uuid"],
                    order: [["created_date", "ASC"]]//most old only
                }
            },]
        });

        if (!individualRes || !individualRes?.user_data?.userPerm || !(await bcrypt.compare(password, individualRes.user_data.password))) {
            return INVALIDRESPONSE(res, !individualRes ? MessageConstants.EmailNotExistMessage : `Email or password is incorrect!`);
        };
        //Generate the OTP for 2fa verification if 2fa false
        let current_date = new Date();
        if (two_factor_auth === "false" || two_factor_auth === false) {
            const otp = otpGenerator.generate(4, {
                upperCase: false, specialChars: false,
                numeric: true, lowerCaseAlphabets: false
            });
            //Hash the OTP
            let otp_bcrypted = await bcrypt.hash(otp, 10);
            await Users.update({
                user_otp: otp_bcrypted, otp_created_date: current_date
            }, {
                where: { user_uuid: individualRes.user_data.user_uuid },
                // returning: true, plain: true
            });

            //Start sending 2fa Otp email //
            const emailDetails = {
                email: individualRes.email,
                otp,
                user_name: `${individualRes.title || ""} ${individualRes.first_name} ${individualRes.last_name}`

            };
            //Send Email
            sendMobile2faOtpEmail(emailDetails,);

            return SUCCESS(res, `${otp} OTP emailed successfully!`);
        };

        //if 2fa true
        if (two_factor_auth === true || two_factor_auth === "true") {

            const { function_assignment_uuid } = individualRes.user_data.userPerm;
            const orgRes = await FunctionAssignments.findOne({
                where: { function_assignment_uuid },
                attributes: ["function_assignment_uuid", "organisation_uuid",
                    [Sq.col("trading_name"), "trading_name"],
                    [Sq.col("logo"), "logo"], [Sq.col("abn_nzbn"), "abn_nzbn"]
                ],
                include: { model: Organisations, as: "org_data", attributes: [] }
            });
            const accessToken = generateAccessToken({ user_uuid: individualRes.user_data.user_uuid, });
            //response data
            const response = { token: accessToken, orgData: orgRes };
            //update login date
            await Users.update({ last_login: current_date }, {
                where: { user_uuid: individualRes.user_data.user_uuid },
            });
            AUTHSUCCESS(res, response, 'Client Login successfully!');
        };

    } catch (error) {
        console.log(error);
        next(error);
    };
};

//Resend Client 2fa verification email otp
const ResendLoginOtp = async (req, res, next) => {
    try {
        let { email } = req.body;

        const individualRes = await Individuals.findOne({
            where: { email: { [Sq.Op.iLike]: email, }, user_uuid: { [Sq.Op.ne]: null } },
            attributes: { exclude: commonAttributes },
            include: [{
                model: Users, as: "user_data", attributes: ["user_uuid", "password"],
                attributes: { exclude: commonAttributes },
                required: true,
                include: {
                    model: FAUserPermissions, as: "userPerm", where: {
                        // is_user_perm_active: true,
                        org_function_type: "client"
                    }, attributes: ["fa_user_permission_uuid", "function_assignment_uuid"],
                    order: [["created_date", "ASC"]]
                }
            },]
        });
        if (!individualRes || !individualRes?.user_data?.userPerm)
            return INVALIDRESPONSE(res, 'Invalid Email!');

        //Generate the OTP for 2fa verification
        const otp = otpGenerator.generate(4, {
            upperCase: true, specialChars: false,
            numeric: true, lowerCaseAlphabets: false
        });
        let current_date = new Date();
        //Hash the OTP
        let otp_bcrypted = await bcrypt.hash(otp, 10);

        await Users.update({
            user_otp: otp_bcrypted, otp_created_date: current_date
        }, { where: { user_uuid: individualRes.user_data.user_uuid }, returning: true, plain: true });
        //Start sending 2fa Otp email  //
        const emailDetails = {
            email: individualRes.email,
            otp,
            user_name: `${individualRes.title || ""} ${individualRes.first_name} ${individualRes.last_name}`
        };
        //Send Email
        sendMobile2faOtpEmail(emailDetails);

        SUCCESS(res, 'OTP emailed successfully!');

    } catch (error) {
        console.log(error);
        next(error);
    };
};

const LoginVerifyClient = async (req, res, next) => {

    try {
        let { email, user_otp } = req.body;

        const individualRes = await Individuals.findOne({
            where: { email: { [Sq.Op.iLike]: email, }, user_uuid: { [Sq.Op.ne]: null }, },
            attributes: { exclude: commonAttributes },

            include: [{
                model: Users, as: "user_data", attributes: ["user_uuid", "otp_created_date", "user_otp"],
                attributes: { exclude: commonAttributes },
                required: true,
                include: {
                    model: FAUserPermissions, as: "userPerm", where: {
                        // is_user_perm_active: true,
                        org_function_type: "client"
                    }, attributes: ["fa_user_permission_uuid", "function_assignment_uuid"],
                    order: [["created_date", "ASC"]]
                }
            },]
        });

        if (!individualRes) return INVALIDRESPONSE(res, 'Invalid Email!');

        // check if two minutes ( 120 seconds) have passed
        const date = new Date();
        const diff = date - individualRes.user_data.otp_created_date;
        const diffMinutes = diff / 1000;

        if (diffMinutes > 1800)
            return INVALIDRESPONSE(res, 'OTP has expired!');

        if (!(await bcrypt.compare(user_otp, individualRes.user_data.user_otp)))
            return INVALIDRESPONSE(res, 'Invalid OTP!');
        //Generate token
        const accessToken = generateAccessToken({ user_uuid: individualRes.user_data.user_uuid, });
        //org details
        const { function_assignment_uuid } = individualRes.user_data.userPerm;
        const orgData = await FunctionAssignments.findOne({
            where: { function_assignment_uuid },
            attributes: ["function_assignment_uuid", "organisation_uuid",
                [Sq.col("trading_name"), "trading_name"],
                [Sq.col("logo"), "logo"], [Sq.col("abn_nzbn"), "abn_nzbn"]
            ],
            include: { model: Organisations, as: "org_data", attributes: [] }
        });

        const response = { token: accessToken, orgData };
        //update last login
        await Users.update({ last_login: date }, {
            where: { user_uuid: individualRes.user_data.user_uuid },
        });
        return AUTHSUCCESS(res, response, 'Client Login successfully!');

    } catch (error) {
        console.log(error);
        next(error);

    };
};
//app url redirect link (password_reset_link) pending yet
const ForgotPasswordClient = async (req, res, next) => {
    try {
        const { email } = req.body;
        const individualRes = await Individuals.findOne({
            where: { email: { [Sq.Op.iLike]: email, }, user_uuid: { [Sq.Op.ne]: null }, },
            attributes: { exclude: commonAttributes },

            include: [{
                model: Users, as: "user_data", attributes: ["user_uuid", "otp_created_date", "user_otp"],
                attributes: { exclude: commonAttributes },
                required: true,
                include: {
                    model: FAUserPermissions, as: "userPerm", where: {
                        is_user_perm_active: true,
                        // is_default_preferred_login: true,
                        org_function_type: "client"
                    }, attributes: ["fa_user_permission_uuid", "function_assignment_uuid"],
                    order: [["created_date", "ASC"]]
                }
            },]
        });
        if (!individualRes || !individualRes?.user_data?.userPerm)
            return INVALIDRESPONSE(res, MessageConstants.EmailNotExistMessage);

        const emailDetails = {
            email: individualRes.email,
            user_name: `${individualRes.title || ""} ${individualRes.first_name} ${individualRes.last_name}`
            // password_reset_link
        };
        sendMobileForgotPasswordEmail(emailDetails,);

        SUCCESS(res, `We sent a password reset link to ${email}`);
    } catch (error) {
        console.log(error);
        next(error);
    };
};

const ResetPasswordClient = async (req, res, next) => {
    try {
        let { email, password } = req.body;

        const individualRes = await Individuals.findOne({
            where: { email: { [Sq.Op.iLike]: email, }, user_uuid: { [Sq.Op.ne]: null }, },
            attributes: { exclude: commonAttributes },

            include: [{
                model: Users, as: "user_data", attributes: ["user_uuid", "otp_created_date", "user_otp"],
                attributes: { exclude: commonAttributes },
                required: true,
                include: {
                    model: FAUserPermissions, as: "userPerm", where: {
                        is_user_perm_active: true,
                        // is_default_preferred_login: true,
                        org_function_type: "client"
                    }, attributes: ["fa_user_permission_uuid", "function_assignment_uuid"],
                    order: [["created_date", "ASC"]]
                }
            },]
        });

        if (!individualRes || !individualRes?.user_data?.userPerm)
            return NOTFOUND(res, `Email is not registered!`);

        if (!password) return INVALIDRESPONSE(res, 'Password required!');
        //Hash the password
        password = await bcrypt.hash(password, 10);
        await Users.update({ password: password }, {
            where: {
                user_uuid: individualRes.user_data.user_uuid
            }
        });
        return CUSTOMRESPONSE(res, 'Password Updated Successfully');

    } catch (error) {
        console.log(error);
        next(error);
    };
};
//need to update the code because worker can exist in the system without any Provider also
///recheck individual can have multiple ids as worker
/* Mobile Worker Auth Api's*/
const LoginWorker = async (req, res, next) => {
    try {
        let { email, password, two_factor_auth, mobile_type, device_token } = req.body;

        //check email
        const individualRes = await Individuals.findOne({
            where: { email: { [Sq.Op.iLike]: email, }, user_uuid: { [Sq.Op.ne]: null } },
            attributes: { exclude: commonAttributes },
            include: [{
                where: { is_worker: true },
                model: Users, as: "user_data",
                attributes: ["user_uuid", "password", "last_login", "otp_created_date", "is_worker"],
                required: true,
            },
            { model: Workers, as: "worker_data", attributes: ["worker_uuid"] }//check any one as worker
            ], raw: true, nest: true
        });
        if (!individualRes || !individualRes?.worker_data.worker_uuid || !(await bcrypt.compare(password, individualRes.user_data.password))) {
            if (!individualRes) return INVALIDRESPONSE(res, MessageConstants.EmailNotExistMessage);
            return INVALIDRESPONSE(res,
                `${!individualRes?.worker_data && individualRes?.user_data?.is_worker ?
                    "You are not longer part of the Conserve system,Please contact with Conserve Administration!"
                    : 'Username or password is incorrect!'}`);
        };
        //Generate the OTP for 2fa verification if 2fa false
        let current_date = new Date();
        if (two_factor_auth === "false" || two_factor_auth === false) {
            const otp = otpGenerator.generate(4, {
                upperCase: false, specialChars: false,
                numeric: true, lowerCaseAlphabets: false
            });
            //Hash the OTP
            let otp_bcrypted = await bcrypt.hash(otp, 10);
            await Users.update({
                user_otp: otp_bcrypted, otp_created_date: current_date,
                mobile_type, device_token
            }, {
                where: { user_uuid: individualRes.user_data.user_uuid },
                // returning: true, plain: true
            });

            //Start sending 2fa Otp email //
            const emailDetails = {
                email: individualRes.email,
                otp,
                user_name: `${individualRes.title || ""} ${individualRes.first_name} ${individualRes.last_name}`

            };
            //Send Email
            sendMobile2faOtpEmail(emailDetails,);

            return SUCCESS(res, `${otp} OTP emailed successfully!`);
        };

        //if 2fa true
        if (two_factor_auth === true || two_factor_auth === "true") {

            const accessToken = generateAccessToken({ user_uuid: individualRes.user_data.user_uuid, });
            //update login date
            await Users.update({ last_login: current_date }, {
                where: { user_uuid: individualRes.user_data.user_uuid },
            });

            // delete individualRes.worker_data;
            individualRes.user_data.password = null;

            //response data
            const response = { token: accessToken, invividualData: individualRes };
            AUTHSUCCESS(res, response, 'Worker Login successfully!');
        };

    } catch (error) {
        console.log(error);
        next(error);
    };

};
const ResendWorkerLoginOtp = async (req, res, next) => {
    try {
        let { email } = req.body;

        //check email
        const individualRes = await Individuals.findOne({
            where: { email: { [Sq.Op.iLike]: email, }, user_uuid: { [Sq.Op.ne]: null } },
            attributes: { exclude: commonAttributes },
            include: [{
                where: { is_worker: true },
                model: Users, as: "user_data",
                attributes: ["user_uuid", "password", "last_login", "otp_created_date", "is_worker"],
                required: true,
            },
            { model: Workers, as: "worker_data", attributes: ["worker_uuid"] }
            ], raw: true, nest: true
        });
        if (!individualRes || !individualRes?.worker_data.worker_uuid) {
            return INVALIDRESPONSE(res,
                `${!individualRes?.worker_data.worker_uuid && individualRes?.user_data?.is_worker ?
                    "You are not longer part of the Conserve system,Please contact with Conserve Administration!"
                    : 'Invalid email!'}`);
        };

        //Generate the OTP for 2fa verification
        const otp = otpGenerator.generate(4, {
            upperCase: true, specialChars: false,
            numeric: true, lowerCaseAlphabets: false
        });
        let current_date = new Date();
        //Hash the OTP
        let otp_bcrypted = await bcrypt.hash(otp, 10);

        await Users.update({
            user_otp: otp_bcrypted, otp_created_date: current_date
        }, {
            where: { user_uuid: individualRes.user_data.user_uuid },
        });
        //Start sending 2fa Otp email  //
        const emailDetails = {
            email: individualRes.email,
            otp,
            user_name: `${individualRes.title || ""} ${individualRes.first_name} ${individualRes.last_name}`
        };
        //Send Email
        sendMobile2faOtpEmail(emailDetails);

        SUCCESS(res, 'OTP emailed successfully!');

    } catch (error) {
        console.log(error);
        next(error)
    };
};

const LoginVerifyWorker = async (req, res, next) => {

    try {
        let { email, user_otp } = req.body;

        //check email
        const individualRes = await Individuals.findOne({
            where: { email: { [Sq.Op.iLike]: email, }, user_uuid: { [Sq.Op.ne]: null } },
            attributes: { exclude: commonAttributes },
            include: [{
                model: Users, as: "user_data",
                where: { is_worker: true },
                attributes: ["user_uuid", "password", "last_login", "otp_created_date", "user_otp", "is_worker"],
                required: true,
            },
            { model: Workers, as: "worker_data", attributes: ["worker_uuid"] }
            ], raw: true, nest: true
        });
        if (!individualRes || !individualRes?.worker_data.worker_uuid) {
            return INVALIDRESPONSE(res,
                `${!individualRes?.worker_data.worker_uuid && individualRes?.user_data?.is_worker ?
                    "You are not longer part of the Conserve system,Please contact with Conserve Administration!"
                    : 'Invalid email!'}`);
        };
        // check if two minutes ( 120 seconds) have passed
        const date = new Date();
        const diff = date - individualRes.user_data.otp_created_date;
        const diffMinutes = diff / 1000;

        if (diffMinutes > 1800)
            return INVALIDRESPONSE(res, 'OTP has expired!');

        if (!(await bcrypt.compare(user_otp, individualRes.user_data.user_otp)))
            return INVALIDRESPONSE(res, 'Invalid OTP!');
        //Generate token
        const accessToken = generateAccessToken({ user_uuid: individualRes.user_data.user_uuid, });

        //update last login
        await Users.update({ last_login: date }, {
            where: { user_uuid: individualRes.user_data.user_uuid },
        });

        // delete individualRes.worker_data;
        individualRes.user_data.password = null;

        //response data
        const response = { token: accessToken, invividualData: individualRes };
        return AUTHSUCCESS(res, response, 'Worker Login successfully!');

    } catch (error) {
        console.log(error);
        next(error);

    };
};

//app url redirect link (password_reset_link) pending yet
const ForgotPasswordWorker = async (req, res, next) => {
    try {
        const { email } = req.body;
        //check email
        const individualRes = await Individuals.findOne({
            where: { email: { [Sq.Op.iLike]: email, }, user_uuid: { [Sq.Op.ne]: null } },
            attributes: { exclude: commonAttributes },
            include: [{
                model: Users, as: "user_data",
                where: { is_worker: true },
                attributes: ["user_uuid", "password", "last_login", "otp_created_date", "user_otp", "is_worker"],
                required: true,
            },
            { model: Workers, as: "worker_data", attributes: ["worker_uuid"] }
            ], raw: true, nest: true
        })

        if (!individualRes || !individualRes?.worker_data.worker_uuid) {
            return INVALIDRESPONSE(res,
                `${(!individualRes?.worker_data.worker_uuid) && individualRes?.user_data?.is_worker ?
                    "You are not longer part of the Conserve system,Please contact with Conserve Administration!"
                    : MessageConstants.EmailNotExistMessage}`);
        };

        const emailDetails = {
            email: individualRes.email,
            user_name: `${individualRes.title || ""} ${individualRes.first_name} ${individualRes.last_name}`
            // password_reset_link
        };
        sendMobileForgotPasswordEmail(emailDetails,);

        SUCCESS(res, `We sent a password reset link to ${email}`);
    } catch (error) {
        console.log(error);
        next(error);
    };
};

// const ResetPasswordWorker = async (req, res, next) => {
//     try {
//         let { email, password } = req.body;

//         const individualRes = await Individuals.findOne({
//             where: { email: { [Sq.Op.iLike]: email, }, is_worker: true, user_uuid: { [Sq.Op.ne]: null } },
//             attributes: { exclude: commonAttributes },
//             include: [{
//                 model: Users, as: "user_data", attributes: ["user_uuid", "password"],
//                 attributes: ["user_uuid", "password", "last_login", "otp_created_date", "user_otp"],
//                 required: true,
//             },
//             { model: Workers, as: "worker_data", attributes: ["worker_uuid"] }
//             ], raw: true, nest: true
//         })

//         if (!individualRes || !individualRes?.worker_data) {
//             return INVALIDRESPONSE(res,
//                 `${!individualRes?.worker_data && individualRes?.is_worker ?
//                     "You are not longer part of the Conserve system,Please contact with Conserve Administration!"
//                     : 'Invalid email!'}`);
//         };

//         if (!password) return INVALIDRESPONSE(res, 'Password required!');
//         //Hash the password
//         password = await bcrypt.hash(password, 10);
//         await Users.update({ password: password }, {
//             where: {
//                 user_uuid: individualRes.user_data.user_uuid
//             }
//         });
//         return CUSTOMRESPONSE(res, 'Password Updated Successfully');

//     } catch (error) {
//         console.log(error);
//         next(error);
//     };
// };

module.exports = {
    LoginClient,
    ResendLoginOtp,
    LoginVerifyClient,
    ForgotPasswordClient,
    ResetPasswordClient,

    LoginWorker,
    ResendWorkerLoginOtp,
    LoginVerifyWorker,
    ForgotPasswordWorker,

};
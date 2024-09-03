const otpGenerator = require('otp-generator');
const bcrypt = require("bcrypt");
const Sq = require("sequelize");
const { login2faVerificationEmailLink, forgotPasswordEmailLink, } = require("../../services/UserServices.js")
const { send2faOtpEmail, sendForgotPasswordEmail, } = require('../../utils/EmailUtils');
const { SUCCESS, AUTHSUCCESS, INVALIDRESPONSE, NOTFOUND, CUSTOMRESPONSE, } = require('../../constants/ResponseConstants');
const { MessageConstants } = require('../../constants/StringConstants.js');
const { Individuals, Users, IndividualOrg, LoginHistory, FAUserPermissions, Organisations, FunctionAssignments, RoleAssignments } = require('../../models/common');
const { generateAccessToken, } = require('../../middlewares/AuthMiddleware');
const { commonAttributes } = require('../../services/Helper.js');
const Roles = require('../../models/public/Roles.js');

//SingIn all users login(admin,client,worker)
//worker data pending
const SignIn = async (req, res, next) => {

    try {
        let { email, password, trustTwoFactorAuth } = req.body;

        //check email
        const individualRes = await Individuals.findOne({
            where: { email: { [Sq.Op.iLike]: email, }, user_uuid: { [Sq.Op.ne]: null } },
            attributes: { exclude: commonAttributes },
            include: [{
                model: Users, as: "user_data", attributes: ['user_uuid', 'password', 'is_worker', 'two_factor_auth'],
                attributes: { exclude: commonAttributes },
            },]
        });

        if (!individualRes || !individualRes.user_data || !(await bcrypt.compare(password, individualRes.user_data.password))) {

            return INVALIDRESPONSE(res, !individualRes ? MessageConstants.EmailNotExistMessage : `Email or password is incorrect!`);
        };
        //Generate the OTP for 2fa verification if 2fa false
        let current_date = new Date();
        //if two 2fa trustTwoFactorAuth = false and 2fa enabled
        if ((trustTwoFactorAuth === "false" || trustTwoFactorAuth === false) && individualRes.user_data?.two_factor_auth) {
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
            });

            //Start sending 2fa Otp email //
            const emailDetails = {
                email: individualRes.email,
                otp,
                user_name: `${individualRes.title ? individualRes.title : ""} ${individualRes.first_name} ${individualRes.last_name}`
            };
            const url = await login2faVerificationEmailLink(individualRes.email, otp);
            send2faOtpEmail(emailDetails, url);
            //send otp
            return SUCCESS(res, `${otp} OTP emailed successfully!`);
        };

        //if 2fa local trust device and two_factor_auth true
        let resData;
        if (!individualRes.user_data?.two_factor_auth || (trustTwoFactorAuth && individualRes.user_data?.two_factor_auth)) {
            const { user_data } = individualRes;
            //if org. user and not conserve team
            if (individualRes.is_conserve_team === false || individualRes.is_conserve_team === "false") {

                //if worker already is_default_login_as_worker then no need to org data
                if (user_data.is_worker === true && user_data.is_default_login_as_worker === true)
                    return
                //check for the specific  organisation user (client or provider)
                resData = await FAUserPermissions.findOne(
                    {
                        where: {
                            [Sq.Op.or]: [{ is_user_perm_active: true }, { is_default_preferred_login: true },],
                            user_uuid: individualRes.user_data.user_uuid,
                        }, attributes: { exclude: commonAttributes },
                        order: [["created_date", "ASC"]],
                        include: {
                            model: FunctionAssignments, as: "user_perm_fa", attributes: { exclude: commonAttributes },
                            include: { model: Organisations, as: "org_data", attributes: { exclude: commonAttributes }, }
                        }
                    });

            } else {
                //conserver admin user(roler)
                resData = await RoleAssignments.findOne({
                    where: { user_uuid: individualRes.user_data.user_uuid },
                    include: { model: Roles, as: "role", attributes: { exclude: commonAttributes } }
                });
            };
            //if user not remain the part of org user or as worker (but user login exist)
            if (!user_data.is_worker && !resData) {
                return INVALIDRESPONSE(res, MessageConstants.UserNotLongerMessage);

            };
            individualRes.user_data.password = null;
            const accessToken = generateAccessToken({ user_uuid: individualRes.user_data.user_uuid, });
            //response data
            const response = { token: accessToken, userData: individualRes, data: resData ? resData : "" };
            //update login date
            await Users.update({ last_login: current_date }, {
                where: { user_uuid: individualRes.user_data.user_uuid },
            });
            AUTHSUCCESS(res, response, 'User Login successfully!');
        };

    } catch (error) {
        console.log(error);
        next(error);
    };
};

//Resend 2fa verification email otp
const ResendSignInOtp = async (req, res, next) => {
    try {
        let { email } = req.body;

        const individualRes = await Individuals.findOne({
            where: { email: { [Sq.Op.iLike]: email, } }, attributes: ["individual_uuid", "title", "first_name",
                "last_name", "email"],
            include: { model: Users, as: "user_data", attributes: ["user_uuid", "password"] }
        });
        if (!individualRes) return INVALIDRESPONSE(res, 'Invalid Email!');

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
            user_name: `${individualRes.title ? individualRes.title : ""} ${individualRes.first_name} ${individualRes.last_name}`
        };
        //Create url link
        const url = await login2faVerificationEmailLink(individualRes.email, otp);
        send2faOtpEmail(emailDetails, url);

        SUCCESS(res, 'OTP emailed successfully!');

    } catch (error) {
        console.log(error);
        next(error)
    }
};
//verify the 2fa otp
//worker data pending 
const SignInVerify = async (req, res, next) => {
    try {
        let { email, user_otp } = req.body;

        const individualRes = await Individuals.findOne({
            where: { email: { [Sq.Op.iLike]: email, }, user_uuid: { [Sq.Op.ne]: null }, },
            attributes: { exclude: commonAttributes },
            include: [{
                model: Users, as: "user_data", attributes:
                    ['user_uuid', 'otp_created_date', 'user_otp', 'is_worker', 'two_factor_auth']
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
        let resData;
        const { user_data } = individualRes;
        if (individualRes.is_conserve_team === false || individualRes.is_conserve_team === "false") {

            //if worker already is_default_login_as_worker then no need to org data
            if (user_data.is_worker === true && user_data.is_default_login_as_worker === true)
                return

            resData = await FAUserPermissions.findOne({
                where: {
                    user_uuid: individualRes.user_data.user_uuid,
                    is_user_perm_active: true,
                }, attributes: { exclude: commonAttributes },
                order: [["created_date", "ASC"]],
                include: {
                    model: FunctionAssignments, as: "user_perm_fa", attributes: { exclude: commonAttributes },
                    include: { model: Organisations, as: "org_data", attributes: { exclude: commonAttributes }, }
                }
            });

        } else {
            //Conserve admin Data (roles)
            resData = await RoleAssignments.findOne({
                where: { user_uuid: individualRes.user_data.user_uuid },
                include: { model: Roles, as: "role", attributes: { exclude: commonAttributes } }
            });
        };

        //if user not remainthe part of org or as worker
        if (!user_data.is_worker && !resData) {
            return INVALIDRESPONSE(res, MessageConstants.UserNotLongerMessage);

        };
        individualRes.user_data.password = null;
        const response = { token: accessToken, userData: individualRes, data: resData ? resData : "" };
        //update last login
        await Users.update({ last_login: date }, {
            where: { user_uuid: individualRes.user_data.user_uuid },
        });

        return SUCCESS(res, response)

    } catch (error) {
        console.log(error);
        next(error);

    };
};
const ForgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;
        const inndividualRes = await Individuals.findOne({
            where: {
                email: { [Sq.Op.iLike]: email },
                user_uuid: { [Sq.Op.ne]: null }
            }
        });
        if (!inndividualRes) return INVALIDRESPONSE(res, MessageConstants.EmailNotExistMessage);

        const url = await forgotPasswordEmailLink(inndividualRes.email);

        const emailDetails = {
            email: inndividualRes.email,
            user_name: inndividualRes.title ? inndividualRes.title : "" + " " + inndividualRes.first_name + " " + inndividualRes.last_name,
        };
        sendForgotPasswordEmail(emailDetails, url);

        SUCCESS(res, `We sent a password reset link to ${email}`);
    } catch (error) {
        next(error);
    };
};

const ResetPassword = async (req, res, next) => {
    try {
        let { email, password } = req.body;

        const individualRes = await Individuals.findOne({
            where: { email: { [Sq.Op.iLike]: email }, user_uuid: { [Sq.Op.ne]: null } },
            include: { model: Users, as: "user_data", attributes: ["user_uuid"] }
        });

        if (!individualRes) return NOTFOUND(res, `Email is not registered!`);
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

module.exports = {

    SignIn,
    SignInVerify,
    ForgotPassword,
    ResetPassword,
    ResendSignInOtp
};

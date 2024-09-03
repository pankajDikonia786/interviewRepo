const bcrypt = require("bcrypt");
const { Individuals, Users, } = require('../../../models/common');
module.exports.RegisterAdmin = async (req, res) => {

    const AdminDetails = req.body;
    let individualRes = await Individuals.findOne({
        where: { email: AdminDetails.email },
        include: {
            model: Users, as: "user_data", attributes: ["user_uuid", "password",]
        }
    });
    if (individualRes) {
        return res.send({
            status: 400,
            success: false,
            message: 'Username already exists. Please try a different Username!'
        })
    };
    if (AdminDetails.password) {
        AdminDetails.password = await bcrypt.hash(AdminDetails.password, 10);
    };
    AdminDetails.is_conserve_team = true;
    individualRes = await Individuals.create(AdminDetails);
    const userRes = await Users.create({
        individual_uuid: individualRes.individual_uuid,
        password: AdminDetails.password
    });
    await Individuals.update({ user_uuid: userRes.user_uuid },
        { where: { individual_uuid: individualRes.individual_uuid, } });
    res.json({
        status: 200,
        success: true,
        message: "Admin created successfully!"

    });
};
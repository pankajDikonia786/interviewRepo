const Sq = require("sequelize");
const { SUCCESS, GETSUCCESS, INVALIDRESPONSE, ALREADYEXISTREPONSE, } = require('../../../constants/ResponseConstants');

// Stripe secret key
const stripe = require("stripe")(process.env.stripe_secret_key);

const CreateProduct = async (req, res, next) => {
    try {
        const request_body = req.body;

        const stripeRes = await stripe.products
            .create({
                name: request_body.name,
                description: request_body.description,
            });

        let invite_details = {
            object_id: response.id,
            name: request_body.name,
            description: request_body.description,
        };

    } catch (error) {
        console.log(error);
        next(error);

    };
};

module.exports = {
    CreateProduct
};
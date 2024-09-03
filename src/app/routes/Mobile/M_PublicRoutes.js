module.exports = (app) => {
    const {
        GetAllCountriesAndStates,
        GetAllCountries,
        GetAllStatesbyCountryId,

    } = require('../../controllers/PublicController');

    const { upload } = require('../../../middlewares/File-UploadMiddleware');
    /* Mobile Public Routes */
    app.get('/api-mobile/worker/GetAllCountriesAndStates', upload.none(), GetAllCountriesAndStates);
    app.get('/api-mobile/worker/GetAllCountries', upload.none(), GetAllCountries);
    app.get('/api-mobile/worker/GetAllStatesbyCountryId', upload.none(), GetAllStatesbyCountryId);

};

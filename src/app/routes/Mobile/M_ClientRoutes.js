module.exports = (app) => {

    /* Mobile Client Controller */
    const {
        GetClientSites,
        GetAllWorkersAttendanceOfSpecificSite,
        GetSpecificWorkerAttendance

    } = require('../../controllers/Mobile/Mobile-Client/M_ClientController');

    const { upload } = require('../../../middlewares/File-UploadMiddleware');
    const { authenticateToken } = require('../../../middlewares/AuthMiddleware');

    /* Mobile Client Routes */
    app.get('/api-mobile/client/GetClientSites', authenticateToken, upload.none(), GetClientSites);
    app.get('/api-mobile/client/GetAllWorkersAttendanceOfSpecificSite', authenticateToken, upload.none(), GetAllWorkersAttendanceOfSpecificSite);
    app.get('/api-mobile/client/GetSpecificWorkerAttendance', authenticateToken, upload.single("avatar"), GetSpecificWorkerAttendance);


}; 


    module.exports = (app) => {

        const{GetCommonNotifications,GetAllDeshboardTasks,UpdateTaskArchiveStatus,MarkNotificationAsRead,MarkTaskAsRead,GetNotificationTasksForAdminPortal} = require("../controllers/Common/CommonNotificationController");
        const { upload } = require('../../middlewares/File-UploadMiddleware');

         
         //notification Api's
         app.get('/api/GetCommonNotifications', upload.none(), GetCommonNotifications);
         app.get('/api/GetAllDeshboardTasks', upload.none(), GetAllDeshboardTasks);
         app.patch('/api/UpdateTaskArchiveStatus', upload.none(), UpdateTaskArchiveStatus);
         app.patch('/api/MarkNotificationAsRead', upload.none(), MarkNotificationAsRead);
         app.patch('/api/MarkTaskAsRead', upload.none(), MarkTaskAsRead);
         app.get('/api/GetNotificationTasksForAdminPortal', upload.none(), GetNotificationTasksForAdminPortal);

       
     };

const fs = require('fs');
const path = require('path');
// file system

//load the route files from folder and subfolders

module.exports = (app) => {
    const routeDirPath = path.join(__dirname, '../app/routes');
    const items = fs.readdirSync(routeDirPath);

    items.forEach((item) => {
        const itemPath = path.join(routeDirPath, item);

        if (fs.statSync(itemPath).isFile() && item.endsWith('.js')) {
            const router = require(itemPath);
            router(app);
            console.log(`${itemPath} route loaded`);
        } else if (fs.statSync(itemPath).isDirectory()) {
            const routeFiles = fs.readdirSync(itemPath);

            routeFiles.forEach((file) => {
                if (file.endsWith('.js')) {
                    const routeFilePath = path.join(itemPath, file);
                    const router = require(routeFilePath);
                    router(app);
                    console.log(`${routeFilePath} route loaded`);
                }
            });
        }
    });
};







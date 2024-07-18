const express =require("express")
const router =express.Router()
const upload =require("../middelware/uploadMiddelWare.js")
const authorize = require('../middelware/auth.js')
const {createUser,findUser,UpdateUser,deleteAllData,loginUser} =require("../controllers/userController.js")


router.get('/loginUser',upload.none(),loginUser);
router.delete('/deleteAllData',upload.none(),deleteAllData);
router.get('/findUser',upload.none(),authorize(),findUser);
router.put('/UpdateUser',upload.single("file"),UpdateUser);
router.delete('/deleteAllData',upload.none(),deleteAllData);

module.exports =router

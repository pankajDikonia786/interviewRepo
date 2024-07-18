const multer =require("multer")
const path =require("path")
const fs =require("fs")


var uploadPath = path.join(__dirname,'../../../public/upload')
console.log("upload",uploadPath)
function verfiyPath(uploadPath){
 if(!fs.existsSync(uploadPath)){
    fs.mkdirSync(uploadPath,{recursive:true})
 }
}
const storage = multer.diskStorage({
    destination:function(req,file,cb){
        verfiyPath(uploadPath)
        cb(null,uploadPath)
    },
    filename:function(req,file,cb){
        const unique = Date.now( ) + "_" + Math.round(Math.random())
        let extension =file.mimetype.split('/').slice(1)
        cb(null,file.fieldname+unique+'.'+extension)
    }

})
const upload =multer({storage:storage})
module.exports =upload
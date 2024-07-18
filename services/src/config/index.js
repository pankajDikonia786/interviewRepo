const mongoose =require("mongoose")

function dbConnection(){
    try {
       mongoose.connect("mongodb+srv://dikonia:dikonia1@cluster0.ibclirf.mongodb.net/",{ useNewUrlParser: true, useUnifiedTopology: true }).then(()=>{
        console.log("connection established")
       })
    } catch (error) {
        console.log(`error during connect to mongodb ${error}`)
    }
}
module.exports = dbConnection
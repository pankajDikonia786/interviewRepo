const mongoose = require("mongoose")

const postShema =mongoose.Schema({
    post_name:{
        type:String,
        
    },
    post_title:{
        type:String,
        
    },
    post:{
        type:String,
        
    },
 
    user: {
        type: mongoose.Schema.Types.ObjectId, ref: 'user'  // Make sure 'User' matches the model name registered with mongoose
    }
   
    
},
{
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  })

const Post =mongoose.model('post',postShema)
module.exports =Post
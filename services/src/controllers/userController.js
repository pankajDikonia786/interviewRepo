const User =require("../models/userModel.js")
const Post =require("../models/postModel.js")
const bcrypt =require("bcrypt")
const jwt =require("jsonwebtoken")
const { populate } = require("dotenv")

const createUser =async(req,res)=>{
    const userDetails =req.body
    const file =req.file
    let {postDetails,password} =userDetails
    console.log("postDetails",postDetails)
    userDetails.password? userDetails.password = await bcrypt.hash(userDetails.password,10):""
    const user =new User(userDetails)
    const response = await user.save().then(async(response)=>{
           if (response) {
           postDetails.user = response._id; // Assign user ID to post details
            await Post.create(postDetails); // Insert post details
        }

        res.json({
            status:200,
            success:true,
            message:"user create successfully"
        })
    }).catch((error)=>{
        res.json({
            status:400,
            success:false,
            message:`error while creating user ${error}`
        })
    })
}


const loginUser =async(req,res)=>{
    const {username,password}=req.body
    
    try {
        let user = await User.findOne({email:username})
        if(!user){
            res.json({
                status:400,
                message:"username not exist"
            })
        }
        varifyPassword = await bcrypt.compare(password,user.password)
        if(!varifyPassword){
            res.json({
                status:400,
                message:"Password not matched"
            })
        }
        let token =await jwt.sign({
            email:user.email,
            id:user._id
        },"this is perctice code",{expiresIn:"1h"})
       res.json({
        status:200,
        success:true,
        data:user,
        token:token,
        message:"login successFully"
       })
    } catch (error) {
        console.log(error)
        res.json({
            status:400,
            success:false,
            message:"something went wrong"
           })
    }
}

// const findUser =async(req,res)=>{
//    const{page,limit,sort,order} =req.query
//     const response =Post.find().populate('user')
    
//     .then((response)=>{
//         res.json({
//             status:200,
//             success:true,
//             data:response,
//             message:"user create successfully"
//         })
//     }).catch((error)=>{
//         res.json({
//             status:400,
//             success:false,
//             message:`error while creating user ${error}`
//         })
//     })
// }





const findUser = async (req, res) => {
    const loginUser =req.user

    const { page, limit, sort, order } = req.query;
    const offset = (page-1)*limit
    console.log(":::::;;",loginUser)
    try {
        const posts = await User.find().skip(offset).limit(limit)// Use 'user', not 'User'

        res.status(200).json({
            status: 200,
            success: true,
            data: posts,
            message: "Posts retrieved successfully"
        });
    } catch (error) {
        res.status(400).json({
            status: 400,
            success: false,
            message: `Error while retrieving posts: ${error.message}`
        });
    }
};
const UpdateUser = async (req, res) => {
    const { page, limit, sort, order } = req.query;
    const offset = (page-1)*limit
    try {
        const posts = await User.findByIdAndUpdate({_id:"6698b86808458f8f79f8412c"},{password:1234})

        res.status(200).json({
            status: 200,
            success: true,
            data: posts,
            message: "Posts retrieved successfully"
        });
    } catch (error) {
        res.status(400).json({
            status: 400,
            success: false,
            message: `Error while retrieving posts: ${error.message}`
        });
    }
};

const deleteAllData = async () => {
    try {
      await User.deleteMany();
      console.log('All Data successfully deleted');
    } catch (err) {
      console.log(err);
    }
  };


module.exports =
{createUser,findUser,UpdateUser,deleteAllData,loginUser}
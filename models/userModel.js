const mongoose = require("mongoose");
const { nullish } = require("zod");



const userSchema = new mongoose.Schema({
    bq_id: String,
    incubation_id: String,
    name: String,
    email: String,
    password: String,
    phone: String,
    CNIC: String,
    gender:{
        type:String,
        enum:["Male","Female"],
    },
    shift:{
        type:String,
        enum:["Morning","Evening"],
    },
    course:{
        type : String,
        enum : ["Web Development" , "Graphic Designing" , "Digital Marketing"],
        required:true,
    },
    team:{
        type: mongoose.Schema.Types.ObjectId,
        ref:"team"
    },

});

module.exports = mongoose.model('user', userSchema);
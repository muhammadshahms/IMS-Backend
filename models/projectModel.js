const mongoose = require("mongoose");

const ProjectSchema = new mongoose.Schema({
    title:{
        type:String
    },

    description:{
        type:String
    },

    file:{
        type:String
    },

    teamName:{
        type:mongoose.Schema.Types.ObjectId,
         ref: "team",
         required:true
    },

    PM:{
        type:mongoose.Schema.Types.ObjectId,
         ref: "PM",
         required:true
    }

})

module.exports = mongoose.model("project", ProjectSchema)
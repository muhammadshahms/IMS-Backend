const userPostModel = require('../models/userpostModel')
const User = require("../models/userModel")
const path = require("path");
const fs = require("fs");

const userPostController = {}

userPostController.createUserPost = async (req, res) => {
  try {
    const { title, description, link } = req.body;
    
    
    const userId = req.user.id;
    
    
    // Create post with user ID
    const newPost = await userPostModel.create({ 
      title, 
      description, 
      link,
      user: userId  // ✅ User ID set ho jayegi
    });
    
    // ✅ Post create hone ke baad user data populate karke return karo
    const populatedPost = await userPostModel
      .findById(newPost._id)
      .populate("user", "name");
    
    res.status(201).json({ 
      message: "Post created successfully",
      post: populatedPost  // Frontend ko populated post milega
    });
  } catch (error) {
    console.error("Error creating post:", error);
    return res.status(500).json({ message: "Server Error" });
  }
};

userPostController.getUserPosts = async (req, res) => {
  try {
    const posts = await userPostModel
      .find({ deletedAt: null })  // Soft deleted posts exclude
      .populate("user", "name")
      .sort({ createdAt: -1 });  // Latest first
    
    console.log("POSTS:", posts);
    res.status(200).json(posts)
  } catch (error) {
    console.error("Error getting posts:", error);
    return res.status(500).json({ message: "Server Error" });
  }
}

userPostController.updateUserPost = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, link, existingImage } = req.body;

    let imagePath = existingImage;

    if (req.file) {
      imagePath = `/images/${req.file.filename}`;

      if (existingImage && fs.existsSync(path.join(__dirname, `../public${existingImage}`))) {
        fs.unlinkSync(path.join(__dirname, `../public${existingImage}`));
      }
    }

    await userPostModel.findByIdAndUpdate(id, {
      title,
      description,
      link,
      image: imagePath,
      updatedAt: new Date()  // ✅ Updated time bhi set karo
    });

    res.status(200).json({ message: "Post updated successfully" });
  } catch (error) {
    console.error("Error updating post:", error);
    return res.status(500).json({ message: "Server Error" });
  }
};

userPostController.deleteUserPost = async (req, res) => {
  try {
    const { id } = req.params;
    
    // ✅ Hard delete ki jagah soft delete use karo (recommended)
    await userPostModel.findByIdAndUpdate(id, {
      deletedAt: new Date()
    });
    
    // Ya agar hard delete chahiye:
    // await userPostModel.findByIdAndDelete(id);
    
    res.status(200).json({ message: "Post deleted successfully" });
  } catch (error) {
    console.error("Error deleting post:", error);
    return res.status(500).json({ message: "Server Error" });
  }
}

module.exports = userPostController
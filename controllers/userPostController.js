const userPostModel = require('../models/userpostModel');
const User = require("../models/userModel");
const path = require("path");
const fs = require("fs");

const userPostController = {};

// Create User Post
userPostController.createUserPost = async (req, res) => {
  try {
    const { title, description, link } = req.body;
    const userId = req.user.id;

    console.log("User ID:", userId);

    // Validation
    if (!title || !description) {
      return res.status(400).json({ 
        errors: {
          title: !title ? "Title is required" : undefined,
          description: !description ? "Description is required" : undefined,
        }
      });
    }

    // Create post with user ID
    const newPost = await userPostModel.create({ 
      title, 
      description, 
      link,
      user: userId 
    });

    // Post create hone ke baad user data populate karke return karo
    const populatedPost = await userPostModel
      .findById(newPost._id)
      .populate("user", "name");

    res.status(201).json({ 
      message: "Post created successfully",
      post: populatedPost
    });
  } catch (error) {
    console.error("Error creating post:", error);

    // Validation errors handle karein
    if (error.name === 'ValidationError') {
      const errors = {};
      Object.keys(error.errors).forEach(key => {
        errors[key] = error.errors[key].message;
      });
      return res.status(400).json({ errors });
    }

    return res.status(500).json({ message: "Server Error" });
  }
};

// Get User Posts with Pagination
userPostController.getUserPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Total posts count (excluding soft deleted)
    const totalPosts = await userPostModel.countDocuments({ 
      deletedAt: null 
    });

    // Fetch paginated posts
    const posts = await userPostModel
      .find({ deletedAt: null })
      .populate("user", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Calculate pagination info
    const totalPages = Math.ceil(totalPosts / limit);
    const hasMore = page < totalPages;

    console.log("Fetched Posts:", posts.length, "Page:", page);

    res.status(200).json({
      posts,
      pagination: {
        currentPage: page,
        totalPages,
        totalPosts,
        hasMore,
        postsPerPage: limit,
      },
    });
  } catch (error) {
    console.error("Error getting posts:", error);
    return res.status(500).json({ message: "Server Error" });
  }
};

// Update User Post
userPostController.updateUserPost = async (req, res) => {
  try {
    const { id, title, description, link } = req.body;
    const userId = req.user.id;

    console.log("Updating Post ID:", id);

    // Validation
    if (!id) {
      return res.status(400).json({ message: "Post ID is required" });
    }

    // Check if post exists and belongs to user
    const post = await userPostModel.findById(id);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    if (post.user.toString() !== userId.toString()) {
      return res.status(403).json({ 
        message: "You can only edit your own posts" 
      });
    }

    // Update post
    const updatedPost = await userPostModel.findByIdAndUpdate(
      id,
      {
        title,
        description,
        link,
        updatedAt: new Date(),
      },
      { new: true, runValidators: true }
    ).populate("user", "name");

    res.status(200).json({
      message: "Post updated successfully",
      post: updatedPost,
    });
  } catch (error) {
    console.error("Error updating post:", error);

    if (error.name === 'ValidationError') {
      const errors = {};
      Object.keys(error.errors).forEach(key => {
        errors[key] = error.errors[key].message;
      });
      return res.status(400).json({ errors });
    }

    return res.status(500).json({ message: "Server Error" });
  }
};

// Delete User Post
userPostController.deleteUserPost = async (req, res) => {
  try {
    const { id } = req.body;
    const userId = req.user.id;

    console.log("Deleting Post ID:", id);

    // Validation
    if (!id) {
      return res.status(400).json({ message: "Post ID is required" });
    }

    // Check if post exists and belongs to user
    const post = await userPostModel.findById(id);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    if (post.user.toString() !== userId.toString()) {
      return res.status(403).json({ 
        message: "You can only delete your own posts" 
      });
    }

    // Soft delete (recommended)
    await userPostModel.findByIdAndUpdate(id, {
      deletedAt: new Date(),
    });

    // Ya agar hard delete chahiye:
    // await userPostModel.findByIdAndDelete(id);

    res.status(200).json({ message: "Post deleted successfully" });
  } catch (error) {
    console.error("Error deleting post:", error);
    return res.status(500).json({ message: "Server Error" });
  }
};

module.exports = userPostController;
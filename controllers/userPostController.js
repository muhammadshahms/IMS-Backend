const userPostModel = require('../models/userpostModel');
const User = require("../models/userModel");
const paginate = require('../utils/paginate');
const { getIO } = require("../socket");
const mediaController = require('./mediaController');

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

    // Handle image upload
    let imageUrl = null;
    if (req.file) {
      imageUrl = req.file.path; // Cloudinary returns the URL in path

      // Create media record
      await mediaController.createMediaRecord({
        url: imageUrl,
        publicId: req.file.filename, // Cloudinary public_id
        type: 'post_image',
        userId: userId,
        postId: null, // Will update after post is created
        file: req.file,
      });
    }

    // Create post with user ID and image
    const newPost = await userPostModel.create({
      title,
      description,
      link,
      image: imageUrl,
      user: userId
    });

    // Update media record with post ID if image was uploaded
    if (req.file && imageUrl) {
      const Media = require('../models/MediaModel');
      await Media.findOneAndUpdate(
        { url: imageUrl, user: userId },
        { post: newPost._id }
      );
    }

    // Post create hone ke baad user data populate karke return karo
    const populatedPost = await userPostModel
      .findById(newPost._id)
      .populate("user", "name avatar");

    // Emit socket event
    const io = getIO();
    io.emit("post:created", { post: populatedPost });

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

    const result = await paginate({
      model: userPostModel,
      page,
      limit,
      query: { deletedAt: null },  // filter
      sort: { createdAt: -1 },     // latest first
      populate: { path: "user", select: "name avatar" }, // populate
    });

    res.status(200).json(result);
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

    // Handle image update
    let imageUrl = post.image; // Keep existing image by default

    if (req.file) {
      // Delete old image from Cloudinary if exists
      if (post.image) {
        await mediaController.deleteMediaByPost(id);
      }

      // Set new image URL
      imageUrl = req.file.path;

      // Create new media record
      await mediaController.createMediaRecord({
        url: imageUrl,
        publicId: req.file.filename,
        type: 'post_image',
        userId: userId,
        postId: id,
        file: req.file,
      });
    }

    // Update post
    const updatedPost = await userPostModel.findByIdAndUpdate(
      id,
      {
        title,
        description,
        link,
        image: imageUrl,
        updatedAt: new Date(),
      },
      { new: true, runValidators: true }
    ).populate("user", "name avatar");

    // Emit socket event
    const io = getIO();
    io.emit("post:updated", { post: updatedPost });

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

    // Delete associated media from Cloudinary
    if (post.image) {
      await mediaController.deleteMediaByPost(id);
    }

    // Soft delete (recommended)
    await userPostModel.findByIdAndUpdate(id, {
      deletedAt: new Date(),
    });

    // Emit socket event
    const io = getIO();
    io.emit("post:deleted", { postId: id });

    res.status(200).json({ message: "Post deleted successfully" });
  } catch (error) {
    console.error("Error deleting post:", error);
    return res.status(500).json({ message: "Server Error" });
  }
};


module.exports = userPostController;
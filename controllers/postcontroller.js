// postController.js (Admin Posts)
const postModel = require('../models/postModel');
const path = require("path");
const fs = require("fs");

const postController = {};

// Create Post (Admin)
postController.createPost = async (req, res) => {
  try {
    const { title, description, link } = req.body;

    await postModel.create({ title, description, link });

    res.status(201).json({ message: "Post created successfully" });
  } catch (error) {
    console.error("Error creating post:", error);
    return res.status(500).json({ message: "Server Error" });
  }
};

// Get Posts with Pagination (Admin)
postController.getPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Total posts count
    const totalPosts = await postModel.countDocuments();

    // Fetch paginated posts
    const posts = await postModel.find()
      .sort({ createdAt: -1 }) // Latest first
      .skip(skip)
      .limit(limit);

    // Calculate pagination info
    const totalPages = Math.ceil(totalPosts / limit);
    const hasMore = page < totalPages;

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

// Update Post (Admin)
postController.updatePost = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, link, existingImage } = req.body;

    let imagePath = existingImage;

    // if a new file is uploaded, replace the image
    if (req.file) {
      imagePath = `/images/${req.file.filename}`;

      // Delete old image if exists and not same as default
      if (existingImage && fs.existsSync(path.join(__dirname, `../public${existingImage}`))) {
        fs.unlinkSync(path.join(__dirname, `../public${existingImage}`));
      }
    }

    await postModel.findByIdAndUpdate(id, {
      title,
      description,
      link,
      image: imagePath,
    });

    res.status(200).json({ message: "Post updated successfully" });
  } catch (error) {
    console.error("Error updating post:", error);
    return res.status(500).json({ message: "Server Error" });
  }
};

// Delete Post (Admin)
postController.deletePost = async (req, res) => {
  try {
    const { id } = req.params;
    await postModel.findByIdAndDelete(id);
    res.status(200).json({ message: "Post deleted successfully" });
  } catch (error) {
    console.error("Error deleting post:", error);
    return res.status(500).json({ message: "Server Error" });
  }
};

module.exports = postController;
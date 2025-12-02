// controllers/commentController.js
const commentModel = require('../models/CommentModel');
const userPostModel = require('../models/userpostModel');
const paginate = require('../utils/paginate');

const commentController = {};

// Create Comment
commentController.createComment = async (req, res) => {
  try {
    const { postId, content } = req.body;
    const userId = req.user.id;

    // Validation
    if (!postId || !content) {
      return res.status(400).json({
        errors: {
          postId: !postId ? "Post ID is required" : undefined,
          content: !content ? "Comment content is required" : undefined,
        }
      });
    }

    // Check if post exists
    const post = await userPostModel.findById(postId);
    if (!post || post.deletedAt) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Create comment
    const newComment = await commentModel.create({
      content,
      post: postId,
      user: userId
    });

    // Populate user data
    const populatedComment = await commentModel
      .findById(newComment._id)
      .populate("user", "name");

    res.status(201).json({
      message: "Comment added successfully",
      comment: populatedComment
    });
  } catch (error) {
    console.error("Error creating comment:", error);

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

// Get Comments for a Post
commentController.getCommentsByPost = async (req, res) => {
  try {
    const { postId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const result = await paginate({
      model: commentModel,
      page,
      limit,
      query: { post: postId, deletedAt: null },
      sort: { createdAt: -1 }, // Latest first
      populate: { path: "user", select: "name" },
    });

    res.status(200).json(result);
  } catch (error) {
    console.error("Error getting comments:", error);
    return res.status(500).json({ message: "Server Error" });
  }
};

// Update Comment
commentController.updateComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    // Validation
    if (!content) {
      return res.status(400).json({ message: "Comment content is required" });
    }

    // Check if comment exists and belongs to user
    const comment = await commentModel.findById(id);

    if (!comment || comment.deletedAt) {
      return res.status(404).json({ message: "Comment not found" });
    }

    if (comment.user.toString() !== userId.toString()) {
      return res.status(403).json({
        message: "You can only edit your own comments"
      });
    }

    // Update comment
    const updatedComment = await commentModel.findByIdAndUpdate(
      id,
      {
        content,
        updatedAt: new Date(),
      },
      { new: true, runValidators: true }
    ).populate("user", "name");

    res.status(200).json({
      message: "Comment updated successfully",
      comment: updatedComment,
    });
  } catch (error) {
    console.error("Error updating comment:", error);

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

// Delete Comment
commentController.deleteComment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if comment exists and belongs to user
    const comment = await commentModel.findById(id);

    if (!comment || comment.deletedAt) {
      return res.status(404).json({ message: "Comment not found" });
    }

    if (comment.user.toString() !== userId.toString()) {
      return res.status(403).json({
        message: "You can only delete your own comments"
      });
    }

    // Soft delete
    await commentModel.findByIdAndUpdate(id, {
      deletedAt: new Date(),
    });

    res.status(200).json({ message: "Comment deleted successfully" });
  } catch (error) {
    console.error("Error deleting comment:", error);
    return res.status(500).json({ message: "Server Error" });
  }
};

module.exports = commentController;
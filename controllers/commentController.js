// controllers/commentController.js
const commentModel = require('../models/CommentModel');
const userPostModel = require('../models/userpostModel');
const paginate = require('../utils/paginate');
const { getIO } = require('../socket');

const commentController = {};

// Helper function to build comment tree
const buildCommentTree = async (comments) => {
  const commentMap = new Map();
  const rootComments = [];

  // First pass: create a map of all comments
  comments.forEach(comment => {
    commentMap.set(comment._id.toString(), { ...comment, replies: [] });
  });

  // Second pass: build the tree structure
  comments.forEach(comment => {
    const commentObj = commentMap.get(comment._id.toString());
    if (comment.parentComment) {
      const parent = commentMap.get(comment.parentComment.toString());
      if (parent) {
        parent.replies.push(commentObj);
      }
    } else {
      rootComments.push(commentObj);
    }
  });

  return rootComments;
};

// Create Comment
commentController.createComment = async (req, res) => {
  try {
    const { postId, content, parentCommentId } = req.body;
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

    // If replying to a comment, validate parent comment
    if (parentCommentId) {
      const parentComment = await commentModel.findById(parentCommentId);

      if (!parentComment || parentComment.deletedAt) {
        return res.status(404).json({ message: "Parent comment not found" });
      }

      if (parentComment.post.toString() !== postId) {
        return res.status(400).json({
          message: "Parent comment does not belong to this post"
        });
      }

      // Check max depth
      if (parentComment.depth >= 5) {
        return res.status(400).json({
          message: "Maximum nesting depth reached (5 levels)"
        });
      }
    }

    // Create comment
    const newComment = await commentModel.create({
      content,
      post: postId,
      user: userId,
      parentComment: parentCommentId || null
    });

    // Populate user data
    const populatedComment = await commentModel
      .findById(newComment._id)
      .populate("user", "name avatar");

    // Emit socket event to post room
    try {
      const io = getIO();
      io.to(`post:${postId}`).emit('comment:created', {
        comment: populatedComment,
        parentCommentId: parentCommentId || null
      });
    } catch (socketError) {
      console.error('Socket emission error:', socketError);
      // Continue even if socket fails
    }

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

// Get Comments for a Post (with tree structure)
commentController.getCommentsByPost = async (req, res) => {
  try {
    const { postId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    // Get all comments for the post (not just root comments)
    // We need all comments to build the tree
    const allComments = await commentModel
      .find({ post: postId, deletedAt: null })
      .populate("user", "name avatar")
      .sort({ createdAt: -1 })
      .lean();

    // Build comment tree
    const commentTree = await buildCommentTree(allComments);

    // Paginate only the root comments
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedRootComments = commentTree.slice(startIndex, endIndex);

    const result = {
      data: paginatedRootComments,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(commentTree.length / limit),
        totalItems: commentTree.length,
        itemsPerPage: limit,
        hasNextPage: endIndex < commentTree.length,
        hasPrevPage: page > 1
      }
    };

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
    ).populate("user", "name avatar");

    // Emit socket event to post room
    try {
      const io = getIO();
      io.to(`post:${comment.post}`).emit('comment:updated', {
        comment: updatedComment
      });
    } catch (socketError) {
      console.error('Socket emission error:', socketError);
      // Continue even if socket fails
    }

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

// Delete Comment (with cascade delete for replies)
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

    // Soft delete the comment
    await commentModel.findByIdAndUpdate(id, {
      deletedAt: new Date(),
    });

    // Cascade soft delete all child comments
    const deleteReplies = async (parentId) => {
      const replies = await commentModel.find({
        parentComment: parentId,
        deletedAt: null
      });

      for (const reply of replies) {
        await commentModel.findByIdAndUpdate(reply._id, {
          deletedAt: new Date(),
        });
        // Recursively delete nested replies
        await deleteReplies(reply._id);
      }
    };

    await deleteReplies(id);

    // Emit socket event to post room
    try {
      const io = getIO();
      io.to(`post:${comment.post}`).emit('comment:deleted', {
        commentId: id,
        parentCommentId: comment.parentComment
      });
    } catch (socketError) {
      console.error('Socket emission error:', socketError);
      // Continue even if socket fails
    }

    res.status(200).json({ message: "Comment deleted successfully" });
  } catch (error) {
    console.error("Error deleting comment:", error);
    return res.status(500).json({ message: "Server Error" });
  }
};

module.exports = commentController;
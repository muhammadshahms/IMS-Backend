import React, { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  MessageSquare,
  User,
  Send,
  Loader2,
  Wifi,
  WifiOff,
} from "lucide-react";
import { commentRepo } from "@/repositories/commentRepo";
import { useAuthStore } from "@/hooks/store/authStore";
import { useSocket } from "@/hooks/useSocket";
import { CommentItem } from "./CommentItem";
import { CommentTree, CommentCreatedPayload, CommentUpdatedPayload, CommentDeletedPayload } from "@/types/comment";

interface CommentsSectionProps {
  postId: string;
}

export const CommentsSection: React.FC<CommentsSectionProps> = ({ postId }) => {
  const { user } = useAuthStore();
  const { isConnected, on } = useSocket(postId);

  const [comments, setComments] = useState<CommentTree[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [commentCount, setCommentCount] = useState(0);
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const observer = useRef<IntersectionObserver | null>(null);
  const limit = 10;

  const loadComments = useCallback(async (pageNum = 1, append = false) => {
    try {
      append ? setIsLoadingMore(true) : setIsLoading(true);

      const res = await commentRepo.getCommentsByPost(postId, pageNum, limit);

      if (append) {
        // Filter out duplicates before appending
        setComments(prev => {
          const existingIds = new Set(prev.map(c => c._id));
          const newComments = (res?.data ?? []).filter(c => !existingIds.has(c._id));
          return [...prev, ...newComments];
        });
      } else {
        setComments(res?.data ?? []);
      }

      setHasMore(res?.pagination?.hasNextPage ?? false);
      setCommentCount(res?.pagination?.totalItems ?? 0);
    } catch (error) {
      console.error("Failed to load comments:", error);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [postId]);

  useEffect(() => {
    loadComments(1);
  }, [loadComments]);

  // Socket.IO event handlers
  useEffect(() => {
    if (!isConnected) return;

    // Listen for new comments
    const unsubscribeCreated = on('comment:created', (payload: CommentCreatedPayload) => {
      console.log('New comment received:', payload);

      if (payload.parentCommentId === null) {
        // Root comment - check if it already exists to prevent duplicates
        setComments(prev => {
          const exists = prev.some(c => c._id === payload.comment._id);
          if (exists) return prev;
          return [payload.comment as CommentTree, ...prev];
        });
        setCommentCount(prev => prev + 1);
      } else {
        // Reply - update the tree
        setComments(prev => addReplyToTree(prev, payload.parentCommentId!, payload.comment as CommentTree));
        setCommentCount(prev => prev + 1);
      }
    });

    // Listen for updated comments
    const unsubscribeUpdated = on('comment:updated', (payload: CommentUpdatedPayload) => {
      console.log('Comment updated:', payload);
      setComments(prev => updateCommentInTree(prev, payload.comment._id, payload.comment));
    });

    // Listen for deleted comments
    const unsubscribeDeleted = on('comment:deleted', (payload: CommentDeletedPayload) => {
      console.log('Comment deleted:', payload);
      setComments(prev => removeCommentFromTree(prev, payload.commentId));
      setCommentCount(prev => Math.max(0, prev - 1));
    });

    return () => {
      unsubscribeCreated?.();
      unsubscribeUpdated?.();
      unsubscribeDeleted?.();
    };
  }, [isConnected, on]);

  // Helper function to add reply to tree
  const addReplyToTree = (comments: CommentTree[], parentId: string, newReply: CommentTree): CommentTree[] => {
    return comments.map(comment => {
      if (comment._id === parentId) {
        // Check if reply already exists
        const replyExists = comment.replies?.some(r => r._id === newReply._id);
        if (replyExists) return comment;

        return {
          ...comment,
          replies: [...(comment.replies || []), newReply]
        };
      }
      if (comment.replies && comment.replies.length > 0) {
        return {
          ...comment,
          replies: addReplyToTree(comment.replies, parentId, newReply)
        };
      }
      return comment;
    });
  };

  // Helper function to update comment in tree
  const updateCommentInTree = (comments: CommentTree[], commentId: string, updatedComment: any): CommentTree[] => {
    return comments.map(comment => {
      if (comment._id === commentId) {
        return { ...comment, ...updatedComment, replies: comment.replies };
      }
      if (comment.replies && comment.replies.length > 0) {
        return {
          ...comment,
          replies: updateCommentInTree(comment.replies, commentId, updatedComment)
        };
      }
      return comment;
    });
  };

  // Helper function to remove comment from tree
  const removeCommentFromTree = (comments: CommentTree[], commentId: string): CommentTree[] => {
    return comments.filter(comment => {
      if (comment._id === commentId) {
        return false;
      }
      if (comment.replies && comment.replies.length > 0) {
        comment.replies = removeCommentFromTree(comment.replies, commentId);
      }
      return true;
    });
  };

  const lastCommentRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (isLoadingMore) return;
      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setPage(prev => {
            const nextPage = prev + 1;
            loadComments(nextPage, true);
            return nextPage;
          });
        }
      });

      if (node) observer.current.observe(node);
    },
    [isLoadingMore, hasMore, loadComments]
  );

  const handleAddComment = async () => {
    if (!content.trim()) return;
    try {
      await commentRepo.createComment(postId, content);
      setContent("");
      // Real-time update will be handled by socket event
    } catch (error) {
      console.error("Failed to add comment:", error);
    }
  };

  const handleReply = async (parentId: string, replyContent: string) => {
    try {
      await commentRepo.createComment(postId, replyContent, parentId);
      // Real-time update will be handled by socket event
    } catch (error) {
      console.error("Failed to add reply:", error);
    }
  };

  const handleEdit = async (id: string, newContent: string) => {
    try {
      await commentRepo.updateComment(id, newContent);
      // Real-time update will be handled by socket event
    } catch (error) {
      console.error("Failed to update comment:", error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await commentRepo.deleteComment(id);
      // Real-time update will be handled by socket event
    } catch (error) {
      console.error("Failed to delete comment:", error);
    }
  };

  return (
    <div className="space-y-4 pt-2">
      {/* Connection Status & Comment Count */}
      <div className="flex items-center justify-between">
        {commentCount > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MessageSquare className="w-4 h-4" />
            <span>{commentCount} {commentCount === 1 ? 'comment' : 'comments'}</span>
          </div>
        )}

        <div className="flex items-center gap-2 text-xs">
          {isConnected ? (
            <>
              <Wifi className="w-3 h-3 text-green-500" />
              <span className="text-green-500">Live</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3 h-3 text-muted-foreground" />
              <span className="text-muted-foreground">Offline</span>
            </>
          )}
        </div>
      </div>

      {/* Add Comment Input */}
      <div className="flex gap-3 items-start">
        <Avatar className="h-9 w-9 border-2 border-background shadow-sm">
          <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600 text-white text-sm font-semibold">
            {user?.name?.charAt(0).toUpperCase() || <User className="w-4 h-4" />}
          </AvatarFallback>
        </Avatar>

        <div className="flex gap-2 items-center w-full justify-between">
          <input
            placeholder="Write a comment..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter" && !e.shiftKey && content.trim()) {
                e.preventDefault();
                handleAddComment();
              }
            }}
            className="w-full border rounded-md p-2"
          // rows={3}
          /> <Button
            size="sm"
            disabled={!content.trim()}
            onClick={handleAddComment}
            className="w-10 h-10"
          >
            <Send className="w-5 h-5" />
          </Button>

        </div>
      </div>

      {/* Comments List */}
      <div className="max-h-[600px] overflow-y-auto">
        <div className="space-y-4 p-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin mb-2" />
              <p className="text-sm">Loading comments...</p>
            </div>
          ) : comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <MessageSquare className="w-12 h-12 mb-3 opacity-20" />
              <p className="text-sm font-medium">No comments yet</p>
              <p className="text-xs">Be the first to share your thoughts!</p>
            </div>
          ) : (
            <>
              {comments.map((comment, index) => {
                const isLast = index === comments.length - 1;
                return (
                  <div
                    key={comment._id}
                    ref={isLast ? lastCommentRef : null}
                  >
                    <CommentItem
                      comment={comment}
                      onReply={handleReply}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                    />
                  </div>
                );
              })}

              {/* Loading more indicator */}
              {isLoadingMore && (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              )}

              {/* No more comments */}
              {!hasMore && comments.length > 0 && (
                <p className="text-center text-sm text-muted-foreground">
                  {/* No more comments to load */}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
import React, { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  MessageSquare,
  User,
  Send,
  Loader2,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useAuthStore } from "@/hooks/store/authStore";
import { CommentItem } from "./CommentItem";
import { useComments } from "@/hooks/useComments";

interface CommentsSectionProps {
  postId: string;
}

export const CommentsSection: React.FC<CommentsSectionProps> = ({ postId }) => {
  const { user } = useAuthStore();
  const {
    comments,
    loading,
    hasMore,
    total,
    page,
    fetchComments,
    createComment,
    replyComment,
    updateCommentApi,
    deleteCommentApi,
    toggleLike,
    isConnected
  } = useComments(postId);

  const [content, setContent] = useState("");
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const initialFetchDone = useRef(false);

  const observer = useRef<IntersectionObserver | null>(null);

  // Initial fetch - only run once when component mounts
  useEffect(() => {
    if (!initialFetchDone.current) {
      initialFetchDone.current = true;
      fetchComments(1);
    }
  }, []);

  const lastCommentRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (isLoadingMore) return;
      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setIsLoadingMore(true);
          fetchComments(page + 1, true).finally(() => setIsLoadingMore(false));
        }
      });

      if (node) observer.current.observe(node);
    },
    [isLoadingMore, hasMore, fetchComments, page]
  );

  const handleAddComment = async () => {
    if (!content.trim()) return;
    try {
      await createComment(content);
      setContent("");
    } catch (error) {
      console.error("Failed to add comment:", error);
    }
  };

  const handleReply = async (parentId: string, replyContent: string) => {
    try {
      await replyComment(parentId, replyContent);
    } catch (error) {
      console.error("Failed to add reply:", error);
    }
  };

  const handleEdit = async (id: string, newContent: string) => {
    try {
      await updateCommentApi(id, newContent);
    } catch (error) {
      console.error("Failed to update comment:", error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCommentApi(id);
    } catch (error) {
      console.error("Failed to delete comment:", error);
    }
  };

  return (
    <div className="space-y-4 pt-2">
      {/* Connection Status & Comment Count */}
      <div className="flex items-center justify-between">
        {total > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MessageSquare className="w-4 h-4" />
            <span>{total} {total === 1 ? 'comment' : 'comments'}</span>
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
          />
          <Button
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
          {loading && page === 1 ? (
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
                      onLike={toggleLike}
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
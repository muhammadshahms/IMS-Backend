import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

import { Clock, Edit, ExternalLink, Heart, MessageSquare, MoreVertical, Trash2 } from "lucide-react";
import { CommentsSection } from "./CommentsSection";
import { useAuthStore } from "@/hooks/store/authStore";
import { likeRepo } from "@/repositories/likeRepo";
import { commentRepo } from "@/repositories/commentRepo";
import { useSocket } from "@/hooks/useSocket";

export const PostCard = ({
  postId,
  title,
  description,
  link,
  createdAt,
  authorName,
  authorId = "",
  isAdmin = false,
  onDelete,
  onEdit,
}) => {
  const { user, isAuthenticated } = useAuthStore();
  const { isConnected, on } = useSocket(postId);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [isLiking, setIsLiking] = useState(false);

  const [editForm, setEditForm] = useState({
    title,
    description,
    link: link || "",
  });

  const isOwner = isAuthenticated && user?._id && user?._id === authorId;
  const displayName = isAdmin ? "Admin" : authorName || "User";
  const avatarText = displayName.charAt(0).toUpperCase();

  // Fetch initial like status and comment count
  useEffect(() => {
    const fetchLikes = async () => {
      try {
        const res = await likeRepo.getLikesByPost(postId, 1, 1);
        setLikeCount(res.pagination.totalItems);
        setLiked(res.userLiked);
      } catch (error) {
        console.error("Failed to fetch likes:", error);
      }
    };

    const fetchCommentCount = async () => {
      try {
        const res = await commentRepo.getCommentsByPost(postId, 1, 1);
        setCommentCount(res.pagination?.totalItems || 0);
      } catch (error) {
        console.error("Failed to fetch comment count:", error);
      }
    };

    if (postId) {
      fetchLikes();
      fetchCommentCount();
    }
  }, [postId]);

  const formatTimeAgo = (dateString) => {
    const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
    if (seconds < 60) return "Just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const handleDelete = () => {
    if (postId && onDelete) onDelete(postId);
    setIsDeleteDialogOpen(false);
  };

  const handleEditSubmit = () => {
    if (postId && onEdit) {
      onEdit(postId, editForm);
      setIsEditModalOpen(false);
    }
  };

  const handleLike = async () => {
    if (!isAuthenticated) return;
    if (isLiking) return;

    try {
      setIsLiking(true);
      const newLikedState = !liked;
      setLiked(newLikedState);
      setLikeCount(prev => newLikedState ? prev + 1 : Math.max(0, prev - 1));

      await likeRepo.toggleLike(postId);
    } catch (error) {
      setLiked(!liked);
      setLikeCount(prev => !liked ? prev - 1 : prev + 1);
      console.error("Failed to toggle like:", error);
    } finally {
      setIsLiking(false);
    }
  };

  return (
    <>
      <Card className="overflow-hidden border-border ">
        <CardHeader className="space-y-0">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Avatar
                className={`h-11 w-11 border-2 ${isAdmin
                  ? "border-blue-200 bg-gradient-to-br from-blue-500 via-blue-600 to-purple-600"
                  : "border-emerald-200 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600"
                  }`}
              >
                <AvatarFallback className="text-white font-bold text-sm">
                  {avatarText}
                </AvatarFallback>
              </Avatar>

              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm leading-none">{displayName}</p>
                  {isAdmin && (
                    <Badge variant="secondary" className="text-xs px-2 py-0.5 font-medium">
                      Admin
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{formatTimeAgo(createdAt)}</span>
                </div>
              </div>
            </div>

            {isOwner && postId && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 -mt-1">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem onClick={() => setIsEditModalOpen(true)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Post
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setIsDeleteDialogOpen(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Post
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Post Content */}
          <div className="space-y-2">
            <h3 className="font-bold text-lg leading-tight">{title}</h3>
            <p className="text-sm text-foreground/80 leading-relaxed">
              {description}
            </p>
          </div>

          {/* Link */}
          {link && (
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-primary hover:underline font-medium transition-colors group"
            >
              <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              Visit Link
            </a>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex gap-2 w-full">
              <Button
                variant="ghost"
                size="sm"
                className={`flex-1 gap-2 hover:bg-red-50 dark:hover:bg-red-950/20 ${liked ? 'text-red-500' : ''}`}
                onClick={handleLike}
                disabled={isLiking}
              >
                <Heart
                  className={`w-4 h-4 transition-all ${liked ? "fill-current scale-110" : ""}`}
                />
                <span className="text-xs font-medium">
                  {likeCount > 0 ? likeCount : "Like"}
                </span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="flex-1 gap-2 hover:bg-blue-50 dark:hover:bg-blue-950/20"
                onClick={() => setShowComments(!showComments)}
              >
                <MessageSquare className={`w-4 h-4 ${showComments ? "text-blue-600" : ""}`} />
                <span className="text-xs font-medium">
                  {commentCount > 0 ? `${commentCount} ` : ""}Comments
                </span>
              </Button>
            </div>
          </div>

          {/* Comments Section */}
          {showComments && postId && (
            <>
              <Separator />
              <CommentsSection postId={postId} />
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Edit Post</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={editForm.title}
                onChange={(e) =>
                  setEditForm({ ...editForm, title: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                rows={4}
                value={editForm.description}
                onChange={(e) =>
                  setEditForm({ ...editForm, description: e.target.value })
                }
                className="resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-link">Link (Optional)</Label>
              <Input
                id="edit-link"
                value={editForm.link}
                onChange={(e) =>
                  setEditForm({ ...editForm, link: e.target.value })
                }
                placeholder="https://..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditSubmit}>Update Post</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Post</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this post? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Post
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
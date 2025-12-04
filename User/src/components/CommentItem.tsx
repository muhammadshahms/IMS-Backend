// components/CommentItem.tsx
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
    MoreVertical,
    Edit,
    Trash2,
    Clock,
    Reply,
    Send,
    X,
    Heart,
} from "lucide-react";
import { CommentTree } from "@/types/comment";
import { useAuthStore } from "@/hooks/store/authStore";
import { cn } from "@/lib/utils";

interface CommentItemProps {
    comment: CommentTree;
    onReply: (parentId: string, content: string) => void;
    onEdit: (id: string, content: string) => void;
    onDelete: (id: string) => void;
    onLike: (id: string) => void;
    depth?: number;
}

export const CommentItem: React.FC<CommentItemProps> = ({
    comment,
    onReply,
    onEdit,
    onDelete,
    onLike,
    depth = 0,
}) => {
    const { user } = useAuthStore();
    const [isReplying, setIsReplying] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [replyContent, setReplyContent] = useState("");
    const [editContent, setEditContent] = useState(comment.content);

    const maxDepth = 5;
    const canReply = depth < maxDepth;

    const formatTimeAgo = (dateString: string) => {
        const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
        if (seconds < 60) return "Just now";
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return `${Math.floor(seconds / 86400)}d ago`;
    };

    const handleReply = () => {
        if (replyContent.trim()) {
            onReply(comment._id, replyContent);
            setReplyContent("");
            setIsReplying(false);
        }
    };

    const handleEdit = () => {
        if (editContent.trim()) {
            onEdit(comment._id, editContent);
            setIsEditing(false);
        }
    };

    const handleCancelEdit = () => {
        setEditContent(comment.content);
        setIsEditing(false);
    };

    return (
        <div className="space-y-3">
            <div className="flex gap-3">
                <Avatar className="h-9 w-9 border-2 border-background shadow-sm flex-shrink-0">
                    <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600 text-white text-sm font-semibold">
                        {comment.user?.name?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                </Avatar>

                <div className="flex-1 space-y-2 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold">{comment.user?.name}</p>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="w-3 h-3" />
                                <span>{formatTimeAgo(comment.createdAt)}</span>
                            </div>
                            {comment.depth > 0 && (
                                <span className="text-xs bg-muted px-2 py-0.5 rounded">
                                    Reply
                                </span>
                            )}
                        </div>

                        {user?._id === comment.user?._id && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0">
                                        <MoreVertical className="h-3.5 w-3.5" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-32">
                                    <DropdownMenuItem onClick={() => setIsEditing(true)}>
                                        <Edit className="mr-2 h-3.5 w-3.5" />
                                        Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={() => onDelete(comment._id)}
                                        className="text-destructive focus:text-destructive"
                                    >
                                        <Trash2 className="mr-2 h-3.5 w-3.5" />
                                        Delete
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>

                    {isEditing ? (
                        <div className="space-y-2">
                            <Textarea
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                className="min-h-[60px] resize-none"
                                rows={2}
                            />
                            <div className="flex gap-2">
                                <Button size="sm" onClick={handleEdit}>
                                    <Send className="w-3 h-3 mr-1" />
                                    Save
                                </Button>
                                <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                                    <X className="w-3 h-3 mr-1" />
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <p className="text-sm leading-relaxed text-foreground/90 break-words">
                                {comment.content}
                            </p>

                            <div className="flex items-center gap-4 pt-1">
                                {canReply && !isReplying && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setIsReplying(true)}
                                        className="h-7 text-xs px-2"
                                    >
                                        <Reply className="w-3 h-3 mr-1" />
                                        Reply
                                    </Button>
                                )}

                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onLike(comment._id)}
                                    className={cn(
                                        "h-7 text-xs px-2 gap-1",
                                        comment.userLiked && "text-red-500 hover:text-red-600"
                                    )}
                                >
                                    <Heart className={cn("w-3 h-3", comment.userLiked && "fill-current")} />
                                    <span>{comment.likeCount || 0}</span>
                                </Button>
                            </div>

                            {isReplying && (
                                <div className="space-y-2 pt-2">
                                    <Textarea
                                        placeholder="Write a reply..."
                                        value={replyContent}
                                        onChange={(e) => setReplyContent(e.target.value)}
                                        onKeyPress={(e) => {
                                            if (e.key === "Enter" && !e.shiftKey && replyContent.trim()) {
                                                e.preventDefault();
                                                handleReply();
                                            }
                                        }}
                                        className="min-h-[60px] resize-none"
                                        rows={2}
                                    />
                                    <div className="flex gap-2">
                                        <Button
                                            size="sm"
                                            disabled={!replyContent.trim()}
                                            onClick={handleReply}
                                        >
                                            <Send className="w-3 h-3 mr-1" />
                                            Reply
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => {
                                                setIsReplying(false);
                                                setReplyContent("");
                                            }}
                                        >
                                            <X className="w-3 h-3 mr-1" />
                                            Cancel
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Nested Replies */}
            {comment.replies && comment.replies.length > 0 && (
                <div className="ml-8 space-y-3 border-l-2 border-muted pl-4">
                    {comment.replies.map((reply) => (
                        <CommentItem
                            key={reply._id}
                            comment={reply}
                            onReply={onReply}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            onLike={onLike}
                            depth={depth + 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

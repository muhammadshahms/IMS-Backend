import { create } from 'zustand';
import { CommentTree } from '@/types/comment';

interface CommentState {
    comments: Record<string, CommentTree[]>; // postId -> comments
    setComments: (postId: string, comments: CommentTree[]) => void;
    addComment: (postId: string, comment: CommentTree) => void;
    addReply: (postId: string, parentId: string, reply: CommentTree) => void;
    updateComment: (postId: string, commentId: string, updatedComment: Partial<CommentTree>) => void;
    deleteComment: (postId: string, commentId: string) => void;
    setCommentLike: (postId: string, commentId: string, liked: boolean, count: number) => void;
}

// Helper functions
const addReplyToTree = (comments: CommentTree[], parentId: string, newReply: CommentTree): CommentTree[] => {
    return comments.map(comment => {
        if (comment._id === parentId) {
            const replyExists = comment.replies?.some(r => r._id === newReply._id);
            if (replyExists) return comment;
            return { ...comment, replies: [...(comment.replies || []), newReply] };
        }
        if (comment.replies?.length) {
            return { ...comment, replies: addReplyToTree(comment.replies, parentId, newReply) };
        }
        return comment;
    });
};

const updateCommentInTree = (comments: CommentTree[], commentId: string, updatedComment: Partial<CommentTree>): CommentTree[] => {
    return comments.map(comment => {
        if (comment._id === commentId) {
            return { ...comment, ...updatedComment, replies: comment.replies };
        }
        if (comment.replies?.length) {
            return { ...comment, replies: updateCommentInTree(comment.replies, commentId, updatedComment) };
        }
        return comment;
    });
};

const removeCommentFromTree = (comments: CommentTree[], commentId: string): CommentTree[] => {
    return comments.filter(comment => {
        if (comment._id === commentId) return false;
        if (comment.replies?.length) {
            comment.replies = removeCommentFromTree(comment.replies, commentId);
        }
        return true;
    });
};

export const useCommentStore = create<CommentState>((set) => ({
    comments: {},
    setComments: (postId, newComments) => set((state) => ({
        comments: { ...state.comments, [postId]: newComments }
    })),
    addComment: (postId, comment) => set((state) => {
        const currentComments = state.comments[postId] || [];
        if (currentComments.some(c => c._id === comment._id)) return state;
        return {
            comments: {
                ...state.comments,
                [postId]: [comment, ...currentComments]
            }
        };
    }),
    addReply: (postId, parentId, reply) => set((state) => ({
        comments: {
            ...state.comments,
            [postId]: addReplyToTree(state.comments[postId] || [], parentId, reply)
        }
    })),
    updateComment: (postId, commentId, updatedComment) => set((state) => ({
        comments: {
            ...state.comments,
            [postId]: updateCommentInTree(state.comments[postId] || [], commentId, updatedComment)
        }
    })),
    deleteComment: (postId, commentId) => set((state) => ({
        comments: {
            ...state.comments,
            [postId]: removeCommentFromTree(state.comments[postId] || [], commentId)
        }
    })),
    setCommentLike: (postId, commentId, liked, count) => set((state) => ({
        comments: {
            ...state.comments,
            [postId]: updateCommentInTree(state.comments[postId] || [], commentId, { userLiked: liked, likeCount: count })
        }
    }))
}));

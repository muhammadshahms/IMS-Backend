import { useState, useEffect, useCallback, useRef } from 'react';
import { useCommentStore } from './store/useCommentStore';
import { commentRepo } from '@/repositories/commentRepo';
import { useSocket } from './useSocket';
import { CommentTree, CommentCreatedPayload, CommentUpdatedPayload, CommentDeletedPayload } from '@/types/comment';

export const useComments = (postId: string) => {
    const { comments: allComments, setComments, addComment, addReply, updateComment, deleteComment } = useCommentStore();
    const comments = allComments[postId] || [];
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const { isConnected, on } = useSocket(postId);
    
    // Track if initial fetch has happened
    const hasFetchedRef = useRef(false);
    const currentPostIdRef = useRef(postId);

    // Reset state when postId changes
    useEffect(() => {
        if (currentPostIdRef.current !== postId) {
            currentPostIdRef.current = postId;
            hasFetchedRef.current = false;
            setPage(1);
            setHasMore(true);
            setTotal(0);
            setComments(postId, []);
        }
    }, [postId, setComments]);

    // FIX: Remove 'comments' from dependencies to prevent infinite loop
    const fetchComments = useCallback(async (pageNum = 1, append = false) => {
        // Prevent duplicate fetches
        if (loading) return;
        
        try {
            setLoading(true);
            const res = await commentRepo.getCommentsByPost(postId, pageNum, 10);
            
            if (append) {
                // Get current comments from store at fetch time
                const currentComments = allComments[postId] || [];
                const existingIds = new Set(currentComments.map(c => c._id));
                const newComments = (res?.data ?? []).filter(c => !existingIds.has(c._id));
                setComments(postId, [...currentComments, ...newComments]);
            } else {
                setComments(postId, res?.data ?? []);
            }
            
            setHasMore(res?.pagination?.hasNextPage ?? false);
            setTotal(res?.pagination?.totalItems ?? 0);
            setPage(pageNum);
            hasFetchedRef.current = true;
        } catch (error) {
            console.error('Failed to fetch comments:', error);
            setHasMore(false);
        } finally {
            setLoading(false);
        }
    }, [postId, allComments, setComments, loading]);

    // Socket listeners - only attach after initial fetch
    useEffect(() => {
        if (!isConnected || !hasFetchedRef.current) return;

        const unsubCreated = on('comment:created', (payload: CommentCreatedPayload) => {
            console.log('Socket: comment:created', payload);
            if (payload.parentCommentId) {
                addReply(postId, payload.parentCommentId, payload.comment as CommentTree);
            } else {
                addComment(postId, payload.comment as CommentTree);
            }
            setTotal(prev => prev + 1);
        });

        const unsubUpdated = on('comment:updated', (payload: CommentUpdatedPayload) => {
            console.log('Socket: comment:updated', payload);
            updateComment(postId, payload.comment._id, payload.comment);
        });

        const unsubDeleted = on('comment:deleted', (payload: CommentDeletedPayload) => {
            console.log('Socket: comment:deleted', payload);
            deleteComment(postId, payload.commentId);
            setTotal(prev => Math.max(0, prev - 1));
        });

        return () => {
            unsubCreated?.();
            unsubUpdated?.();
            unsubDeleted?.();
        };
    }, [isConnected, on, postId, addComment, addReply, updateComment, deleteComment]);

    return {
        comments,
        loading,
        hasMore,
        total,
        page,
        fetchComments,
        createComment: async (content: string) => commentRepo.createComment(postId, content),
        replyComment: async (parentId: string, content: string) => commentRepo.createComment(postId, content, parentId),
        updateCommentApi: async (id: string, content: string) => commentRepo.updateComment(id, content),
        deleteCommentApi: async (id: string) => commentRepo.deleteComment(id),
        isConnected
    };
};
import { useState, useEffect, useCallback, useRef } from 'react';
import { useCommentStore } from './store/useCommentStore';
import { commentRepo } from '@/repositories/commentRepo';
import { likeRepo } from '@/repositories/likeRepo';
import { useSocket } from './useSocket';
import { CommentTree, CommentCreatedPayload, CommentUpdatedPayload, CommentDeletedPayload } from '@/types/comment';
import { CommentLikeAddedPayload, CommentLikeRemovedPayload } from '@/types/like';

export const useComments = (postId: string) => {
    const { comments: allComments, setComments, addComment, addReply, updateComment, deleteComment, setCommentLike } = useCommentStore();
    const comments = allComments[postId] || [];
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const { isConnected, on } = useSocket(postId);

    // Track if initial fetch has happened
    const hasFetchedRef = useRef(false);
    const currentPostIdRef = useRef(postId);
    const loadingRef = useRef(false);

    // Reset state when postId changes
    useEffect(() => {
        if (currentPostIdRef.current !== postId) {
            currentPostIdRef.current = postId;
            hasFetchedRef.current = false;
            loadingRef.current = false;
            setPage(1);
            setHasMore(true);
            setTotal(0);
            setComments(postId, []);
        }
    }, [postId, setComments]);

    // Use ref for loading state in callback to avoid dependency issues
    const fetchComments = useCallback(async (pageNum = 1, append = false) => {
        // Prevent duplicate fetches using ref
        if (loadingRef.current) return;

        try {
            loadingRef.current = true;
            setLoading(true);
            const res = await commentRepo.getCommentsByPost(postId, pageNum, 10);

            if (append) {
                // Get current comments from store at fetch time
                const currentComments = useCommentStore.getState().comments[postId] || [];
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
            loadingRef.current = false;
            setLoading(false);
        }
    }, [postId, setComments]);

    // Socket listeners - only attach after initial fetch
    useEffect(() => {
        if (!isConnected || !hasFetchedRef.current) return;

        const unsubCreated = on('comment:created', (payload: CommentCreatedPayload) => {
            console.log('Socket: comment:created', payload);
            // Check if this comment already exists (we added it locally)
            const currentComments = useCommentStore.getState().comments[postId] || [];
            const exists = currentComments.some(c => c._id === payload.comment._id);
            if (!exists) {
                if (payload.parentCommentId) {
                    addReply(postId, payload.parentCommentId, payload.comment as CommentTree);
                } else {
                    addComment(postId, payload.comment as CommentTree);
                }
                setTotal(prev => prev + 1);
            }
        });

        const unsubUpdated = on('comment:updated', (payload: CommentUpdatedPayload) => {
            console.log('Socket: comment:updated', payload);
            updateComment(postId, payload.comment._id, payload.comment as any);
        });

        const unsubDeleted = on('comment:deleted', (payload: CommentDeletedPayload) => {
            console.log('Socket: comment:deleted', payload);
            deleteComment(postId, payload.commentId);
            setTotal(prev => Math.max(0, prev - 1));
        });

        const unsubLikeAdded = on('comment:like:added', (payload: CommentLikeAddedPayload) => {
            console.log('Socket: comment:like:added', payload);
            setCommentLike(postId, payload.commentId, true, payload.likeCount);
        });

        const unsubLikeRemoved = on('comment:like:removed', (payload: CommentLikeRemovedPayload) => {
            console.log('Socket: comment:like:removed', payload);
            setCommentLike(postId, payload.commentId, false, payload.likeCount);
        });

        return () => {
            unsubCreated?.();
            unsubUpdated?.();
            unsubDeleted?.();
            unsubLikeAdded?.();
            unsubLikeRemoved?.();
        };
    }, [isConnected, on, postId, addComment, addReply, updateComment, deleteComment, setCommentLike]);

    const toggleLike = useCallback(async (commentId: string) => {
        try {
            const res = await likeRepo.toggleCommentLike(commentId);
            setCommentLike(postId, commentId, res.liked, res.likeCount);
        } catch (error) {
            console.error('Failed to toggle comment like:', error);
        }
    }, [postId, setCommentLike]);

    const createCommentHandler = useCallback(async (content: string) => {
        const res = await commentRepo.createComment(postId, content);
        // Add to store immediately for the current user
        if (res?.comment) {
            addComment(postId, { ...res.comment, replies: [] } as CommentTree);
            setTotal(prev => prev + 1);
        }
        return res;
    }, [postId, addComment]);

    const replyCommentHandler = useCallback(async (parentId: string, content: string) => {
        const res = await commentRepo.createComment(postId, content, parentId);
        // Add reply to store immediately for the current user
        if (res?.comment) {
            addReply(postId, parentId, { ...res.comment, replies: [] } as CommentTree);
            setTotal(prev => prev + 1);
        }
        return res;
    }, [postId, addReply]);

    const updateCommentHandler = useCallback(async (id: string, content: string) => {
        const res = await commentRepo.updateComment(id, content);
        // Update in store immediately
        if (res?.comment) {
            updateComment(postId, id, res.comment);
        }
        return res;
    }, [postId, updateComment]);

    const deleteCommentHandler = useCallback(async (id: string) => {
        const res = await commentRepo.deleteComment(id);
        // Remove from store immediately
        deleteComment(postId, id);
        setTotal(prev => Math.max(0, prev - 1));
        return res;
    }, [postId, deleteComment]);

    return {
        comments,
        loading,
        hasMore,
        total,
        page,
        fetchComments,
        createComment: createCommentHandler,
        replyComment: replyCommentHandler,
        updateCommentApi: updateCommentHandler,
        deleteCommentApi: deleteCommentHandler,
        toggleLike,
        isConnected
    };
};
import { useEffect } from 'react';
import { useSocket } from './useSocket';
import { usePostStore } from './store/usePostStore';
import { useAuthStore } from './store/authStore';

export const usePostSocket = () => {
    const { on, isConnected } = useSocket();
    const { addPost, updatePost, deletePost, incrementLike, decrementLike } = usePostStore();
    const { user } = useAuthStore();

    useEffect(() => {
        if (!isConnected) return;

        const unsubCreated = on('post:created', (payload: any) => {
            console.log("Socket: post:created", payload);
            // Determine if it's admin or user post based on payload
            const isAdminPost = payload.post.isAdminPost || payload.isAdmin;
            addPost(payload.post, isAdminPost ? 'admin' : 'user');
        });

        const unsubUpdated = on('post:updated', (payload: any) => {
            console.log("Socket: post:updated", payload);
            updatePost(payload.post);
        });

        const unsubDeleted = on('post:deleted', (payload: any) => {
            console.log("Socket: post:deleted", payload);
            deletePost(payload.postId);
        });

        const unsubLikeAdded = on('like:added', (payload: any) => {
            console.log("Socket: like:added", payload);
            // Only increment if it's not the current user (to avoid double-counting optimistic updates)
            if (payload.userId !== user?._id) {
                incrementLike(payload.postId);
            }
        });

        const unsubLikeRemoved = on('like:removed', (payload: any) => {
            console.log("Socket: like:removed", payload);
            // Only decrement if it's not the current user
            if (payload.userId !== user?._id) {
                decrementLike(payload.postId);
            }
        });

        return () => {
            unsubCreated?.();
            unsubUpdated?.();
            unsubDeleted?.();
            unsubLikeAdded?.();
            unsubLikeRemoved?.();
        }
    }, [isConnected, on, addPost, updatePost, deletePost, incrementLike, decrementLike, user?._id]);
};
import { create } from 'zustand';
import { Post } from '@/types/post';
import { postRepo } from '@/repositories/postRepo';

interface PostState {
    adminPosts: Post[];
    userPosts: Post[];
    loading: boolean;
    hasMoreAdmin: boolean;
    hasMoreUser: boolean;
    pageAdmin: number;
    pageUser: number;
    
    fetchPosts: (page: number, limit: number, type: 'admin' | 'user') => Promise<void>;
    clearPosts: (type: 'admin' | 'user') => void;
    addPost: (post: Post, type: 'admin' | 'user') => void;
    updatePost: (post: Post) => void;
    deletePost: (postId: string) => void;
    setLike: (postId: string, liked: boolean, count: number) => void;
    incrementLike: (postId: string) => void;
    decrementLike: (postId: string) => void;
}

export const usePostStore = create<PostState>((set, get) => ({
    adminPosts: [],
    userPosts: [],
    loading: false,
    hasMoreAdmin: true,
    hasMoreUser: true,
    pageAdmin: 1,
    pageUser: 1,

    fetchPosts: async (page, limit, type) => {
        const state = get();
        
        // Prevent duplicate fetches
        if (state.loading) {
            console.log('Already fetching, skipping...');
            return;
        }
        
        set({ loading: true });
        
        try {
            const res = type === 'admin'
                ? await postRepo.getAllPosts(page, limit)
                : await postRepo.getAllUsersPosts(page, limit);
            
            const newPosts = res.posts || res.data || [];
            
            if (type === 'admin') {
                set({
                    adminPosts: page === 1 ? newPosts : [...state.adminPosts, ...newPosts],
                    hasMoreAdmin: res.pagination.hasMore,
                    pageAdmin: page,
                    loading: false
                });
            } else {
                set({
                    userPosts: page === 1 ? newPosts : [...state.userPosts, ...newPosts],
                    hasMoreUser: res.pagination.hasMore,
                    pageUser: page,
                    loading: false
                });
            }
        } catch (error) {
            set({ loading: false });
            console.error('Failed to fetch posts:', error);
        }
    },

    clearPosts: (type) => {
        if (type === 'admin') {
            set({ adminPosts: [], pageAdmin: 1, hasMoreAdmin: true });
        } else {
            set({ userPosts: [], pageUser: 1, hasMoreUser: true });
        }
    },

    addPost: (post, type) => {
        if (type === 'admin') {
            set((state) => ({ adminPosts: [post, ...state.adminPosts] }));
        } else {
            set((state) => ({ userPosts: [post, ...state.userPosts] }));
        }
    },

    updatePost: (updatedPost) => set((state) => ({
        adminPosts: state.adminPosts.map((p) => 
            p._id === updatedPost._id ? { ...p, ...updatedPost } : p
        ),
        userPosts: state.userPosts.map((p) => 
            p._id === updatedPost._id ? { ...p, ...updatedPost } : p
        )
    })),

    deletePost: (postId) => set((state) => ({
        adminPosts: state.adminPosts.filter((p) => p._id !== postId),
        userPosts: state.userPosts.filter((p) => p._id !== postId)
    })),

    setLike: (postId, liked, count) => set((state) => ({
        adminPosts: state.adminPosts.map((p) => 
            p._id === postId ? { ...p, userLiked: liked, likeCount: count } : p
        ),
        userPosts: state.userPosts.map((p) => 
            p._id === postId ? { ...p, userLiked: liked, likeCount: count } : p
        )
    })),

    incrementLike: (postId) => set((state) => ({
        adminPosts: state.adminPosts.map((p) => 
            p._id === postId ? { ...p, likeCount: (p.likeCount || 0) + 1 } : p
        ),
        userPosts: state.userPosts.map((p) => 
            p._id === postId ? { ...p, likeCount: (p.likeCount || 0) + 1 } : p
        )
    })),

    decrementLike: (postId) => set((state) => ({
        adminPosts: state.adminPosts.map((p) => 
            p._id === postId ? { ...p, likeCount: Math.max(0, (p.likeCount || 0) - 1) } : p
        ),
        userPosts: state.userPosts.map((p) => 
            p._id === postId ? { ...p, likeCount: Math.max(0, (p.likeCount || 0) - 1) } : p
        )
    }))
}));
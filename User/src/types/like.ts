// types/like.ts

export interface Like {
    _id: string;
    user: {
        _id: string;
        name: string;
        email: string;
    };
    post: string;
    createdAt: string;
}

export interface LikeResponse {
    message: string;
    liked: boolean;
    likeCount: number;
}

export interface LikesListResponse {
    data: Like[];
    pagination: {
        currentPage: number;
        totalPages: number;
        totalItems: number;
        itemsPerPage: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
    };
    userLiked: boolean;
}

// Socket event payloads
export interface LikeAddedPayload {
    postId: string;
    like: Like;
    likeCount: number;
}

export interface LikeRemovedPayload {
    postId: string;
    userId: string;
    likeCount: number;
}

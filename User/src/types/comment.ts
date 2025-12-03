// types/comment.ts
export interface Comment {
    _id: string;
    content: string;
    post: string;
    user: {
        _id: string;
        name: string;
    };
    parentComment?: string | null;
    depth: number;
    replies?: Comment[];
    createdAt: string;
    updatedAt?: string;
    deletedAt?: string | null;
}

export interface CommentTree extends Comment {
    replies: CommentTree[];
}

export interface CommentPagination {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
}

export interface CommentResponse {
    data: CommentTree[];
    pagination: CommentPagination;
}

// Socket event payloads
export interface CommentCreatedPayload {
    comment: Comment;
    parentCommentId: string | null;
}

export interface CommentUpdatedPayload {
    comment: Comment;
}

export interface CommentDeletedPayload {
    commentId: string;
    parentCommentId: string | null;
}

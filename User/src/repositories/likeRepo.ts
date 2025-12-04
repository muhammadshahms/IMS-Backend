// repositories/likeRepo.ts
import api from "../lib/axios";
import { LikeResponse, LikesListResponse } from "@/types/like";

export class LikeRepo {
    async toggleLike(postId: string): Promise<LikeResponse> {
        const response = await api.post<LikeResponse>(`/api/likes/toggle/${postId}`);
        return response.data;
    }

    async getLikesByPost(postId: string, page: number = 1, limit: number = 20): Promise<LikesListResponse> {
        const response = await api.get<LikesListResponse>(
            `/api/likes/post/${postId}`,
            {
                params: { page, limit }
            }
        );
        return response.data;
    }

    async toggleCommentLike(commentId: string): Promise<LikeResponse> {
        const response = await api.post<LikeResponse>(`/api/likes/toggle/comment/${commentId}`);
        return response.data;
    }

    async getCommentLikes(commentId: string, page: number = 1, limit: number = 20): Promise<LikesListResponse> {
        const response = await api.get<LikesListResponse>(
            `/api/likes/comment/${commentId}`,
            {
                params: { page, limit }
            }
        );
        return response.data;
    }
}

export const likeRepo = new LikeRepo();

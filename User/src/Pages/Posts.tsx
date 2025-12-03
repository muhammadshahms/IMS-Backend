
import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  User,
  Send,
  Loader2,
} from "lucide-react";
import { message } from "antd";
import { postRepo } from "../repositories/postRepo";
import UrlBreadcrumb from "@/components/UrlBreadcrumb";
import PaginatedList, { PaginatedListRef } from "../components/PaginatedList";
import { useAuthStore } from "@/hooks/store/authStore";
import { PostCard } from "@/components/PostCard";
import { useSocket } from "@/hooks/useSocket";

const Posts = () => {
  const [activeTab, setActiveTab] = useState("admin");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    link: "",
  });
  const [errors, setErrors] = useState<any>({});

  const listRef = useRef<PaginatedListRef<any>>(null);
  const { on, isConnected } = useSocket();

  // Socket event listeners
  useEffect(() => {
    if (!isConnected) return;

    const unsubscribeCreated = on("post:created", (payload: any) => {
      console.log("New post created:", payload.post);
      if (activeTab === "user") {
        listRef.current?.addItem(payload.post);
      }
    });

    const unsubscribeUpdated = on("post:updated", (payload: any) => {
      console.log("Post updated:", payload.post);
      listRef.current?.updateItem(payload.post._id, payload.post);
    });

    const unsubscribeDeleted = on("post:deleted", (payload: any) => {
      console.log("Post deleted:", payload.postId);
      listRef.current?.removeItem(payload.postId);
    });

    return () => {
      unsubscribeCreated?.();
      unsubscribeUpdated?.();
      unsubscribeDeleted?.();
    };
  }, [isConnected, on, activeTab]);

  const resetForm = () => {
    setFormData({ title: "", description: "", link: "" });
    setErrors({});
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev: any) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleCreate = async () => {
    try {
      setIsCreating(true);
      await postRepo.createUserPost(formData);
      message.success("Post created successfully");
      setIsModalOpen(false);
      resetForm();
    } catch (error: any) {
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      } else {
        message.error(error.response?.data?.message || "Failed to create post");
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (postId: string) => {
    try {
      await postRepo.deleteUserPost(postId);
      message.success("Post deleted successfully");
    } catch (error: any) {
      message.error(error.response?.data?.message || "Failed to delete post");
    }
  };

  const handleEdit = async (postId: string, updatedData: any) => {
    try {
      await postRepo.updateUserPost(postId, updatedData);
      message.success("Post updated successfully");
    } catch (error: any) {
      message.error(error.response?.data?.message || "Failed to update post");
    }
  };

  return (
    <div className="p-6 space-y-6">

      <UrlBreadcrumb />
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Community Posts
          </h1>
          <p className="text-sm text-muted-foreground">
            Share updates and engage with the community
          </p>
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 h-11">
              <TabsTrigger value="admin" className="gap-2">
                <Badge variant="outline" className="h-5 w-5 rounded-full p-0 border-current">A</Badge>
                Admin Announcements
              </TabsTrigger>
              <TabsTrigger value="user" className="gap-2">
                <User className="w-4 h-4" />
                User Posts
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <Button onClick={() => setIsModalOpen(true)} size="lg" className="gap-2 shadow-md">
          <Plus className="w-5 h-5" />
          Create Post
        </Button>
      </div>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Posts List */}
        {activeTab === "admin" && (
          <PaginatedList
            key="admin-posts"
            fetchData={async (page, limit) => {
              const res = await postRepo.getAllPosts(page, limit);
              return {
                items: res.posts || res.data || [],
                pagination: {
                  currentPage: res.pagination.currentPage,
                  totalPages: res.pagination.totalPages,
                  totalPosts: res.pagination.total,
                  hasMore: res.pagination.hasMore,
                  postsPerPage: res.pagination.limit
                }
              };
            }}
            renderItem={(post: any) => (
              <PostCard
                postId={post._id}
                title={post.title}
                description={post.description}
                link={post.link}
                createdAt={post.createdAt}
                isAdmin
              />
            )}
            pageSize={10}
          />
        )}

        {activeTab === "user" && (
          <PaginatedList
            ref={listRef}
            key="user-posts"
            fetchData={async (page, limit) => {
              const res = await postRepo.getAllUsersPosts(page, limit);
              return {
                items: res.posts || res.data || [],
                pagination: {
                  currentPage: res.pagination.currentPage,
                  totalPages: res.pagination.totalPages,
                  totalPosts: res.pagination.total,
                  hasMore: res.pagination.hasMore,
                  postsPerPage: res.pagination.limit
                }
              };
            }}
            renderItem={(post: any) => (
              <PostCard
                postId={post._id}
                title={post.title}
                description={post.description}
                link={post.link}
                createdAt={post.createdAt}
                authorName={post.user?.name}
                authorId={post.user?._id}
                onDelete={handleDelete}
                onEdit={handleEdit}
              />
            )}
            pageSize={10}
          />
        )}

        {/* Create Post Modal */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="sm:max-w-[580px]">
            <DialogHeader>
              <DialogTitle className="text-xl">Create New Post</DialogTitle>
            </DialogHeader>

            <div className="space-y-5 py-4">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-sm font-medium">
                  Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  disabled={isCreating}
                  placeholder="Enter an engaging title..."
                  className={errors.title ? "border-destructive" : ""}
                />
                {errors.title && (
                  <p className="text-xs text-destructive">{errors.title}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium">
                  Description <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="description"
                  name="description"
                  rows={5}
                  value={formData.description}
                  onChange={handleChange}
                  disabled={isCreating}
                  placeholder="Share your thoughts, ideas, or updates..."
                  className={`resize-none ${errors.description ? "border-destructive" : ""}`}
                />
                {errors.description && (
                  <p className="text-xs text-destructive">{errors.description}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="link" className="text-sm font-medium">
                  Link <span className="text-muted-foreground">(Optional)</span>
                </Label>
                <Input
                  id="link"
                  name="link"
                  value={formData.link}
                  onChange={handleChange}
                  disabled={isCreating}
                  placeholder="https://example.com"
                  className={errors.link ? "border-destructive" : ""}
                />
                {errors.link && (
                  <p className="text-xs text-destructive">{errors.link}</p>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsModalOpen(false);
                  resetForm();
                }}
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={isCreating} className="gap-2">
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Create Post
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Posts;
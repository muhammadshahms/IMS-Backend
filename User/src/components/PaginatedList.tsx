
import React, { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from "react";
import Loader from "@/components/Loader";

interface Pagination {
  currentPage: number;
  totalPages: number;
  totalPosts: number;
  hasMore: boolean;
  postsPerPage: number;
}

interface PaginatedListProps<T> {
  fetchData: (page: number, limit: number) => Promise<{ items: T[]; pagination: Pagination }>;
  renderItem: (item: T, index: number) => React.ReactNode;
  pageSize?: number;
  key?: string; // Add key prop to force reset when switching tabs
}

export interface PaginatedListRef<T> {
  addItem: (item: T) => void;
  updateItem: (id: string, item: Partial<T>) => void;
  removeItem: (id: string) => void;
  refresh: () => void;
}

const PaginatedList = forwardRef(<T extends { _id?: string }>(
  { fetchData, renderItem, pageSize = 10 }: PaginatedListProps<T>,
  ref: React.Ref<PaginatedListRef<T>>
) => {
  const [items, setItems] = useState<T[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const observer = useRef<IntersectionObserver | null>(null);

  // Wrap loadPage in useCallback with proper dependencies
  const loadPage = useCallback(async (pageToLoad: number, append = false) => {
    try {
      append ? setLoadingMore(true) : setLoading(true);
      setError(null);

      const response = await fetchData(pageToLoad, pageSize);
      
      if (!response) {
        throw new Error("No response from fetchData");
      }

      const newItems = response.items || [];
      const pagination = response.pagination;

      setItems(prev => (append ? [...prev, ...newItems] : newItems));
      setHasMore(pagination?.hasMore ?? false);
    } catch (error) {
      console.error("Failed to fetch items:", error);
      setError(error instanceof Error ? error.message : "Failed to fetch items");
      setHasMore(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [fetchData, pageSize]);

  useImperativeHandle(ref, () => ({
    addItem: (item: T) => {
      setItems((prev) => [item, ...prev]);
    },
    updateItem: (id: string, updatedItem: Partial<T>) => {
      setItems((prev) =>
        prev.map((item) => (item._id === id ? { ...item, ...updatedItem } : item))
      );
    },
    removeItem: (id: string) => {
      setItems((prev) => prev.filter((item) => item._id !== id));
    },
    refresh: () => {
      setPage(1);
      loadPage(1, false);
    },
  }));

  const lastItemRef = useCallback(
    (node: HTMLDivElement) => {
      if (loadingMore) return;
      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setPage((prev) => prev + 1);
        }
      });

      if (node) observer.current.observe(node);
    },
    [loadingMore, hasMore]
  );

  // Load more when page changes (skip page 1 as it's loaded in the other effect)
  useEffect(() => {
    if (page > 1) {
      loadPage(page, true);
    }
  }, [page, loadPage]);

  // Load initial data on mount
  useEffect(() => {
    loadPage(1, false);
  }, [loadPage]);

  // Show loader on initial load
  if (loading && page === 1) return <Loader />;

  return (
    <div className="space-y-4">
      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          <p className="font-semibold">Error:</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Items list */}
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <div key={item._id || index} ref={isLast ? lastItemRef : null}>
            {renderItem(item, index)}
          </div>
        );
      })}

      {/* Loading more indicator */}
      {loadingMore && <Loader />}

      {/* No more items message */}
      {!hasMore && items.length > 0 && (
        <p className="text-gray-500 text-center text-sm">No more items to load</p>
      )}

      {/* Empty state */}
      {items.length === 0 && !loading && !error && (
        <p className="text-gray-500 text-center">No items found</p>
      )}
    </div>
  );
});

// Explicitly cast the component to handle the generic type correctly in TSX
export default PaginatedList as <T>(props: PaginatedListProps<T> & { ref?: React.Ref<PaginatedListRef<T>> }) => React.ReactElement;

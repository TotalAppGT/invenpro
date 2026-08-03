"use client";

import { useState, useMemo, useCallback, useEffect } from "react";

export interface UsePaginationResult {
  currentPage: number;
  totalPages: number;
  paginatedItems: <T>(items: T[]) => T[];
  nextPage: () => void;
  prevPage: () => void;
  goToPage: (page: number) => void;
  setItemsPerPage: (count: number) => void;
  itemsPerPage: number;
  totalItems: number;
  startIndex: number;
  endIndex: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export function usePagination<T>(items: T[], defaultItemsPerPage: number = 10): UsePaginationResult {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPageState] = useState(defaultItemsPerPage);

  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const paginatedItems = useCallback(
    <U extends T>(sourceItems: U[]): U[] => {
      const start = (currentPage - 1) * itemsPerPage;
      const end = start + itemsPerPage;
      return sourceItems.slice(start, end);
    },
    [currentPage, itemsPerPage]
  );

  const nextPage = useCallback(() => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  }, [totalPages]);

  const prevPage = useCallback(() => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  }, []);

  const goToPage = useCallback(
    (page: number) => {
      const target = Math.max(1, Math.min(page, totalPages));
      setCurrentPage(target);
    },
    [totalPages]
  );

  const setItemsPerPage = useCallback((count: number) => {
    setItemsPerPageState(count);
    setCurrentPage(1);
  }, []);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const hasNextPage = currentPage < totalPages;
  const hasPrevPage = currentPage > 1;

  return {
    currentPage,
    totalPages,
    paginatedItems,
    nextPage,
    prevPage,
    goToPage,
    setItemsPerPage,
    itemsPerPage,
    totalItems,
    startIndex,
    endIndex,
    hasNextPage,
    hasPrevPage,
  };
}

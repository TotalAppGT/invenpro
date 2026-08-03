import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { TenantInfo, AuthUser } from "@/components/providers";

export interface Notification {
  id: string;
  type: "success" | "error" | "warning" | "info";
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
}

export interface AppState {
  tenant: TenantInfo | null;
  user: AuthUser | null;
  sidebarCollapsed: boolean;
  currentPage: string;
  theme: "dark" | "light";
  notifications: Notification[];

  setTenant: (tenant: TenantInfo | null) => void;
  setUser: (user: AuthUser | null) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setCurrentPage: (page: string) => void;
  setTheme: (theme: "dark" | "light") => void;
  toggleTheme: () => void;
  addNotification: (notification: Omit<Notification, "id" | "timestamp" | "read">) => void;
  removeNotification: (id: string) => void;
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;
}

let notificationCounter = 0;

function generateNotificationId(): string {
  notificationCounter += 1;
  return `notif_${Date.now()}_${notificationCounter}`;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      tenant: null,
      user: null,
      sidebarCollapsed: false,
      currentPage: "dashboard",
      theme: "dark",
      notifications: [],

      setTenant: (tenant) => set({ tenant }),

      setUser: (user) => set({ user }),

      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

      setCurrentPage: (page) => set({ currentPage: page }),

      setTheme: (theme) => set({ theme }),

      toggleTheme: () =>
        set((state) => ({ theme: state.theme === "dark" ? "light" : "dark" })),

      addNotification: (notification) => {
        const newNotification: Notification = {
          ...notification,
          id: generateNotificationId(),
          timestamp: Date.now(),
          read: false,
        };

        set((state) => ({
          notifications: [newNotification, ...state.notifications].slice(0, 50),
        }));
      },

      removeNotification: (id) =>
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        })),

      markNotificationRead: (id) =>
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
        })),

      clearNotifications: () => set({ notifications: [] }),
    }),
    {
      name: "invenpro-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        theme: state.theme,
      }),
    }
  )
);

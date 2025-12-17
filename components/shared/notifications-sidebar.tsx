"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  X,
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  Archive,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

interface Notification {
  id: string;
  type: "submission" | "review" | "role_change" | "archive";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  submission_id?: string;
}

export default function NotificationsSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchNotifications();
  }, []);

  useEffect(() => {
    const count = notifications.filter((n) => !n.read).length;
    setUnreadCount(count);
  }, [notifications]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/notifications");
      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = (id: string) => {
    setNotifications(
      notifications.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, read: true })));
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read
    markAsRead(notification.id);

    // Close sidebar
    setIsOpen(false);

    // Navigate to submission if available
    if (notification.submission_id) {
      // First, we need to get the actual submission ID from the API
      try {
        const response = await fetch("/api/submissions");
        if (response.ok) {
          const submissions = await response.json();
          const submission = submissions.find(
            (s: any) => s.submission_id === notification.submission_id
          );

          if (submission) {
            router.push(`/dashboard/submissions/${submission.id}`);
          }
        }
      } catch (error) {
        console.error("Failed to navigate to submission:", error);
      }
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "submission":
        return <FileText className="w-4 h-4" />;
      case "review":
        return <Clock className="w-4 h-4" />;
      case "role_change":
        return <AlertCircle className="w-4 h-4" />;
      case "archive":
        return <Archive className="w-4 h-4" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return time.toLocaleDateString();
  };

  return (
    <>
      {/* Notification Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-slate-100 rounded-lg transition-colors"
      >
        <Bell className="w-5 h-5 text-slate-600" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        )}
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed top-0 right-0 h-full w-96 bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-cyan-600" />
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Notifications
              </h2>
              <p className="text-xs text-slate-500">{unreadCount} unread</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(false)}
            className="h-8 w-8"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Actions */}
        {unreadCount > 0 && (
          <div className="p-3 border-b border-slate-200">
            <Button
              variant="outline"
              size="sm"
              onClick={markAllAsRead}
              className="w-full text-xs"
            >
              Mark all as read
            </Button>
          </div>
        )}

        {/* Notifications List */}
        <div className="overflow-y-auto h-[calc(100%-120px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <Bell className="w-12 h-12 text-slate-300 mb-3" />
              <p className="text-slate-600 font-medium">No notifications</p>
              <p className="text-slate-500 text-sm text-center mt-1">
                You're all caught up!
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-slate-50 transition-colors cursor-pointer ${
                    !notification.read ? "bg-cyan-50" : ""
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex gap-3">
                    <div
                      className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                        !notification.read
                          ? "bg-cyan-100 text-cyan-600"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {getIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4
                          className={`text-sm font-semibold ${
                            !notification.read
                              ? "text-slate-900"
                              : "text-slate-700"
                          }`}
                        >
                          {notification.title}
                        </h4>
                        <span className="text-xs text-slate-500 whitespace-nowrap">
                          {getTimeAgo(notification.timestamp)}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 line-clamp-2">
                        {notification.message}
                      </p>
                      {notification.submission_id && (
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-xs font-mono bg-slate-100 px-2 py-1 rounded">
                            {notification.submission_id}
                          </span>
                          <ExternalLink className="w-3 h-3 text-cyan-600" />
                        </div>
                      )}
                    </div>
                    {!notification.read && (
                      <div className="flex-shrink-0 w-2 h-2 bg-cyan-500 rounded-full mt-2"></div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

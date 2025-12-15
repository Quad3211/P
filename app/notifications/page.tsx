"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Bell, CheckCircle, Clock, AlertCircle, FileText, Archive, CheckCheck, Trash2, Filter } from "lucide-react"

// Mock notifications
const mockNotifications = [
  {
    id: "1",
    type: "submission",
    title: "Submission Approved",
    message: "Your submission 'Advanced Physics Test' has been approved by AMO",
    timestamp: "2024-12-14T10:30:00Z",
    read: false,
    priority: "high",
    icon: "check",
    submission_id: "RFA-2024-00145",
  },
  {
    id: "2",
    type: "review",
    title: "Review Required",
    message: "New submission 'Chemistry Lab Exam' is pending your PC review",
    timestamp: "2024-12-14T09:15:00Z",
    read: false,
    priority: "urgent",
    icon: "clock",
    submission_id: "RFA-2024-00144",
  },
  {
    id: "3",
    type: "submission",
    title: "Submission Status Update",
    message: "Your submission 'Biology Midterm' is now in AMO review",
    timestamp: "2024-12-13T16:45:00Z",
    read: true,
    priority: "normal",
    icon: "file",
    submission_id: "RFA-2024-00143",
  },
  {
    id: "4",
    type: "archive",
    title: "Document Archived",
    message: "Submission 'English Literature Final' has been archived successfully",
    timestamp: "2024-12-13T14:20:00Z",
    read: true,
    priority: "low",
    icon: "archive",
    submission_id: "RFA-2024-00142",
  },
  {
    id: "5",
    type: "review",
    title: "Review Reminder",
    message: "You have 2 pending reviews that require attention",
    timestamp: "2024-12-13T09:00:00Z",
    read: false,
    priority: "normal",
    icon: "alert",
  },
  {
    id: "6",
    type: "submission",
    title: "Submission Received",
    message: "Your submission 'Mathematics Assessment' has been received and assigned to reviewers",
    timestamp: "2024-12-12T15:30:00Z",
    read: true,
    priority: "normal",
    icon: "check",
    submission_id: "RFA-2024-00141",
  },
]

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState(mockNotifications)
  const [filter, setFilter] = useState<"all" | "unread" | "review" | "submission">("all")

  const filteredNotifications = notifications.filter((notif) => {
    if (filter === "all") return true
    if (filter === "unread") return !notif.read
    return notif.type === filter
  })

  const unreadCount = notifications.filter((n) => !n.read).length

  const markAsRead = (id: string) => {
    setNotifications(notifications.map((n) => (n.id === id ? { ...n, read: true } : n)))
  }

  const markAllAsRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, read: true })))
  }

  const deleteNotification = (id: string) => {
    setNotifications(notifications.filter((n) => n.id !== id))
  }

  const clearAll = () => {
    setNotifications([])
  }

  const getIcon = (iconType: string, priority: string) => {
    const iconClass = priority === "urgent" ? "text-red-600" : priority === "high" ? "text-orange-600" : "text-cyan-600"

    switch (iconType) {
      case "check":
        return <CheckCircle className={`w-5 h-5 ${iconClass}`} />
      case "clock":
        return <Clock className={`w-5 h-5 ${iconClass}`} />
      case "alert":
        return <AlertCircle className={`w-5 h-5 ${iconClass}`} />
      case "file":
        return <FileText className={`w-5 h-5 ${iconClass}`} />
      case "archive":
        return <Archive className={`w-5 h-5 ${iconClass}`} />
      default:
        return <Bell className={`w-5 h-5 ${iconClass}`} />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "border-l-4 border-red-500"
      case "high":
        return "border-l-4 border-orange-500"
      case "normal":
        return "border-l-4 border-cyan-500"
      case "low":
        return "border-l-4 border-slate-300"
      default:
        return ""
    }
  }

  const getTimeAgo = (timestamp: string) => {
    const now = new Date()
    const time = new Date(timestamp)
    const diffMs = now.getTime() - time.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`
    return time.toLocaleDateString()
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Bell className="w-8 h-8 text-cyan-600" />
              <div>
                <h1 className="text-4xl font-bold text-slate-900">Notifications</h1>
                <p className="text-slate-600">
                  {unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {unreadCount > 0 && (
                <Button onClick={markAllAsRead} variant="outline" className="gap-2">
                  <CheckCheck className="w-4 h-4" />
                  Mark All Read
                </Button>
              )}
              {notifications.length > 0 && (
                <Button onClick={clearAll} variant="outline" className="gap-2 text-red-600 hover:text-red-700">
                  <Trash2 className="w-4 h-4" />
                  Clear All
                </Button>
              )}
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 border-b border-slate-200">
            <button
              onClick={() => setFilter("all")}
              className={`px-4 py-2 font-medium transition-colors border-b-2 ${
                filter === "all" ? "border-cyan-500 text-cyan-600" : "border-transparent text-slate-600"
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setFilter("unread")}
              className={`px-4 py-2 font-medium transition-colors border-b-2 ${
                filter === "unread" ? "border-cyan-500 text-cyan-600" : "border-transparent text-slate-600"
              }`}
            >
              Unread ({unreadCount})
            </button>
            <button
              onClick={() => setFilter("review")}
              className={`px-4 py-2 font-medium transition-colors border-b-2 ${
                filter === "review" ? "border-cyan-500 text-cyan-600" : "border-transparent text-slate-600"
              }`}
            >
              Reviews ({notifications.filter((n) => n.type === "review").length})
            </button>
            <button
              onClick={() => setFilter("submission")}
              className={`px-4 py-2 font-medium transition-colors border-b-2 ${
                filter === "submission" ? "border-cyan-500 text-cyan-600" : "border-transparent text-slate-600"
              }`}
            >
              Submissions ({notifications.filter((n) => n.type === "submission").length})
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="space-y-3">
          {filteredNotifications.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Bell className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">No notifications</h3>
                <p className="text-slate-600">
                  {filter === "unread"
                    ? "You're all caught up! No unread notifications."
                    : "You don't have any notifications yet."}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredNotifications.map((notification) => (
              <Card
                key={notification.id}
                className={`transition-all hover:shadow-md ${getPriorityColor(notification.priority)} ${
                  !notification.read ? "bg-cyan-50" : ""
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 mt-1">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          !notification.read ? "bg-cyan-100" : "bg-slate-100"
                        }`}
                      >
                        {getIcon(notification.icon, notification.priority)}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3
                          className={`font-semibold ${!notification.read ? "text-slate-900" : "text-slate-700"}`}
                        >
                          {notification.title}
                        </h3>
                        <span className="text-xs text-slate-500 whitespace-nowrap">
                          {getTimeAgo(notification.timestamp)}
                        </span>
                      </div>

                      <p className="text-sm text-slate-600 mb-2">{notification.message}</p>

                      {notification.submission_id && (
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-xs font-mono bg-slate-100 px-2 py-1 rounded">
                            {notification.submission_id}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        {!notification.read && (
                          <Button
                            onClick={() => markAsRead(notification.id)}
                            size="sm"
                            variant="outline"
                            className="text-xs"
                          >
                            Mark as read
                          </Button>
                        )}
                        {notification.submission_id && (
                          <Button size="sm" className="bg-cyan-500 hover:bg-cyan-600 text-xs">
                            View Submission
                          </Button>
                        )}
                        <Button
                          onClick={() => deleteNotification(notification.id)}
                          size="sm"
                          variant="ghost"
                          className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 ml-auto"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>

                    {!notification.read && (
                      <div className="w-2 h-2 bg-cyan-500 rounded-full flex-shrink-0 mt-2"></div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Info Card */}
        {notifications.length > 0 && (
          <Card className="mt-6 bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex gap-3">
                <Bell className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-blue-900 mb-1">Notification Settings</h4>
                  <p className="text-sm text-blue-800">
                    You can customize your notification preferences in the Settings page. Choose which events trigger
                    notifications and how you receive them (email, in-app, or both).
                  </p>
                  <Button variant="link" className="text-blue-600 hover:text-blue-700 px-0 mt-2">
                    Go to Settings →
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
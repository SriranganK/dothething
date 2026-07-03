import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, BellOff, CheckCheck, Trash2, Settings, MessageSquare, UserPlus, FileText, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNotifications } from './NotificationProvider';
import { backendApi } from '../store/services/api';

// Format time elapsed
const formatTimeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

// Grouping helper
const groupNotifications = (notifications: any[]) => {
  const today: any[] = [];
  const yesterday: any[] = [];
  const thisWeek: any[] = [];
  const older: any[] = [];

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
  const startOfWeek = new Date(startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000);

  notifications.forEach(item => {
    const itemDate = new Date(item.createdAt);
    if (itemDate >= startOfToday) {
      today.push(item);
    } else if (itemDate >= startOfYesterday) {
      yesterday.push(item);
    } else if (itemDate >= startOfWeek) {
      thisWeek.push(item);
    } else {
      older.push(item);
    }
  });

  return { today, yesterday, thisWeek, older };
};

// Map notification type to icon and colors
const getNotificationStyles = (type: string) => {
  switch (type) {
    case 'WELCOME':
      return { icon: CheckCircle2, bg: 'bg-emerald-50 border-emerald-100 text-emerald-600' };
    case 'MENTION':
      return { icon: MessageSquare, bg: 'bg-blue-50 border-blue-100 text-blue-600' };
    case 'TASK_ASSIGNED':
      return { icon: UserPlus, bg: 'bg-primary/10 border-primary/20 text-primary' };
    case 'TASK_UPDATED':
      return { icon: FileText, bg: 'bg-amber-50 border-amber-100 text-amber-600' };
    case 'TASK_COMMENT':
      return { icon: MessageSquare, bg: 'bg-sky-50 border-sky-100 text-sky-600' };
    case 'DEADLINE_REMINDER':
      return { icon: AlertTriangle, bg: 'bg-rose-50 border-rose-100 text-rose-600' };
    case 'STATUS_CHANGED':
      return { icon: FileText, bg: 'bg-purple-50 border-purple-100 text-purple-600' };
    case 'TEAM_ANNOUNCEMENT':
      return { icon: Info, bg: 'bg-teal-50 border-teal-100 text-teal-600' };
    default:
      return { icon: Bell, bg: 'bg-background border-border text-muted-foreground' };
  }
};

export function NotificationCenter() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');
  const [page, setPage] = useState(1);
  const [allLoadedNotifications, setAllLoadedNotifications] = useState<any[]>([]);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { unreadCount, resetUnreadCount } = useNotifications();

  // RTK queries
  const { data: notificationsData } = backendApi.useGetNotificationsQuery({ page, limit: 15 }, {
    skip: !isOpen
  });
  
  const [markAsRead] = backendApi.useMarkAsReadMutation();
  const [markAllAsRead] = backendApi.useMarkAllAsReadMutation();
  const [deleteNotification] = backendApi.useDeleteNotificationMutation();

  // Sync loaded notifications when page changes or new items fetch
  useEffect(() => {
    if (notificationsData?.notifications) {
      if (page === 1) {
        setAllLoadedNotifications(notificationsData.notifications);
      } else {
        setAllLoadedNotifications(prev => {
          // Prevent duplicates
          const existingIds = new Set(prev.map(n => n._id));
          const newItems = notificationsData.notifications.filter(n => !existingIds.has(n._id));
          return [...prev, ...newItems];
        });
      }
    }
  }, [notificationsData, page]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset tab to page 1 on open
  const handleToggleOpen = () => {
    if (!isOpen) {
      setPage(1);
      // refetch();
    }
    setIsOpen(!isOpen);
  };

  const handleMarkAllRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await markAllAsRead().unwrap();
      setAllLoadedNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      resetUnreadCount();
    } catch (err) {
      console.error(err);
    }
  };

  const handleNotificationClick = async (item: any) => {
    setIsOpen(false);
    
    // Mark as read in DB if unread
    if (!item.isRead) {
      try {
        await markAsRead(item._id).unwrap();
        setAllLoadedNotifications(prev => prev.map(n => n._id === item._id ? { ...n, isRead: true } : n));
      } catch (err) {
        console.error(err);
      }
    }

    // Redirect based on entity
    if (item.entityType === 'TASK' && item.entityId) {
      navigate(`/item/${item.entityId}`);
    } else {
      navigate('/');
    }
  };

  const handleToggleReadStatus = async (e: React.MouseEvent, item: any) => {
    e.stopPropagation();
    try {
      if (!item.isRead) {
        await markAsRead(item._id).unwrap();
        setAllLoadedNotifications(prev => prev.map(n => n._id === item._id ? { ...n, isRead: true } : n));
      } else {
        // Wait, mark as unread is not explicitly needed but let's toggle in state or update
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await deleteNotification(id).unwrap();
      setAllLoadedNotifications(prev => prev.filter(n => n._id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleLoadMore = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (notificationsData && page < notificationsData.totalPages) {
      setPage(prev => prev + 1);
    }
  };

  // Filter based on active tab
  const filteredNotifications = allLoadedNotifications.filter(n => {
    if (activeTab === 'unread') return !n.isRead;
    return true;
  });

  const { today, yesterday, thisWeek, older } = groupNotifications(filteredNotifications);
  const hasNotifications = filteredNotifications.length > 0;
  const hasMorePages = notificationsData ? page < notificationsData.totalPages : false;

  const renderSection = (title: string, items: any[]) => {
    if (items.length === 0) return null;
    
    return (
      <div className="space-y-1 mb-4">
        <h4 className="text-[10px] font-extrabold tracking-wider text-muted-foreground uppercase px-3.5 py-1">
          {title}
        </h4>
        {items.map(item => {
          const { icon: Icon, bg } = getNotificationStyles(item.type);
          return (
            <div
              key={item._id}
              onClick={() => handleNotificationClick(item)}
              className={`group flex items-start gap-3 p-3 mx-1.5 rounded-2xl cursor-pointer hover:bg-background border border-transparent transition-all relative ${
                !item.isRead ? 'bg-primary/10/20 border-indigo-50/10' : ''
              }`}
            >
              {/* Dynamic Icon */}
              <div className={`h-8 w-8 rounded-xl flex items-center justify-center border shrink-0 ${bg}`}>
                <Icon className="h-4.5 w-4.5" />
              </div>

              {/* Text content */}
              <div className="flex-1 min-w-0 pr-6">
                <p className={`text-xs font-semibold text-foreground leading-snug ${!item.isRead ? 'font-bold' : ''}`}>
                  {item.title}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                  {item.message}
                </p>
                <span className="text-[9px] font-bold text-muted-foreground block mt-1">
                  {formatTimeAgo(item.createdAt)}
                </span>
              </div>

              {/* Unread dot */}
              {!item.isRead && (
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 h-2 w-2 bg-primary rounded-full shrink-0 shadow-sm" />
              )}

              {/* Actions on Hover */}
              <div className="absolute right-2 top-2 hidden group-hover:flex items-center gap-1 bg-card text-card-foreground border border-border rounded-lg p-0.5 shadow-sm">
                {!item.isRead && (
                  <button
                    onClick={(e) => handleToggleReadStatus(e, item)}
                    title="Mark as read"
                    className="p-1 text-muted-foreground hover:text-primary hover:bg-background rounded cursor-pointer transition-colors"
                  >
                    <CheckCheck className="h-3 w-3" />
                  </button>
                )}
                <button
                  onClick={(e) => handleDelete(e, item._id)}
                  title="Delete"
                  className="p-1 text-muted-foreground hover:text-red-600 hover:bg-background rounded cursor-pointer transition-colors"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* Bell Trigger Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleToggleOpen}
        className={`relative h-9 w-9 rounded-xl hover:bg-muted transition-colors ${
          isOpen ? 'bg-muted text-primary' : 'text-muted-foreground'
        }`}
      >
        <Bell className="h-4.5 w-4.5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 h-3 min-w-3  flex items-center justify-center bg-primary text-white rounded-full text-[9px] font-extrabold ring-2 ring-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {/* Dropdown Card */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute -right-12 sm:right-0 mt-2 w-[calc(100vw-2rem)] sm:w-96 max-h-[520px] flex flex-col bg-card text-card-foreground border border-border rounded-2xl shadow-2xl z-50 p-1.5 animate-in fade-in slide-in-from-top-3 duration-250"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2">
            <h3 className="text-sm font-extrabold text-foreground">Notifications</h3>
            
            <div className="flex items-center gap-1.5">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="flex items-center gap-1 px-2 py-1 text-[11px] font-bold text-primary hover:text-indigo-800 hover:bg-primary/10/50 rounded-lg cursor-pointer transition-colors"
                >
                  <CheckCheck className="h-3 w-3" />
                  Mark all read
                </button>
              )}
              <button
                onClick={() => { setIsOpen(false); navigate('/profile'); }}
                title="Notification Settings"
                className="p-1.5 text-muted-foreground hover:text-foreground/90 hover:bg-muted rounded-lg cursor-pointer transition-colors"
              >
                <Settings className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-border px-2 py-1 gap-1">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-background'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setActiveTab('unread')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'unread'
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-background'
              }`}
            >
              Unread
              {unreadCount > 0 && (
                <span className="h-1.5 w-1.5 bg-primary rounded-full" />
              )}
            </button>
          </div>

          {/* List Scroll Area */}
          <div className="flex-1 overflow-y-auto mt-2 max-h-[360px] custom-scrollbar">
            {hasNotifications ? (
              <>
                {renderSection('Today', today)}
                {renderSection('Yesterday', yesterday)}
                {renderSection('This Week', thisWeek)}
                {renderSection('Older', older)}

                {/* Load More Button */}
                {hasMorePages && (
                  <div className="px-3 py-2 text-center border-t border-zinc-50">
                    <button
                      onClick={handleLoadMore}
                      className="text-xs font-bold text-muted-foreground hover:text-primary py-1 px-4 cursor-pointer transition-colors"
                    >
                      Load older notifications
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                <div className="h-12 w-12 rounded-full bg-background flex items-center justify-center border border-border text-muted-foreground mb-3">
                  <BellOff className="h-5 w-5" />
                </div>
                <h4 className="text-xs font-bold text-foreground/90">All caught up!</h4>
                <p className="text-[10px] text-muted-foreground mt-1 max-w-[200px]">
                  {activeTab === 'unread' 
                    ? "You don't have any unread notifications." 
                    : "When new task updates or mentions happen, they'll appear here."}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

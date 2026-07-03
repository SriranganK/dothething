import { toast } from "sonner";
// Home.tsx
import { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import type { WorkspaceType, BoardType } from "@/types/workspace";

// Redux hooks and actions
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  setActiveTab,
  setActiveView,
  setShowCreateModal,
  setShowBoardCreateModal,
  setShowSettingsModal,
  setActiveWorkspaceId,
} from "@/store/slices/uiSlice";

import {
  useGetWorkspacesQuery,
  useGetBoardsQuery,
  backendApi,
  useDeleteBoardMutation,
  useGetWorkspaceItemsQuery,
  useGetWorkspaceMembersQuery,
  useCreateItemMutation,
  useUpdateItemMutation,
  useDeleteItemMutation,
} from "@/store/services/api";

// Subcomponents
import { TopNavbar } from "@/components/TopNavbar";
import { MainSidebar } from "@/components/MainSidebar";
import { WorkspaceSidebar } from "@/components/WorkspaceSidebar";
import { WorkspaceCreateModal } from "@/components/WorkspaceCreateModal";
import { BoardCreateModal } from "@/components/BoardCreateModal";
import { SettingsModal } from "@/components/SettingsModal";
import { WorkspaceDashboard } from "@/Pages/WorkspaceDashboard";
import { WorkspaceBoard } from "@/Pages/WorkspaceBoard";
import ProfilePage from "@/Pages/ProfilePage";
import UserProfilePage from "@/Pages/UserProfilePage";
import { Milestones } from "@/Pages/Milestones";
import { MilestoneDetails } from "@/Pages/MilestoneDetails";
import { LabelsManagement } from "@/Pages/LabelsManagement";
import { TimelinePage } from "@/Pages/TimelinePage";
import { MyCalendarPage } from "@/Pages/MyCalendarPage";
import { MyTimelinePage } from "@/Pages/MyTimelinePage";

// Task Views & Modals
import { ListView } from "@/components/board/ListView";
import { CalendarView } from "@/components/board/CalendarView";
import { TimelineView } from "@/components/board/TimelineView";
import { ItemDetailModal } from "@/components/ItemDetailModal";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Settings } from "lucide-react";

// UI Components for the local components / Dialog
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToastNotifications } from "@/hooks/useToastNotifications";
import { useNotifications } from "@/components/NotificationProvider";

export default function HomePage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user, token, isAuthenticated, loading: authLoading } = useAuth();
  // Read workspace/board IDs from URL (present when user refreshes or shares a link)
  const { workspaceId: urlWorkspaceId, boardId: urlBoardId, userId: urlUserId } = useParams<{ workspaceId?: string; boardId?: string; userId?: string }>();

  const justCreatedWorkspaceIdRef = useRef<string | null>(null);

  // Redux UI State
  const {
    activeTab,
    activeView,
    showCreateModal,
    showBoardCreateModal,
    showSettingsModal,
    activeWorkspaceId,
  } = useAppSelector((state) => state.ui);

  // RTK Query fetches
  const { data: workspacesData, isLoading: workspacesLoading, isFetching: workspacesFetching } = useGetWorkspacesQuery(undefined, {
    skip: !isAuthenticated,
  });
  const workspaces = workspacesData?.workspaces || [];

  const activeWorkspace = workspaces.find((w) => w._id === activeWorkspaceId) || workspaces[0] || null;

  const { data: boardsData } = useGetBoardsQuery(
    activeWorkspace?._id || "",
    { skip: !activeWorkspace?._id }
  );
  const boards = boardsData?.boards || [];

  const [deleteBoard] = useDeleteBoardMutation();
  const { data: workspaceItemsData } = useGetWorkspaceItemsQuery(
    activeWorkspace?._id || "",
    { skip: !activeWorkspace?._id }
  );
  const workspaceItems = workspaceItemsData?.items || [];

  const { data: membersData } = useGetWorkspaceMembersQuery(
    activeWorkspace?._id || "",
    { skip: !activeWorkspace?._id }
  );
  const workspaceMembers = membersData?.members || [];

  const [createItem] = useCreateItemMutation();
  const [updateItem] = useUpdateItemMutation();
  const [deleteItem] = useDeleteItemMutation();

  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Map and filter my tasks dynamically
  const myTasks = useMemo(() => {
    if (!workspaceItems || !user?.email) return [];
    return workspaceItems
      .filter((item) => item.assignee?.toLowerCase().trim() === user.email?.toLowerCase().trim())
      .map((item) => {
        let targetColId = "todo";
        const colName = item.status?.toLowerCase() || item.columnId?.toLowerCase() || "";
        if (
          colName.includes("done") ||
          colName.includes("complete") ||
          colName.includes("resolved") ||
          colName.includes("offered") ||
          colName.includes("offer") ||
          colName.includes("live")
        ) {
          targetColId = "done";
        } else if (
          colName.includes("progress") ||
          colName.includes("doing") ||
          colName.includes("started") ||
          colName.includes("active") ||
          colName.includes("develop")
        ) {
          targetColId = "progress";
        } else if (
          colName.includes("review") ||
          colName.includes("qa") ||
          colName.includes("test") ||
          colName.includes("interview")
        ) {
          targetColId = "review";
        }
        return { ...item, columnId: targetColId };
      });
  }, [workspaceItems, user?.email]);

  const dummyBoard = useMemo<BoardType>(() => ({
    _id: "my-tasks-board",
    name: "My Tasks",
    workspace: activeWorkspace?._id || "",
    columns: [
      { id: "todo", name: "To Do", order: 0 },
      { id: "progress", name: "In Progress", order: 1 },
      { id: "review", name: "Review", order: 2 },
      { id: "done", name: "Done", order: 3, isDone: true },
    ],
    owner: user?.id || "",
    createdAt: new Date().toISOString(),
  }), [activeWorkspace?._id, user?.id]);

  const emailToNameRecord = useMemo(() => {
    const record: Record<string, string> = {};
    workspaceMembers.forEach((m: any) => {
      if (m.userId && m.userId.email && m.userId.name) {
        record[m.userId.email.toLowerCase().trim()] = m.userId.name;
      }
    });
    return record;
  }, [workspaceMembers]);

  const { success, error } = useToastNotifications();



  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated && !authLoading) {
      navigate("/login");
    }
  }, [isAuthenticated, authLoading, navigate]);



  // Synchronize active workspace — prefer URL param over stored value
  useEffect(() => {
    if (justCreatedWorkspaceIdRef.current && workspaces.some((w) => w._id === justCreatedWorkspaceIdRef.current)) {
      justCreatedWorkspaceIdRef.current = null;
    }

    if (!workspacesLoading && !workspacesFetching && workspaces.length > 0) {
      if (urlWorkspaceId && workspaces.some((w) => w._id === urlWorkspaceId)) {
        // URL says which workspace to open
        if (activeWorkspaceId !== urlWorkspaceId) {
          dispatch(setActiveWorkspaceId(urlWorkspaceId));
        }
      } else if (!activeWorkspaceId || !workspaces.some((w) => w._id === activeWorkspaceId)) {
        if (justCreatedWorkspaceIdRef.current === activeWorkspaceId) {
          return;
        }
        dispatch(setActiveWorkspaceId(workspaces[0]._id));
      }
    } else if (!workspacesLoading && !workspacesFetching && workspaces.length === 0 && isAuthenticated) {
      dispatch(setShowCreateModal(true));
    }
  }, [workspacesLoading, workspacesFetching, workspaces, activeWorkspaceId, urlWorkspaceId, dispatch, isAuthenticated]);

  // Restore board view from URL on initial load / refresh
  useEffect(() => {
    if (urlBoardId && activeWorkspaceId) {
      if (activeView.type !== "board" || activeView.boardId !== urlBoardId) {
        dispatch(setActiveView({ type: "board", boardId: urlBoardId }));
      }
    }
    // Only run when URL params or workspace changes, not on every activeView change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlBoardId, activeWorkspaceId]);

  // Restore user profile view from URL on initial load / refresh
  useEffect(() => {
    if (urlUserId) {
      if (activeView.type !== "user-profile" || (activeView as any).userId !== urlUserId) {
        dispatch(setActiveView({ type: "user-profile", userId: urlUserId }));
      }
    }
  }, [urlUserId]);

  const { socket } = useNotifications();

  // Socket room join & listen for real-time workspace updates sync
  useEffect(() => {
    if (socket && activeWorkspace?._id) {
      socket.emit('workspace:join', activeWorkspace._id);

      const handleWorkspaceUpdate = (data: any) => {
        console.log('Real-time sync event workspace:updated received:', data);
        if (data?.senderId && user && data.senderId === user.id) {
          console.log('Skipping tag invalidation because the event was sent by the current user');
          return;
        }
        dispatch(backendApi.util.invalidateTags(['Board', 'Workspace']));
      };

      socket.on('workspace:updated', handleWorkspaceUpdate);

      return () => {
        socket.off('workspace:updated', handleWorkspaceUpdate);
        socket.emit('workspace:leave', activeWorkspace._id);
      };
    }
  }, [socket, activeWorkspace?._id, dispatch, user]);



  const switchWorkspace = (ws: WorkspaceType) => {
    dispatch(setActiveWorkspaceId(ws._id));
    dispatch(setActiveView({ type: "dashboard" }));
    navigate("/");
  };

  const handleWorkspaceCreated = (newWorkspace: WorkspaceType) => {
    justCreatedWorkspaceIdRef.current = newWorkspace._id;
    // Invalidate workspaces in cache and switch to it
    dispatch(backendApi.util.invalidateTags(["Workspace"]));
    dispatch(setActiveWorkspaceId(newWorkspace._id));
    dispatch(setShowCreateModal(false));
  };

  const handleBoardCreated = (newBoard: BoardType) => {
    dispatch(setShowBoardCreateModal(false));
    // Navigate first, then invalidate so the board view shows a loading spinner
    // rather than flashing an error while the cache refetches
    dispatch(setActiveView({ type: "board", boardId: newBoard._id }));
    dispatch(backendApi.util.invalidateTags(["Board"]));
    success("Board created successfully");
  };

  const handleSelectBoard = (boardId: string) => {
    dispatch(setActiveView({ type: "board", boardId }));
    if (activeWorkspace?._id) {
      navigate(`/workspace/${activeWorkspace._id}/board/${boardId}`);
    }
  };

  const handleDeleteBoard = async (boardId: string) => {
    // Navigate away FIRST so WorkspaceBoard unmounts before any cache invalidation
    dispatch(setActiveView({ type: "dashboard" }));
    try {
      await deleteBoard(boardId).unwrap();
      // Immediately patch the boards cache to remove the deleted board —
      // this syncs the sidebar instantly without waiting for a background refetch
      if (activeWorkspace?._id) {
        dispatch(
          backendApi.util.updateQueryData("getBoards", activeWorkspace._id, (draft) => {
            draft.boards = draft.boards.filter((b) => b._id !== boardId);
          })
        );
        success("Board deleted successfully");
      }
    } catch (err) {
      console.error("Failed to delete board:", err);
      error("Failed to delete board");
    }
  };



  const isLoading = authLoading || (isAuthenticated && workspacesLoading);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-100 flex items-center justify-center">
        <p className="text-zinc-500 text-lg font-medium animate-pulse">Loading workspace...</p>
      </div>
    );
  }



  return (
    <div className="flex h-screen flex-col bg-zinc-100">
      {/* Workspace Creation Modal */}
      <WorkspaceCreateModal
        open={isAuthenticated && showCreateModal}
        onClose={() => dispatch(setShowCreateModal(false))}
        workspaces={workspaces}
        onWorkspaceCreated={handleWorkspaceCreated}
      />

      {/* Board Creation Modal */}
      {activeWorkspace && (
        <BoardCreateModal
          open={showBoardCreateModal}
          onClose={() => dispatch(setShowBoardCreateModal(false))}
          workspaceId={activeWorkspace._id}
          token={token!}
          onBoardCreated={handleBoardCreated}
        />
      )}

      {/* Settings Modal */}
      <SettingsModal />

      {/* Top Navbar */}
      <TopNavbar
        onProfileClick={() => dispatch(setActiveView({ type: "workspace-profile" }))}
        onUserProfileClick={() => dispatch(setActiveView({ type: "user-profile" }))}
      />

      {/* Dual Sidebar + Content Container */}
      <div className="flex flex-1 overflow-hidden pb-14 md:pb-0">
        {/* Main Sidebar (Outer Sidebar - Fixed Icons on the Left) */}
        <MainSidebar
          activeTab={activeTab}
          onTabChange={(tab) => dispatch(setActiveTab(tab))}
          onSettingsClick={() => dispatch(setShowSettingsModal(true))}
        />

        {/* Inner Sidebar + Content */}
        {/* Workspace Inner Sidebar */}
            <WorkspaceSidebar
              workspace={activeWorkspace}
              workspaces={workspaces}
              boards={boards}
              activeView={activeView}
              switchWorkspace={switchWorkspace}
              openAddWorkspace={() => dispatch(setShowCreateModal(true))}
              onGoToDashboard={() => dispatch(setActiveView({ type: "dashboard" }))}
              onGoToProfile={() => dispatch(setActiveView({ type: "workspace-profile" }))}
              onSelectBoard={handleSelectBoard}
              onCreateBoard={() => dispatch(setShowBoardCreateModal(true))}
              onDeleteBoard={handleDeleteBoard}
              onNavigate={(view) => dispatch(setActiveView(view))}
            />

            {/* Workspace Dashboard or Board Content */}
            {activeView.type === "board" ? (
              <WorkspaceBoard
                boardId={activeView.boardId}
                workspace={activeWorkspace}
                token={token!}
                onBackToDashboard={() => dispatch(setActiveView({ type: "dashboard" }))}
              />
            ) : activeView.type === "user-profile" ? (
              <UserProfilePage
                token={token!}
                userId={(activeView as any).userId}
                onBack={() => dispatch(setActiveView({ type: "dashboard" }))}
              />
            ) : activeView.type === "workspace-profile" ? (
              <ProfilePage
                workspace={activeWorkspace}
                onWorkspaceUpdated={() => {
                  dispatch(backendApi.util.invalidateTags(["Workspace"]));
                }}
                onWorkspaceDeleted={(deletedWsId) => {
                  dispatch(backendApi.util.invalidateTags(["Workspace"]));
                  const remaining = workspaces.filter((w) => w._id !== deletedWsId);
                  if (remaining.length > 0) {
                    dispatch(setActiveWorkspaceId(remaining[0]._id));
                  } else {
                    dispatch(setActiveWorkspaceId(null));
                    dispatch(setShowCreateModal(true));
                  }
                  dispatch(setActiveView({ type: "dashboard" }));
                }}
                token={token!}
                boards={boards}
                onSelectBoard={handleSelectBoard}
              />
            ) : activeView.type === "milestones" ? (
              <Milestones workspace={activeWorkspace} />
            ) : activeView.type === "milestone-details" ? (
              <MilestoneDetails milestoneId={activeView.milestoneId || ""} />
            ) : activeView.type === "labels" ? (
              <LabelsManagement workspace={activeWorkspace} />
            ) : activeView.type === "my-tasks" ? (
              <div className="flex-1 flex flex-col overflow-hidden bg-background text-foreground relative">
                {/* Board-like Header */}
                <div className="bg-card text-foreground border-b border-border px-6 py-5 shrink-0">
                  <div className="flex items-center justify-between gap-6">
                    <div>
                      <h1 className="text-2xl font-extrabold text-foreground tracking-tight">My Tasks</h1>
                      <p className="text-muted-foreground text-xs mt-1">Showing all tasks assigned to you in this workspace</p>
                    </div>
                    <Badge className="bg-primary/10 border border-primary/20 hover:bg-primary/20 text-primary font-bold px-2.5 py-1 text-xs">
                      {myTasks.length} tasks
                    </Badge>
                  </div>
                </div>
                {/* ListView renders directly in flex-1 */}
                <ListView
                  board={dummyBoard}
                  items={myTasks}
                  onCardClick={(item) => {
                    setSelectedItem(item);
                    setIsDetailOpen(true);
                  }}
                  onCreateCard={async (colId, title) => {
                    if (boards.length > 0) {
                      await createItem({
                        boardId: boards[0]._id,
                        body: {
                          title,
                          columnId: colId === "done" ? boards[0].columns.find(c => c.isDone)?.id || "done" : boards[0].columns[0]?.id || colId,
                          type: "Task",
                          priority: "Medium",
                          assignee: user?.email,
                        },
                      }).unwrap();
                    } else {
                      toast.error("Please create at least one board to add tasks.");
                    }
                  }}
                  onMoveCard={async (itemId, targetColId) => {
                    const task = workspaceItems.find(it => it._id === itemId);
                    if (task && boards.length > 0) {
                      const boardObj = boards.find(b => b._id === task.board);
                      if (boardObj) {
                        let actualColId = boardObj.columns[0]?.id;
                        if (targetColId === "done") {
                          actualColId = boardObj.columns.find(c => c.isDone)?.id || actualColId;
                        } else if (targetColId === "progress") {
                          actualColId = boardObj.columns.find(c => c.name.toLowerCase().includes("progress") || c.name.toLowerCase().includes("doing"))?.id || actualColId;
                        } else if (targetColId === "review") {
                          actualColId = boardObj.columns.find(c => c.name.toLowerCase().includes("review"))?.id || actualColId;
                        }
                        await updateItem({ id: itemId, body: { columnId: actualColId } }).unwrap();
                      }
                    }
                  }}
                  onReorderCard={async (itemId, _colId, newOrder) => {
                    await updateItem({ id: itemId, body: { order: newOrder } }).unwrap();
                  }}
                  onBulkUpdateStatus={async (itemIds, targetColId) => {
                    await Promise.all(
                      itemIds.map(async (id) => {
                        const task = workspaceItems.find(it => it._id === id);
                        if (task && boards.length > 0) {
                          const boardObj = boards.find(b => b._id === task.board);
                          if (boardObj) {
                            let actualColId = boardObj.columns[0]?.id;
                            if (targetColId === "done") {
                              actualColId = boardObj.columns.find(c => c.isDone)?.id || actualColId;
                            } else if (targetColId === "progress") {
                              actualColId = boardObj.columns.find(c => c.name.toLowerCase().includes("progress"))?.id || actualColId;
                            }
                            await updateItem({ id, body: { columnId: actualColId } }).unwrap();
                          }
                        }
                      })
                    );
                  }}
                  onBulkUpdatePriority={async (itemIds, priority) => {
                    await Promise.all(
                      itemIds.map((id) =>
                        updateItem({ id, body: { priority: priority as any } }).unwrap()
                      )
                    );
                  }}
                  onBulkDelete={async (itemIds) => {
                    await Promise.all(itemIds.map((id) => deleteItem(id).unwrap()));
                  }}
                  workspaceRole={activeWorkspace?.role || "MEMBER"}
                  emailToNameMap={emailToNameRecord}
                  assigneeOptions={user?.email ? [user.email] : []}
                />
              </div>
            ) : activeView.type === "calendar" ? (
              <MyCalendarPage
                _user={user}
                workspace={activeWorkspace}
                myTasks={myTasks}
                dummyBoard={dummyBoard}
                emailToNameMap={emailToNameRecord}
                onCardClick={(item) => {
                  setSelectedItem(item);
                  setIsDetailOpen(true);
                }}
              />
            ) : activeView.type === "timeline" ? (
              <MyTimelinePage
                _user={user}
                workspace={activeWorkspace}
                myTasks={myTasks}
                dummyBoard={dummyBoard}
                emailToNameMap={emailToNameRecord}
                onCardClick={(item) => {
                  setSelectedItem(item);
                  setIsDetailOpen(true);
                }}
              />
            ) : (
              <WorkspaceDashboard
                user={user}
                workspace={activeWorkspace}
                token={token!}
                boards={boards}
                onCreateBoard={() => dispatch(setShowBoardCreateModal(true))}
                onSelectBoard={handleSelectBoard}
                onDeleteBoard={handleDeleteBoard}
                workspaceItems={workspaceItems}
                workspaceMembers={workspaceMembers}
              />
            )}

        {/* Right Sidebar - Chat */}
        {/* <ChatSidebar /> */}

        {/* Item Detail modal overlay */}
        {selectedItem && (
          <ItemDetailModal
            open={isDetailOpen}
            emailToNameMap={emailToNameRecord}
            onClose={() => {
              setIsDetailOpen(false);
              setSelectedItem(null);
            }}
            item={selectedItem}
            workspace={activeWorkspace}
            token={token!}
            onItemUpdated={(updated) => {
              setSelectedItem(updated);
            }}
            onItemDeleted={() => {
              setSelectedItem(null);
            }}
          />
        )}
      </div>

      {/* Mobile Bottom Navbar */}
      <div className="flex md:hidden fixed bottom-0 left-0 right-0 h-14 bg-card border-t border-border z-30 justify-around items-center px-4">
        <button
          onClick={() => dispatch(setActiveTab("workspaces"))}
          className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 ${
            activeTab === "workspaces" ? "text-primary font-bold" : "text-muted-foreground"
          }`}
        >
          <Briefcase className="h-4.5 w-4.5" />
          <span className="text-[9px]">Workspaces</span>
        </button>

        <button
          onClick={() => dispatch(setShowSettingsModal(true))}
          className="flex flex-col items-center justify-center flex-1 h-full gap-0.5 text-muted-foreground"
        >
          <Settings className="h-4.5 w-4.5" />
          <span className="text-[9px]">Settings</span>
        </button>
      </div>
    </div>
  );
}
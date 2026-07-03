// src/Pages/ItemDetailPage.tsx
import { useParams, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useEffect } from "react";
import { TopNavbar } from "@/components/TopNavbar";
import { MainSidebar } from "@/components/MainSidebar";
import { WorkspaceSidebar } from "@/components/WorkspaceSidebar";
import { ItemDetailContent } from "@/components/ItemDetailContent";
import { useAuth } from "@/context/AuthContext";
import { useToastNotifications } from "@/hooks/useToastNotifications";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import {
  setActiveTab,
  setActiveView,
  setActiveWorkspaceId,
  setShowCreateModal,
  setShowBoardCreateModal,
  setShowSettingsModal,
} from "@/store/slices/uiSlice";
import {
  useGetItemQuery,
  useGetBoardQuery,
  useGetWorkspacesQuery,
  useGetBoardsQuery,
  useDeleteBoardMutation,
  backendApi,
} from "@/store/services/api";

export default function ItemDetailPage() {
  // Support both URL shapes:
  //   /workspace/:workspaceId/board/:boardId/item/:itemId  (new)
  //   /item/:itemId  (legacy)
  const params = useParams<{ itemId?: string; workspaceId?: string; boardId?: string }>();
  const itemId = params.itemId;
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { isAuthenticated } = useAuth();
  const { success, error } = useToastNotifications();

  // Retrieve Redux UI State
  const { activeTab, activeView, activeWorkspaceId } = useAppSelector((state) => state.ui);

  // Fetch the item
  const { data: itemData, isLoading: itemLoading, error: itemError } = useGetItemQuery(itemId || "", {
    skip: !itemId,
  });
  const item = itemData?.item;

  // Fetch the board the item belongs to
  const { data: boardData } = useGetBoardQuery(item?.board || "", {
    skip: !item?.board,
  });
  const board = boardData?.board;

  // Fetch workspaces
  const { data: workspacesData, isLoading: workspacesLoading } = useGetWorkspacesQuery(undefined, {
    skip: !isAuthenticated,
  });
  const workspaces = workspacesData?.workspaces || [];

  // Set the active workspace and board view in redux based on this item
  useEffect(() => {
    if (board && workspaces.length > 0) {
      // Sync the active workspace to match the item's board workspace
      if (activeWorkspaceId !== board.workspace) {
        dispatch(setActiveWorkspaceId(board.workspace));
      }
      // Sync the active view to point to the board of this item
      if (activeView.type !== "board" || activeView.boardId !== board._id) {
        dispatch(setActiveView({ type: "board", boardId: board._id }));
      }
    }
  }, [board, workspaces, activeWorkspaceId, activeView, dispatch]);

  const activeWorkspace = workspaces.find((w) => w._id === activeWorkspaceId) || workspaces[0] || null;

  // Fetch boards of active workspace
  const { data: boardsData } = useGetBoardsQuery(activeWorkspace?._id || "", {
    skip: !activeWorkspace?._id,
  });
  const boards = boardsData?.boards || [];

  const [deleteBoard] = useDeleteBoardMutation();

  const handleSelectBoard = (boardId: string) => {
    dispatch(setActiveView({ type: "board", boardId }));
    if (activeWorkspace?._id) {
      navigate(`/workspace/${activeWorkspace._id}/board/${boardId}`);
    } else {
      navigate("/");
    }
  };

  const handleGoToDashboard = () => {
    dispatch(setActiveView({ type: "dashboard" }));
    if (activeWorkspace?._id) {
      navigate(`/workspace/${activeWorkspace._id}/board/${board?._id || ""}`);
    } else {
      navigate("/");
    }
  };

  const handleGoToProfile = () => {
    dispatch(setActiveView({ type: "workspace-profile" }));
    navigate("/");
  };

  const switchWorkspace = (ws: any) => {
    dispatch(setActiveWorkspaceId(ws._id));
    dispatch(setActiveView({ type: "dashboard" }));
    navigate("/");
  };

  const handleDeleteBoard = async (boardId: string) => {
    dispatch(setActiveView({ type: "dashboard" }));
    try {
      await deleteBoard(boardId).unwrap();
      if (activeWorkspace?._id) {
        dispatch(
          backendApi.util.updateQueryData("getBoards", activeWorkspace._id, (draft) => {
            draft.boards = draft.boards.filter((b) => b._id !== boardId);
          })
        );
        success("Board deleted successfully");
      }
      navigate("/");
    } catch (err) {
      console.error(err);
      error("Failed to delete board");
    }
  };

  const isLoading = itemLoading || workspacesLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-100 flex items-center justify-center">
        <p className="text-zinc-500 text-lg font-semibold animate-pulse">
          Loading issue workspace...
        </p>
      </div>
    );
  }

  if (itemError || !item) {
    return (
      <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center text-center p-6">
        <AlertTriangle className="h-12 w-12 text-red-500 mb-3" />
        <h3 className="text-xl font-bold text-zinc-900">Issue Not Found</h3>
        <p className="text-sm text-zinc-500 mt-2 max-w-md">
          The requested issue does not exist, was deleted, or you do not have permission to view it.
        </p>
        <Button
          onClick={() => navigate("/")}
          className="mt-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-zinc-100">
      {/* Top Navbar */}
      <TopNavbar
        onProfileClick={() => {
          dispatch(setActiveView({ type: "workspace-profile" }));
          navigate("/");
        }}
        onUserProfileClick={() => {
          dispatch(setActiveView({ type: "user-profile" }));
          navigate("/");
        }}
      />

      {/* Dual Sidebar + Content Container */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Main Sidebar (Outer Sidebar) */}
        <MainSidebar
          activeTab={activeTab}
          onTabChange={(tab) => {
            dispatch(setActiveTab(tab));
            navigate("/");
          }}
          onSettingsClick={() => {
            dispatch(setShowSettingsModal(true));
            navigate("/");
          }}
        />

        {/* Workspace Inner Sidebar */}
        <WorkspaceSidebar
          workspace={activeWorkspace}
          workspaces={workspaces}
          boards={boards}
          activeView={activeView}
          switchWorkspace={switchWorkspace}
          openAddWorkspace={() => {
            dispatch(setShowCreateModal(true));
            navigate("/");
          }}
          onGoToDashboard={handleGoToDashboard}
          onGoToProfile={handleGoToProfile}
          onSelectBoard={handleSelectBoard}
          onCreateBoard={() => {
            dispatch(setShowBoardCreateModal(true));
            navigate("/");
          }}
          onDeleteBoard={handleDeleteBoard}
        />

        {/* Issue Details Content Page Canvas */}
        <div className="flex-1 overflow-auto bg-white min-h-0">
          <ItemDetailContent
            itemId={item._id}
            isModal={false}
          />
        </div>
      </div>
    </div>
  );
}

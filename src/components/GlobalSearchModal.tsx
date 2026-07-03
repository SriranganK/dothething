import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  Search,
  Briefcase,
  Layers,
  CheckSquare,
  ListTodo,
  User as UserIcon,
  BarChart2,
  X,
  CornerDownLeft,
  Loader2,
  Calendar,
  AlertCircle
} from "lucide-react";
import {
  useGlobalSearchQuery,
  useGetWorkspacesQuery,
  useGetBoardsQuery
} from "@/store/services/api";
import {
  setActiveWorkspaceId,
  setActiveView,
  setActiveTab
} from "@/store/slices/uiSlice";

interface GlobalSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const staticPages = [
  { name: 'Dashboard & Analytics', type: 'analytics', route: 'dashboard', keywords: ['dashboard', 'analytics', 'charts', 'report', 'stats'], desc: 'Workspace charts, status reports and analytics.' },
  { name: 'Milestones & Epics', type: 'milestones', route: 'milestones', keywords: ['milestones', 'epics', 'goals', 'targets', 'milestone'], desc: 'Track workspace milestone progress.' },
  { name: 'Timeline View & Gantt', type: 'timeline', route: 'timeline', keywords: ['timeline', 'gantt', 'schedule', 'roadmap', 'calendar'], desc: 'Gantt chart and roadmap planning.' },
  { name: 'Labels Management', type: 'labels', route: 'labels', keywords: ['labels', 'tags', 'management', 'colors'], desc: 'Workspace label configuration.' }
];

export function GlobalSearchModal({ open, onOpenChange }: GlobalSearchModalProps) {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const modalRef = useRef<HTMLDivElement>(null);
  
  const { activeWorkspaceId } = useAppSelector((state) => state.ui);

  // Default data query for workspaces and boards to populate recent lists
  const { data: workspacesData } = useGetWorkspacesQuery();
  const workspaces = workspacesData?.workspaces || [];

  const activeWorkspace = workspaces.find((w) => w._id === activeWorkspaceId) || workspaces[0] || null;

  const { data: boardsData } = useGetBoardsQuery(
    activeWorkspace?._id || "",
    { skip: !activeWorkspace?._id }
  );
  const boards = boardsData?.boards || [];

  // Search local/debounced state
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Reset query on open
  useEffect(() => {
    if (open) {
      setSearchQuery("");
      setDebouncedQuery("");
    }
  }, [open]);

  // RTK Query Search API hook
  const { data: searchData, isFetching } = useGlobalSearchQuery(
    { query: debouncedQuery, workspaceId: activeWorkspaceId || undefined },
    { skip: !debouncedQuery }
  );

  // Grouped search results
  const results = searchData?.results;

  // Flattened list for keyboard Arrow key navigation
  const allResults = useMemo(() => {
    if (!debouncedQuery) {
      // Default lists when no search query
      const list: any[] = [];
      
      // 1. Pages/Analytics
      staticPages.forEach(p => {
        list.push({
          id: `analytics-${p.route}`,
          type: 'analytics',
          name: p.name,
          desc: p.desc,
          routeType: p.type,
          workspaceId: activeWorkspaceId
        });
      });

      // 2. Boards in active workspace
      boards.slice(0, 3).forEach(b => {
        list.push({
          id: `board-${b._id}`,
          type: 'board',
          name: b.name,
          boardObj: b
        });
      });

      // 3. Workspaces
      workspaces.slice(0, 3).forEach(w => {
        list.push({
          id: `workspace-${w._id}`,
          type: 'workspace',
          name: w.name,
          workspaceObj: w
        });
      });

      return list;
    }

    if (!results) return [];

    const list: any[] = [];
    
    // Add categories sequentially to preserve structure in list index
    if (results.analytics && results.analytics.length > 0) {
      results.analytics.forEach((item: any) => list.push({ ...item, id: `analytics-${item.type}`, category: 'analytics' }));
    }
    if (results.workspaces && results.workspaces.length > 0) {
      results.workspaces.forEach((item: any) => list.push({ ...item, id: `workspace-${item._id}`, category: 'workspaces' }));
    }
    if (results.boards && results.boards.length > 0) {
      results.boards.forEach((item: any) => list.push({ ...item, id: `board-${item._id}`, category: 'boards' }));
    }
    if (results.tasks && results.tasks.length > 0) {
      results.tasks.forEach((item: any) => list.push({ ...item, id: `task-${item._id}`, category: 'tasks' }));
    }
    if (results.subtasks && results.subtasks.length > 0) {
      results.subtasks.forEach((item: any) => list.push({ ...item, id: `subtask-${item._id}`, category: 'subtasks' }));
    }
    if (results.users && results.users.length > 0) {
      results.users.forEach((item: any) => list.push({ ...item, id: `user-${item._id}`, category: 'users' }));
    }

    return list;
  }, [debouncedQuery, results, workspaces, boards, activeWorkspaceId]);

  const [selectedIndex, setSelectedIndex] = useState(0);

  // Reset index when search results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [allResults]);

  // Global key listener for Ctrl+K / Cmd+K command palette trigger
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        onOpenChange(true);
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [onOpenChange]);

  // Click outside to close modal
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onOpenChange(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [open, onOpenChange]);

  // Keyboard navigation inside modal input
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % allResults.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + allResults.length) % allResults.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (allResults[selectedIndex]) {
        handleItemSelect(allResults[selectedIndex]);
      }
    } else if (e.key === "Escape") {
      onOpenChange(false);
    }
  };

  const handleItemSelect = (item: any) => {
    onOpenChange(false);

    // Navigation and Redux slice synchronizations
    if (item.type === 'analytics' || item.category === 'analytics') {
      const type = item.routeType || item.type;
      if (item.workspaceId) {
        dispatch(setActiveWorkspaceId(item.workspaceId));
      }
      dispatch(setActiveTab("workspaces"));
      dispatch(setActiveView({ type: type as any }));
      navigate("/");
    } 
    else if (item.type === 'workspace' || item.category === 'workspaces') {
      const wsId = item._id || item.workspaceObj?._id;
      dispatch(setActiveWorkspaceId(wsId));
      dispatch(setActiveView({ type: "dashboard" }));
      dispatch(setActiveTab("workspaces"));
      navigate("/");
    } 
    else if (item.type === 'board' || item.category === 'boards') {
      const bdId = item._id || item.boardObj?._id;
      const wsId = item.workspace?._id || item.workspace || item.boardObj?.workspace;
      if (wsId) {
        dispatch(setActiveWorkspaceId(wsId));
      }
      dispatch(setActiveView({ type: "board", boardId: bdId }));
      dispatch(setActiveTab("workspaces"));
      navigate(`/workspace/${wsId}/board/${bdId}`);
    } 
    else if (item.category === 'tasks') {
      const taskId = item._id;
      const bdId = item.board?._id || item.board;
      const wsId = item.board?.workspace;
      if (wsId) {
        dispatch(setActiveWorkspaceId(wsId));
      }
      if (bdId) {
        dispatch(setActiveView({ type: "board", boardId: bdId }));
      }
      dispatch(setActiveTab("workspaces"));
      navigate(`/workspace/${wsId}/board/${bdId}/item/${taskId}`);
    } 
    else if (item.category === 'subtasks') {
      const taskId = item.parentItem?._id;
      const bdId = item.parentItem?.board?._id || item.parentItem?.board;
      const wsId = item.parentItem?.board?.workspace;
      if (wsId) {
        dispatch(setActiveWorkspaceId(wsId));
      }
      if (bdId) {
        dispatch(setActiveView({ type: "board", boardId: bdId }));
      }
      dispatch(setActiveTab("workspaces"));
      navigate(`/workspace/${wsId}/board/${bdId}/item/${taskId}`);
    } 
    else if (item.category === 'users' || item.type === 'user') {
      const uId = item._id || item.userObj?._id;
      dispatch(setActiveView({ type: "user-profile", userId: uId }));
      dispatch(setActiveTab("workspaces"));
      navigate(`/profile/user/${uId}`);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 overflow-hidden backdrop-blur-md bg-zinc-950/40 transition-all duration-200">
      {/* Search Modal Canvas */}
      <div 
        ref={modalRef}
        className="w-full max-w-2xl bg-card text-card-foreground dark:bg-zinc-900 border border-border dark:border-border rounded-2xl shadow-2xl flex flex-col max-h-[600px] overflow-hidden"
      >
        {/* Search Input Box */}
        <div className="flex items-center px-4 border-b border-border dark:border-border shrink-0 h-14">
          <Search className="h-5 w-5 text-muted-foreground mr-3 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search tasks, boards, workspaces, people, reports..."
            className="w-full text-base bg-transparent border-0 outline-none text-foreground dark:text-zinc-100 placeholder-zinc-400 h-full py-3"
            autoFocus
          />
          {isFetching ? (
            <Loader2 className="h-4 w-4 text-muted-foreground animate-spin shrink-0 ml-2" />
          ) : (
            <span className="text-[10px] font-bold text-muted-foreground border border-border dark:border-border bg-background dark:bg-zinc-800/50 px-1.5 py-0.5 rounded-lg shrink-0 select-none ml-2">
              ESC
            </span>
          )}
          <button 
            onClick={() => onOpenChange(false)}
            className="ml-3 p-1 rounded-lg hover:bg-muted dark:hover:bg-zinc-800 text-muted-foreground hover:text-muted-foreground dark:hover:text-zinc-200 cursor-pointer shrink-0 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Results Container */}
        <div className="flex-1 overflow-y-auto p-2 scrollbar-thin">
          {allResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 px-4 text-center">
              <AlertCircle className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm font-semibold text-foreground dark:text-zinc-200">No results found for "{searchQuery}"</p>
              <p className="text-xs text-muted-foreground dark:text-muted-foreground mt-1 max-w-sm">We couldn't find any match. Check spelling or try a different term.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Group results by category */}
              {renderGroupedResults(allResults, selectedIndex, handleItemSelect, debouncedQuery)}
            </div>
          )}
        </div>

        {/* Footer Shortcut Instructions */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-border dark:border-border bg-background dark:bg-zinc-900/60 shrink-0 text-[10px] text-muted-foreground dark:text-muted-foreground font-medium select-none">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1 bg-card text-card-foreground dark:bg-zinc-800 border border-border dark:border-zinc-700 rounded shadow-xs">↑</kbd>
              <kbd className="px-1 bg-card text-card-foreground dark:bg-zinc-800 border border-border dark:border-zinc-700 rounded shadow-xs">↓</kbd>
              to navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 bg-card text-card-foreground dark:bg-zinc-800 border border-border dark:border-zinc-700 rounded shadow-xs flex items-center"><CornerDownLeft className="h-2 w-2" /></kbd>
              to select
            </span>
          </div>
          <div>
            Search scored & relevance-ranked
          </div>
        </div>
      </div>
    </div>
  );
}

// Group rendering helper
function renderGroupedResults(
  flatList: any[],
  selectedIndex: number,
  onSelect: (item: any) => void,
  isSearching: string
) {
  // Identify category chunks
  const categories: Record<string, { label: string; items: { item: any; index: number }[] }> = {
    analytics: { label: 'Analytics Pages', items: [] },
    workspaces: { label: 'Workspaces', items: [] },
    boards: { label: 'Boards', items: [] },
    tasks: { label: 'Tasks', items: [] },
    subtasks: { label: 'Subtasks', items: [] },
    users: { label: 'User Profiles', items: [] }
  };

  flatList.forEach((item, index) => {
    let catKey = 'analytics';
    if (isSearching) {
      catKey = item.category || 'analytics';
    } else {
      catKey = item.type === 'analytics' ? 'analytics' : item.type === 'board' ? 'boards' : 'workspaces';
    }
    
    if (categories[catKey]) {
      categories[catKey].items.push({ item, index });
    }
  });

  return Object.entries(categories).map(([key, group]) => {
    if (group.items.length === 0) return null;

    return (
      <div key={key} className="space-y-1">
        <h4 className="text-[10px] font-bold text-muted-foreground dark:text-muted-foreground uppercase tracking-wider px-3 pt-2 pb-1 select-none">
          {group.label}
        </h4>
        <div className="space-y-0.5">
          {group.items.map(({ item, index }) => {
            const isSelected = selectedIndex === index;
            return (
              <button
                key={item.id}
                onClick={() => onSelect(item)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left cursor-pointer transition-all duration-150 group border border-transparent
                  ${isSelected 
                    ? "bg-primary/10 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-200 border-primary/20 dark:border-indigo-900/50" 
                    : "hover:bg-background dark:hover:bg-zinc-800/40 text-foreground/90 dark:text-muted-foreground"
                  }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`p-1.5 rounded-lg shrink-0 transition-colors
                    ${isSelected 
                      ? "bg-primary/15 dark:bg-indigo-900/60 text-primary dark:text-indigo-400" 
                      : "bg-muted dark:bg-zinc-800 text-muted-foreground group-hover:text-foreground/90 dark:group-hover:text-muted-foreground"
                    }`}
                  >
                    {renderIcon(item, isSearching)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate leading-tight">
                      {item.name || item.title || item.text}
                    </p>
                    <p className="text-xs text-muted-foreground dark:text-muted-foreground truncate mt-0.5 font-medium leading-none">
                      {renderMetadata(item)}
                    </p>
                  </div>
                </div>
                {isSelected && (
                  <CornerDownLeft className="h-3.5 w-3.5 text-indigo-400 dark:text-primary shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  });
}

function renderIcon(item: any, isSearching: string) {
  const type = isSearching ? item.category : item.type;
  switch (type) {
    case 'analytics':
      return <BarChart2 className="h-4 w-4" />;
    case 'workspaces':
    case 'workspace':
      return <Briefcase className="h-4 w-4" />;
    case 'boards':
    case 'board':
      return <Layers className="h-4 w-4" />;
    case 'tasks':
    case 'task':
      return <CheckSquare className="h-4 w-4" />;
    case 'subtasks':
    case 'subtask':
      return <ListTodo className="h-4 w-4" />;
    case 'users':
    case 'user':
      return <UserIcon className="h-4 w-4" />;
    default:
      return <CheckSquare className="h-4 w-4" />;
  }
}

function renderMetadata(item: any) {
  if (item.desc) return item.desc;
  
  if (item.category === 'tasks') {
    const priority = item.priority || 'Medium';
    const type = item.type || 'Task';
    const boardName = item.board?.name || 'Board';
    return `${type} • ${priority} Priority • in ${boardName}`;
  }

  if (item.category === 'subtasks') {
    const parentTitle = item.parentItem?.title || 'Task';
    const boardName = item.parentItem?.board?.name || 'Board';
    return `Subtask of "${parentTitle}" • in ${boardName}`;
  }

  if (item.category === 'users') {
    const designation = item.designation || '';
    const department = item.department || '';
    const detail = [designation, department].filter(Boolean).join(', ');
    return detail ? `${detail} • ${item.email}` : item.email;
  }

  if (item.category === 'boards' || item.type === 'board') {
    const wsName = item.workspace?.name || item.boardObj?.workspace?.name || 'Workspace';
    return `Board in workspace: ${wsName}`;
  }

  if (item.category === 'workspaces' || item.type === 'workspace') {
    const industry = item.industry || item.workspaceObj?.industry || '';
    const type = item.type || item.workspaceObj?.type || 'Workspace';
    return `${type} Workspace ${industry ? `• ${industry}` : ''}`;
  }

  return '';
}

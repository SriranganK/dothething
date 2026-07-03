// src/components/WorkspaceSidebar.tsx
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState, useRef, useEffect, useMemo } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ChevronDown,
  Plus,
  Check,
  Home as HomeIcon,
  Layout,
  MoreVertical,
  Target,
  Tags,
  Search,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  Calendar,
  Clock,
  Star,
  User,
  Settings,
} from "lucide-react";
import type { WorkspaceType, BoardType } from "@/types/workspace";
import type { ViewType } from "@/store/slices/uiSlice";

interface WorkspaceSidebarProps {
  workspace: WorkspaceType | null;
  workspaces: WorkspaceType[];
  boards: BoardType[];
  activeView: ViewType;
  switchWorkspace: (ws: WorkspaceType) => void;
  openAddWorkspace: () => void;
  onGoToDashboard: () => void;
  onGoToProfile: () => void;
  onSelectBoard: (boardId: string) => void;
  onCreateBoard: () => void;
  onDeleteBoard: (boardId: string) => void;
  onNavigate?: (view: ViewType) => void;
}

export function WorkspaceSidebar({
  workspace,
  workspaces,
  boards,
  activeView,
  switchWorkspace,
  openAddWorkspace,
  onGoToDashboard,
  onGoToProfile,
  onSelectBoard,
  onCreateBoard,
  onDeleteBoard,
  onNavigate,
}: WorkspaceSidebarProps) {
  const [deleteBoardDialogOpen, setDeleteBoardDialogOpen] = useState(false);
  const [boardToDelete, setBoardToDelete] = useState<string | null>(null);
  const boardName = boardToDelete ? boards.find(b => b._id === boardToDelete)?.name ?? "" : "";

  // Sidebar expand/collapse states
  const [isCollapsedState, setIsCollapsedState] = useState(() => localStorage.getItem("sidebar_collapsed") === "true");
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const isCollapsed = isCollapsedState || isMobile;
  
  // Section collapsible states
  const [boardsExpanded, setBoardsExpanded] = useState(() => localStorage.getItem("sidebar_boards_expanded") !== "false");
  const [favoritesExpanded, setFavoritesExpanded] = useState(() => localStorage.getItem("sidebar_favs_expanded") !== "false");
  const [moreExpanded, setMoreExpanded] = useState(() => localStorage.getItem("sidebar_more_expanded") !== "false");
  
  const [boardSearch, setBoardSearch] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus search input if we expanded because of a search click
  useEffect(() => {
    if (!isCollapsed && searchInputRef.current) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isCollapsed]);

  const toggleCollapse = () => {
    if (isMobile) return;
    const next = !isCollapsedState;
    setIsCollapsedState(next);
    localStorage.setItem("sidebar_collapsed", String(next));
  };

  const toggleBoards = () => {
    const next = !boardsExpanded;
    setBoardsExpanded(next);
    localStorage.setItem("sidebar_boards_expanded", String(next));
  };

  const toggleFavorites = () => {
    const next = !favoritesExpanded;
    setFavoritesExpanded(next);
    localStorage.setItem("sidebar_favs_expanded", String(next));
  };

  const toggleMore = () => {
    const next = !moreExpanded;
    setMoreExpanded(next);
    localStorage.setItem("sidebar_more_expanded", String(next));
  };

  const filteredBoards = boards.filter((board) =>
    board.name.toLowerCase().includes(boardSearch.toLowerCase())
  );

  // Load favorites list dynamically from localStorage
  const favoriteBoardIds = useMemo<string[]>(() => {
    if (!workspace?._id) return [];
    try {
      const saved = localStorage.getItem(`ws_${workspace._id}_favorites`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  }, [workspace?._id, activeView]);

  const favoriteBoards = useMemo(() => {
    return boards.filter((b) => favoriteBoardIds.includes(b._id));
  }, [boards, favoriteBoardIds]);

  const switcherButton = (
    <button className={`flex items-center rounded-xl transition-colors group focus:outline-none cursor-pointer border border-border hover:border-border-hover bg-card text-card-foreground ${isCollapsed ? 'p-2 justify-center w-10 h-10' : 'w-full gap-3 px-3 py-2'}`}>
      <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center text-xs font-bold text-white uppercase shrink-0">
        {workspace?.name
          ? workspace.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
          : "WS"}
      </div>
      {!isCollapsed && (
        <>
          <div className="overflow-hidden flex-1 text-left">
            <p className="text-sm font-medium text-foreground truncate">
              {workspace?.name || "My Workspace"}
            </p>
            <p className="text-xs text-muted-foreground">{workspace?.type || "Workspace"}</p>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
        </>
      )}
    </button>
  );

  return (
    <TooltipProvider delayDuration={150}>
      <div className={`relative text-foreground flex flex-col shrink-0 bg-card border-r border-border transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-60'} ${activeView.type === 'board' ? 'hidden md:flex' : 'flex'}`}>
        {/* Floating Collapse/Expand Button */}
        <button
          onClick={toggleCollapse}
          className="absolute -right-3 top-16 w-6 h-6 rounded-full border border-border bg-card flex items-center justify-center shadow-md hover:shadow hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all cursor-pointer z-30 text-muted-foreground hidden md:flex"
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
        </button>

        {/* Workspace Switcher Dropdown */}
        <div className={`p-4 relative group ${isCollapsed ? 'px-2 flex justify-center' : ''}`}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              {isCollapsed && !isMobile ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    {switcherButton}
                  </TooltipTrigger>
                  <TooltipContent side="right" className="bg-popover text-popover-foreground text-xs px-2.5 py-1.5 rounded-lg border border-border shadow-md">
                    {workspace?.name || "My Workspace"}
                  </TooltipContent>
                </Tooltip>
              ) : switcherButton}
            </DropdownMenuTrigger>

            <DropdownMenuContent
              side={isCollapsed ? "right" : "bottom"}
              align="start"
              className="w-56 bg-popover border-border text-popover-foreground shadow-md"
            >
              <DropdownMenuLabel className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
                Your Workspaces
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border" />

              {workspaces.map((ws) => (
                <DropdownMenuItem
                  key={ws._id}
                  onClick={() => switchWorkspace(ws)}
                  className="flex items-center gap-2.5 cursor-pointer hover:bg-muted focus:bg-muted text-foreground"
                >
                  <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center text-[10px] font-bold text-white uppercase shrink-0">
                    {ws.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)}
                  </div>
                  <span className="truncate text-sm">{ws.name}</span>
                  {workspace?._id === ws._id && (
                    <Check className="h-3.5 w-3.5 text-primary ml-auto shrink-0" />
                  )}
                </DropdownMenuItem>
              ))}

              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem
                onClick={openAddWorkspace}
                className="flex items-center gap-2.5 cursor-pointer hover:bg-muted focus:bg-muted text-primary hover:text-primary/90"
              >
                <div className="w-6 h-6 rounded-md border border-dashed border-primary flex items-center justify-center shrink-0">
                  <Plus className="h-3.5 w-3.5" />
                </div>
                <span className="text-sm font-medium">Add Workspace</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Separator className="bg-border" />

        {/* Navigation */}
        <nav className={`flex-1 p-3 space-y-4 overflow-y-auto bg-card ${isCollapsed ? 'px-2' : ''}`}>
          
          {/* Main Items Section (Home, My Tasks, Calendar, Timeline) */}
          <div className="space-y-0.5">
            <NavItem
              icon={HomeIcon}
              label="Home"
              active={activeView.type === "dashboard"}
              onClick={onGoToDashboard}
              isCollapsed={isCollapsed}
            />
            <NavItem
              icon={CheckSquare}
              label="My Tasks"
              active={activeView.type === "my-tasks"}
              onClick={() => onNavigate?.({ type: "my-tasks" })}
              isCollapsed={isCollapsed}
            />
            <NavItem
              icon={Calendar}
              label="Calendar"
              active={activeView.type === "calendar"}
              onClick={() => onNavigate?.({ type: "calendar" })}
              isCollapsed={isCollapsed}
            />
            <NavItem
              icon={Clock}
              label="Timeline"
              active={activeView.type === "timeline"}
              onClick={() => onNavigate?.({ type: "timeline" })}
              isCollapsed={isCollapsed}
            />
          </div>

          <Separator className="bg-border" />

          {/* Boards Section */}
          {!isCollapsed ? (
            <div>
              <div className="flex items-center justify-between px-3 py-1.5 group/section">
                <button
                  onClick={toggleBoards}
                  className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors cursor-pointer text-left"
                >
                  {boardsExpanded ? (
                    <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                  )}
                  <span>Boards</span>
                </button>
                {workspace?.role !== "GUEST" && (
                  <button
                    onClick={onCreateBoard}
                    className="text-muted-foreground hover:text-primary p-0.5 rounded transition-colors cursor-pointer opacity-0 group-hover/section:opacity-100"
                    title="Create Board"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {boardsExpanded && (
                <div className="mt-1 space-y-1">
                  {/* Search input inside Boards */}
                  <div className="px-3 mb-2.5">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <input
                        ref={searchInputRef}
                        type="text"
                        placeholder="Filter boards..."
                        value={boardSearch}
                        onChange={(e) => setBoardSearch(e.target.value)}
                        className="w-full pl-8 pr-2.5 py-1 text-xs border border-border rounded-lg bg-muted/30 focus:outline-none focus:border-primary focus:bg-background transition-colors text-foreground"
                      />
                    </div>
                  </div>

                  {filteredBoards.length === 0 ? (
                    <div className="text-muted-foreground text-xs px-3 py-2 italic text-center">
                      {boardSearch ? "No matching boards" : "No boards created yet"}
                    </div>
                  ) : (
                    <div className="space-y-0.5">
                      {filteredBoards.map((board) => {
                        const isBoardActive = activeView.type === "board" && activeView.boardId === board._id;
                        return (
                          <div key={board._id} className="relative group flex items-center justify-between w-full">
                            <button
                              onClick={() => onSelectBoard(board._id)}
                              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer text-left
                                ${
                                  isBoardActive
                                    ? "bg-primary/10 text-primary border-l-2 border-primary rounded-l-none pl-2.5 font-semibold"
                                    : "text-foreground/90 hover:bg-muted hover:text-foreground pl-3"
                                }`}
                            >
                              <Layout className={`h-4 w-4 shrink-0 ${isBoardActive ? 'text-primary' : 'text-muted-foreground opacity-70 group-hover:text-foreground'}`} />
                              <span className="truncate">{board.name}</span>
                            </button>

                            {(workspace?.role === "OWNER" || workspace?.role === "ADMIN") && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button className="p-1 hover:bg-muted rounded cursor-pointer shrink-0 absolute right-1.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground" title="More actions">
                                    <MoreVertical className="h-4 w-4" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-40 bg-popover border-border">
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setBoardToDelete(board._id);
                                      setDeleteBoardDialogOpen(true);
                                    }}
                                    className="text-destructive hover:bg-destructive/10 cursor-pointer"
                                  >
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => {
                      setIsCollapsedState(false);
                      localStorage.setItem("sidebar_collapsed", "false");
                    }}
                    className="w-full flex items-center justify-center p-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer transition-all"
                  >
                    <Search className="h-4 w-4 shrink-0" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="bg-popover text-popover-foreground text-xs px-2.5 py-1.5 rounded-lg border border-border shadow-md">
                  Search / Filter Boards
                </TooltipContent>
              </Tooltip>
            </div>
          )}

          {/* Favorites Section */}
          {!isCollapsed ? (
            <div>
              <button
                onClick={toggleFavorites}
                className="w-full flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors cursor-pointer text-left"
              >
                {favoritesExpanded ? (
                  <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                )}
                <span>Favorites</span>
              </button>

              {favoritesExpanded && (
                <div className="mt-1 space-y-0.5">
                  {favoriteBoards.length === 0 ? (
                    <div className="text-muted-foreground text-xs px-3 py-2 italic">
                      No favorite boards
                    </div>
                  ) : (
                    favoriteBoards.map((board) => (
                      <button
                        key={board._id}
                        onClick={() => onSelectBoard(board._id)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-foreground/90 hover:bg-muted hover:text-foreground pl-3 cursor-pointer text-left"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-primary to-primary/80 shrink-0" />
                        <span className="truncate">{board.name}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          ) : (
            favoriteBoards.map((board) => (
              <Tooltip key={board._id}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onSelectBoard(board._id)}
                    className="w-full flex items-center justify-center p-2.5 rounded-xl text-foreground hover:bg-muted hover:text-primary cursor-pointer"
                  >
                    <Star className="h-4 w-4 shrink-0 text-amber-400 fill-amber-400" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="bg-popover text-popover-foreground text-xs px-2.5 py-1.5 rounded-lg border border-border shadow-md">
                  ★ {board.name}
                </TooltipContent>
              </Tooltip>
            ))
          )}

          <Separator className="bg-border" />

          {/* More Section (Milestones, Labels, WorkspaceProfile) */}
          {!isCollapsed ? (
            <div>
              <button
                onClick={toggleMore}
                className="w-full flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors cursor-pointer text-left"
              >
                {moreExpanded ? (
                  <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                )}
                <span>More</span>
              </button>

              {moreExpanded && (
                <div className="mt-1 space-y-0.5">
                  <NavItem
                    icon={Target}
                    label="Milestones"
                    active={activeView.type === "milestones" || activeView.type === "milestone-details"}
                    onClick={() => onNavigate?.({ type: "milestones" })}
                    isCollapsed={false}
                  />
                  <NavItem
                    icon={Tags}
                    label="Labels"
                    active={activeView.type === "labels"}
                    onClick={() => onNavigate?.({ type: "labels" })}
                    isCollapsed={false}
                  />
                  <NavItem
                    icon={User}
                    label="Workspace Profile"
                    active={activeView.type === "workspace-profile"}
                    onClick={onGoToProfile}
                    isCollapsed={false}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-1">
              <NavItem
                icon={Target}
                label="Milestones"
                active={activeView.type === "milestones" || activeView.type === "milestone-details"}
                onClick={() => onNavigate?.({ type: "milestones" })}
                isCollapsed={true}
              />
              <NavItem
                icon={Tags}
                label="Labels"
                active={activeView.type === "labels"}
                onClick={() => onNavigate?.({ type: "labels" })}
                isCollapsed={true}
              />
              <NavItem
                icon={User}
                label="Workspace Profile"
                active={activeView.type === "workspace-profile"}
                onClick={onGoToProfile}
                isCollapsed={true}
              />
            </div>
          )}

        </nav>


        <AlertDialog open={deleteBoardDialogOpen} onOpenChange={setDeleteBoardDialogOpen}>
          <AlertDialogContent className="bg-card border-border text-card-foreground">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-foreground">Delete Board</AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground">
                {`Are you sure you want to delete the board "${boardName}"? This action cannot be undone.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-card text-foreground hover:bg-muted border-border">Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={async () => {
                  if (boardToDelete) {
                    await onDeleteBoard(boardToDelete);
                  }
                  setDeleteBoardDialogOpen(false);
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}

interface NavItemProps {
  icon: any;
  label: string;
  active?: boolean;
  onClick?: () => void;
  isCollapsed?: boolean;
}function NavItem({ icon: Icon, label, active = false, onClick, isCollapsed = false }: NavItemProps) {
  const button = (
    <button
      onClick={onClick}
      className={`w-full flex items-center rounded-xl text-sm font-medium cursor-pointer transition-all text-left
        ${isCollapsed ? 'justify-center p-2.5' : 'gap-3 px-4 py-2.5'}
        ${
          active
            ? "bg-primary/10 text-primary border-l-2 border-primary rounded-l-none pl-3.5 font-semibold"
            : "hover:bg-muted text-muted-foreground hover:text-foreground pl-4"
        }`}
    >
      <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`} />
      {!isCollapsed && <span className="truncate">{label}</span>}
    </button>
  );

  if (isCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {button}
        </TooltipTrigger>
        <TooltipContent side="right" className="bg-popover text-popover-foreground text-xs px-2.5 py-1.5 rounded-lg border border-border shadow-md">
          {label}
        </TooltipContent>
      </Tooltip>
    );
  }

  return button;
}
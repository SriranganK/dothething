// src/Pages/WorkspaceBoard.tsx
import { useState, useEffect, useRef, useMemo } from "react";
import { useConfirm } from "@/context/ConfirmContext";
import { useNavigate } from "react-router-dom";
import { useAppDispatch } from "@/store/hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Plus,
  Search,
  ArrowLeft,
  AlertTriangle,
  ChevronDown,
  BarChart3,
  PlusCircle,
  X,
  CircleDot,
  Bug,
  Lightbulb,
  AlertCircle,
  Calendar,
  Sliders,
  Sparkles,
  Send,
  Loader2,
  HelpCircle,
  BrainCircuit,
} from "lucide-react";
import { PriorityIndicator } from "@/components/ui/priority-indicator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Users,
  Mail,
  UserPlus,
  Crown,
  Shield,
  RefreshCcw,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

import JiraSummaryPage from "@/Pages/JiraSummaryPage";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Separator } from "@/components/ui/separator";

import { ItemDetailModal } from "@/components/ItemDetailModal";
import { ViewSwitcher } from "@/components/board/ViewSwitcher";
import { KanbanView } from "@/components/board/KanbanView";
import { ListView } from "@/components/board/ListView";
import { CalendarView } from "@/components/board/CalendarView";
import { TimelineView } from "@/components/board/TimelineView";
import {
  useGetBoardsQuery,
  useGetBoardItemsQuery,
  useUpdateBoardMutation,
  useCreateItemMutation,
  useUpdateItemMutation,
  useDeleteItemMutation,
  useGetWorkspaceMembersQuery,
  backendApi,
  useGenerateAIColumnsMutation,
  useBoardChatMutation,
  useGenerateTaskFromStoryMutation,
} from "@/store/services/api";
import { toast } from "sonner";
import type {
  ColumnType,
  ItemType,
  WorkspaceType,
  ViewMode,
  ItemPriorityClass,
  BoardType,
} from "@/types/workspace";
import { useNotifications } from "@/components/NotificationProvider";
import { useAuth } from "@/context/AuthContext";
import AIDocumentToBoardModal from "@/components/AIDocumentToBoardModal";
import { FileText } from "lucide-react";

const typeFilterIcons: Record<string, React.ReactNode> = {
  All: <CircleDot className="size-3.5 mr-2 text-zinc-400" />,
  Task: <CircleDot className="size-3.5 mr-2 text-blue-500" />,
  Bug: <Bug className="size-3.5 mr-2 text-red-500" />,
  Lead: <CircleDot className="size-3.5 mr-2 text-emerald-500" />,
  Idea: <Lightbulb className="size-3.5 mr-2 text-purple-500" />,
  Issue: <AlertCircle className="size-3.5 mr-2 text-amber-500" />,
  Event: <Calendar className="size-3.5 mr-2 text-indigo-500" />,
};

interface WorkspaceBoardProps {
  boardId: string;
  workspace: WorkspaceType | null;
  token: string;
  onBackToDashboard: () => void;
}

export function WorkspaceBoard({
  boardId,
  workspace,
  token,
  onBackToDashboard,
}: WorkspaceBoardProps) {
  // RTK Query hooks
  const { data: boardsData, isLoading: boardsLoading, isFetching: boardsFetching, error: boardsError } = useGetBoardsQuery(
    workspace?._id || "",
    { skip: !workspace?._id }
  );
  const board = boardsData?.boards.find((b) => b._id === boardId) || null;

  // Skip items query if we haven't confirmed the board exists yet (avoids 404 on deleted boards)
  const { data: itemsData, isLoading: itemsLoading, error: itemsError } = useGetBoardItemsQuery(
    boardId,
    { skip: !board }
  );
  const items = itemsData?.items || [];

  const { data: membersData } = useGetWorkspaceMembersQuery(
    workspace?._id || "",
    { skip: !workspace?._id }
  );
  const workspaceMembers = membersData?.members || [];

  // Ref to track if we've already triggered a navigation away (prevents error flash)
  const navigatingAway = useRef(false);

  // Show loading if: initial load, items loading, or boards are refetching and board not yet found
  const loading = boardsLoading || itemsLoading || (boardsFetching && !board);
  const hasError = (!boardsFetching && !!boardsError) || !!itemsError;

  // Auto-redirect when board is gone (deleted) instead of showing error page
  useEffect(() => {
    if (!boardsFetching && !boardsLoading && !board && !navigatingAway.current) {
      navigatingAway.current = true;
      onBackToDashboard();
    }
  }, [boardsFetching, boardsLoading, board, onBackToDashboard]);

  if (loading || navigatingAway.current) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm font-semibold">
            Loading board workspace...
          </p>
        </div>
      </div>
    );
  }

  // Show error only for actual API failures, not for missing boards
  if (hasError) {
    return (
      <div className="flex-1 p-8 bg-background flex flex-col items-center justify-center text-center">
        <AlertTriangle className="h-10 w-10 text-red-500 mb-3" />
        <h3 className="text-lg font-bold text-foreground">Error Loading Board</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-md">
          Failed to load board details. Please try again.
        </p>
        <Button
          onClick={onBackToDashboard}
          className="mt-4 bg-primary hover:bg-primary/90 text-white rounded-xl cursor-pointer"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
      </div>
    );
  }

  // Safety net: if board still not found after all checks, show spinner while parent unmounts us
  if (!board) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <WorkspaceBoardContent
      boardId={boardId}
      workspace={workspace}
      token={token}
      onBackToDashboard={onBackToDashboard}
      board={board}
      items={items}
      workspaceMembers={workspaceMembers}
    />
  );
}

interface WorkspaceBoardContentProps {
  boardId: string;
  workspace: WorkspaceType | null;
  token: string;
  onBackToDashboard: () => void;
  board: BoardType;
  items: ItemType[];
  workspaceMembers: any[];
}

function WorkspaceBoardContent({
  boardId,
  workspace,
  token,
  onBackToDashboard,
  board,
  items,
  workspaceMembers,
}: WorkspaceBoardContentProps) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { socket } = useNotifications();
  const { user } = useAuth();
  const confirm = useConfirm();

  // Canvas Confetti Ref & function
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameIdRef = useRef<number | null>(null);

  const triggerConfetti = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
    }

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    const colors = ["#4f46e5", "#06b6d4", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6", "#3b82f6"];
    const particles = Array.from({ length: 100 }).map(() => ({
      x: canvas.width / 2 + (Math.random() - 0.5) * 60,
      y: canvas.height + 20,
      vx: (Math.random() - 0.5) * 16,
      vy: -14 - Math.random() * 16,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 4 + Math.random() * 5,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 12,
      opacity: 1,
      gravity: 0.35,
      shape: Math.random() > 0.5 ? 'circle' : 'square',
    }));

    const update = () => {
      const currentCanvas = canvasRef.current;
      if (!currentCanvas) return;
      const currentCtx = currentCanvas.getContext('2d');
      if (!currentCtx) return;

      currentCtx.clearRect(0, 0, currentCanvas.width, currentCanvas.height);
      let active = false;

      particles.forEach((p) => {
        if (p.opacity <= 0) return;
        active = true;

        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.rotation += p.rotationSpeed;
        p.opacity -= 0.009;

        currentCtx.save();
        currentCtx.translate(p.x, p.y);
        currentCtx.rotate((p.rotation * Math.PI) / 180);
        currentCtx.fillStyle = p.color;
        currentCtx.globalAlpha = Math.max(0, p.opacity);

        if (p.shape === 'circle') {
          currentCtx.beginPath();
          currentCtx.arc(0, 0, p.size, 0, Math.PI * 2);
          currentCtx.fill();
        } else {
          currentCtx.fillRect(-p.size, -p.size / 2, p.size * 2, p.size);
        }
        currentCtx.restore();
      });

      if (active) {
        animationFrameIdRef.current = requestAnimationFrame(update);
      } else {
        currentCtx.clearRect(0, 0, currentCanvas.width, currentCanvas.height);
      }
    };

    update();
  };

  useEffect(() => {
    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, []);

  // Socket room join & listen for real-time card updates sync
  useEffect(() => {
    if (socket && boardId) {
      socket.emit('board:join', boardId);

      const handleBoardUpdate = (data: any) => {
        console.log('Real-time sync event board:updated received:', data);
        if (data?.senderId && user && data.senderId === user.id) {
          console.log('Skipping tag invalidation because the event was sent by the current user');
          return;
        }
        dispatch(backendApi.util.invalidateTags(['Item', 'Board']));
      };

      socket.on('board:updated', handleBoardUpdate);

      return () => {
        socket.off('board:updated', handleBoardUpdate);
        socket.emit('board:leave', boardId);
      };
    }
  }, [socket, boardId, dispatch, user]);

  const emailToNameMap = useMemo(() => {
    const map = new Map<string, string>();
    if (workspaceMembers) {
      workspaceMembers.forEach((m: any) => {
        if (m.userId && m.userId.email && m.userId.name) {
          map.set(m.userId.email.toLowerCase().trim(), m.userId.name);
        }
      });
    }
    return map;
  }, [workspaceMembers]);

  const emailToNameRecord = useMemo(() => {
    const record: Record<string, string> = {};
    if (workspaceMembers) {
      workspaceMembers.forEach((m: any) => {
        if (m.userId && m.userId.email && m.userId.name) {
          record[m.userId.email.toLowerCase().trim()] = m.userId.name;
        }
      });
    }
    return record;
  }, [workspaceMembers]);

  const [updateBoard, { isLoading: isUpdatingBoard }] = useUpdateBoardMutation();
  const [createItem, { isLoading: isCreatingItem }] = useCreateItemMutation();
  const [updateItem, { isLoading: isUpdatingItem }] = useUpdateItemMutation();
  const [deleteItem, { isLoading: isDeletingItem }] = useDeleteItemMutation();

  // AI State and handlers
  const [generateAIColumns, { isLoading: isGeneratingColumns }] = useGenerateAIColumnsMutation();

  const [aiChatOpen, setAiChatOpen] = useState(false);
  const [docImportOpen, setDocImportOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [chatHistory, setChatHistory] = useState<Array<{ sender: 'user' | 'ai'; text: string; table?: { headers: string[]; rows: string[][] } }>>([
    { sender: 'ai', text: `Hi! I am your AI assistant for board "${board.name}". Ask me about task progress, blockers, priorities, or what to build next!` }
  ]);
  const [boardChat, { isLoading: isChatting }] = useBoardChatMutation();
  const chatEndRef = useRef<HTMLDivElement>(null);
  const lastTaskListRef = useRef<Array<{ _id: string; title: string; columnName: string; assignee: string; priority: string }>>([]);

  // Auto-scroll chat to bottom when messages change
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, isChatting]);

  const [aiTaskMode, setAiTaskMode] = useState(false);
  const [quickAddStory, setQuickAddStory] = useState("");
  const [generateTaskFromStory, { isLoading: isGeneratingTask }] = useGenerateTaskFromStoryMutation();

  const handleGenerateColumnsWithPrompt = async (promptText: string) => {
    try {
      const res = await generateAIColumns({
        boardId,
        prompt: promptText.trim()
      }).unwrap();
      if (res.success) {
        toast.success("Columns updated successfully!");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.data?.message || "Failed to generate columns");
    }
  };

  // Helper: find column name by ID
  const getColumnName = (columnId: string) => {
    const col = board.columns.find(c => c.id === columnId);
    return col ? col.name : columnId;
  };

  // Helper: detect task-list queries
  const isTaskListQuery = (msg: string) => {
    const lower = msg.toLowerCase();
    return (
      (lower.includes('list') || lower.includes('show') || lower.includes('display') || lower.includes('get') || lower.includes('what')) &&
      (lower.includes('task') || lower.includes('todo') || lower.includes('item') || lower.includes('ticket'))
    );
  };

  // Helper: detect assignment commands like "assign me for 2nd task", "assign me to task 3"
  // Returns: positive number = specific task index, 0 = assign detected but no number, null = not an assign command
  const parseAssignCommand = (msg: string): number | null => {
    const lower = msg.toLowerCase();
    if (!lower.includes('assign')) return null;
    // Match patterns like: "assign me for 2nd task", "assign me to 3rd task", "assign task 2 to me", "assign me for task 2"
    const ordinalMap: Record<string, number> = { 'first': 1, '1st': 1, 'second': 2, '2nd': 2, 'third': 3, '3rd': 3, 'fourth': 4, '4th': 4, 'fifth': 5, '5th': 5, 'sixth': 6, '6th': 6, 'seventh': 7, '7th': 7, 'eighth': 8, '8th': 8, 'ninth': 9, '9th': 9, 'tenth': 10, '10th': 10 };
    for (const [word, num] of Object.entries(ordinalMap)) {
      if (lower.includes(word)) return num;
    }
    // Match "task 2", "task #2", etc.
    const numMatch = lower.match(/(?:task|#)\s*(\d+)/);
    if (numMatch) return parseInt(numMatch[1]);
    // Match plain number in context of assign
    const plainNum = lower.match(/assign\s+(?:me\s+)?(?:for|to)?\s*(\d+)/);
    if (plainNum) return parseInt(plainNum[1]);
    // "assign" detected but no specific number — return 0 as a sentinel
    return 0;
  };


  // Helper: perform the actual assignment of a task to the current user
  const performAssignment = async (taskIndex: number, taskList: typeof lastTaskListRef.current) => {
    if (taskIndex < 1 || taskIndex > taskList.length) {
      setChatHistory(prev => [...prev, { sender: 'ai', text: `Invalid task number. Please choose between 1 and ${taskList.length}.` }]);
      return;
    }
    const targetTask = taskList[taskIndex - 1];
    const userEmail = user?.email || '';
    const userName = user?.name || 'You';
    try {
      await updateItem({ id: targetTask._id, body: { assignee: userEmail } }).unwrap();
      setChatHistory(prev => [...prev, {
        sender: 'ai',
        text: `✅ Done! Task "${targetTask.title}" (Sl.No ${taskIndex}) has been assigned to ${userName} (${userEmail}).`
      }]);
      toast.success(`Task "${targetTask.title}" assigned to you!`);
    } catch (err: any) {
      console.error(err);
      setChatHistory(prev => [...prev, { sender: 'ai', text: `❌ Failed to assign task "${targetTask.title}". Please try again.` }]);
    }
  };


  // Helper: detect which column the user is asking about
  const detectColumnFromQuery = (msg: string): string | null => {
    const lower = msg.toLowerCase();
    for (const col of board.columns) {
      if (lower.includes(col.name.toLowerCase())) {
        return col.name;
      }
    }
    // Default common mappings
    if (lower.includes('todo') || lower.includes('to do') || lower.includes('to-do')) return 'To Do';
    if (lower.includes('in progress') || lower.includes('doing')) return 'In Progress';
    if (lower.includes('done') || lower.includes('completed') || lower.includes('complete')) return 'Done';
    return null;
  };

  const handleSendChatMessage = async () => {
    if (!chatMessage.trim()) return;
    const userMsg = chatMessage.trim();
    setChatHistory(prev => [...prev, { sender: 'user', text: userMsg }]);
    setChatMessage("");

    // --- Local handling: Assignment command ---
    const assignIdx = parseAssignCommand(userMsg);
    if (assignIdx !== null) {
      // assignIdx > 0: user specified a task number (e.g. "assign me for 2nd task")
      // assignIdx === 0: user said "assign" but no number (e.g. "assign the task to me")

      if (assignIdx > 0 && lastTaskListRef.current.length > 0) {
        // Specific task number with existing task list context
        await performAssignment(assignIdx, lastTaskListRef.current);
        return;
      }

      if (assignIdx === 0) {
        // No specific number — check if we can resolve which tasks they mean
        const columnName = detectColumnFromQuery(userMsg);

        if (lastTaskListRef.current.length === 1) {
          // Only 1 task in context — auto-assign it
          await performAssignment(1, lastTaskListRef.current);
          return;
        }

        if (lastTaskListRef.current.length > 1) {
          // Multiple tasks in context — ask user to specify
          setChatHistory(prev => [...prev, {
            sender: 'ai',
            text: `There are ${lastTaskListRef.current.length} tasks in the list. Please specify which one, e.g. "assign me for 2nd task".`
          }]);
          return;
        }

        // No prior task list — try to resolve from column mentioned in the message
        if (columnName) {
          const matchingCol = board.columns.find(c => c.name.toLowerCase().includes(columnName.toLowerCase()));
          if (matchingCol) {
            const colTasks = items.filter(item => item.columnId === matchingCol.id);
            if (colTasks.length === 0) {
              setChatHistory(prev => [...prev, { sender: 'ai', text: `No tasks found in "${matchingCol.name}" to assign.` }]);
              return;
            }
            // Store for follow-up
            lastTaskListRef.current = colTasks.map(t => ({
              _id: t._id,
              title: t.title,
              columnName: getColumnName(t.columnId),
              assignee: t.assignee || 'Unassigned',
              priority: t.priority || 'Medium',
            }));
            if (colTasks.length === 1) {
              await performAssignment(1, lastTaskListRef.current);
              return;
            }
            // Multiple tasks — show list and ask to pick
            const headers = ['Sl.No', 'Task ID', 'Task Name', 'Status', 'Assignee', 'Priority'];
            const rows = colTasks.map((t, i) => {
              const assigneeName = t.assignee ? (emailToNameMap.get(t.assignee.toLowerCase().trim()) || t.assignee) : 'Unassigned';
              return [
                String(i + 1),
                t._id.slice(-6).toUpperCase(),
                t.title,
                getColumnName(t.columnId),
                assigneeName,
                t.priority || 'Medium',
              ];
            });
            setChatHistory(prev => [...prev, {
              sender: 'ai',
              text: `There are ${colTasks.length} tasks in "${matchingCol.name}". Which one should I assign? Say "assign me for 2nd task".`,
              table: { headers, rows }
            }]);
            return;
          }
        }

        // No column, no prior list — can't determine which task
        setChatHistory(prev => [...prev, {
          sender: 'ai',
          text: `I'm not sure which task to assign. Try asking "show tasks in Todo" first, then say "assign me for 2nd task".`
        }]);
        return;
      }
    }

    // --- Local handling: Task list query ---
    if (isTaskListQuery(userMsg)) {
      const columnName = detectColumnFromQuery(userMsg);
      let tasksToShow: typeof items = [];
      let responseLabel = '';

      if (columnName) {
        // Find best matching column
        const matchingCol = board.columns.find(c => c.name.toLowerCase().includes(columnName.toLowerCase()));
        if (matchingCol) {
          tasksToShow = items.filter(item => item.columnId === matchingCol.id);
          responseLabel = `"${matchingCol.name}"`;
        } else {
          tasksToShow = items;
          responseLabel = `"${board.name}"`;
        }
      } else {
        // Show all tasks
        tasksToShow = items;
        responseLabel = `board "${board.name}"`;
      }

      if (tasksToShow.length === 0) {
        setChatHistory(prev => [...prev, { sender: 'ai', text: `No tasks found in ${responseLabel}.` }]);
        lastTaskListRef.current = [];
        return;
      }

      // Store for follow-up commands
      lastTaskListRef.current = tasksToShow.map(t => ({
        _id: t._id,
        title: t.title,
        columnName: getColumnName(t.columnId),
        assignee: t.assignee || 'Unassigned',
        priority: t.priority || 'Medium',
      }));

      const headers = ['Sl.No', 'Task ID', 'Task Name', 'Status', 'Assignee', 'Priority'];
      const rows = tasksToShow.map((t, i) => {
        const assigneeName = t.assignee ? (emailToNameMap.get(t.assignee.toLowerCase().trim()) || t.assignee) : 'Unassigned';
        return [
          String(i + 1),
          t._id.slice(-6).toUpperCase(),
          t.title,
          getColumnName(t.columnId),
          assigneeName,
          t.priority || 'Medium',
        ];
      });

      setChatHistory(prev => [...prev, {
        sender: 'ai',
        text: `Here are the tasks in ${responseLabel} (${tasksToShow.length} total).\nYou can say "assign me for 2nd task" to assign a task to yourself.`,
        table: { headers, rows }
      }]);
      return;
    }

    // --- Fallback: send to AI backend ---
    const historySnapshot = chatHistory.map(h => ({
      role: h.sender === 'user' ? 'user' : 'assistant',
      text: h.text
    }));

    try {
      const res = await boardChat({
        boardId,
        message: userMsg,
        history: historySnapshot
      }).unwrap();
      if (res.success && res.reply) {
        setChatHistory(prev => [...prev, { sender: 'ai', text: res.reply }]);
      }
    } catch (err: any) {
      console.error(err);
      setChatHistory(prev => [...prev, { sender: 'ai', text: "Sorry, I had trouble processing your query. Please try again." }]);
    }
  };

  const handleGenerateTaskFromStory = async () => {
    if (!quickAddTitle.trim() || !quickAddStory.trim()) return;
    const firstColId = [...board.columns].sort((a, b) => a.order - b.order)[0].id;
    try {
      const res = await generateTaskFromStory({
        boardId: board._id,
        columnId: firstColId,
        title: quickAddTitle.trim(),
        story: quickAddStory.trim()
      }).unwrap();
      if (res.success && res.item) {
        toast.success("Task created and populated with AI!");
        setQuickAddTitle("");
        setQuickAddStory("");
        setShowQuickAdd(false);
        setAiTaskMode(false);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.data?.message || "Failed to generate task");
    }
  };

  const isSyncing = isUpdatingBoard || isCreatingItem || isUpdatingItem || isDeletingItem;
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("All");
  const [filterPriority, setFilterPriority] = useState<string>("All");
  const [filterAssignee, setFilterAssignee] = useState<string>("All");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editBoardTitle, setEditBoardTitle] = useState("");

  const [selectedItem, setSelectedItem] = useState<ItemType | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddTitle, setQuickAddTitle] = useState("");

  // Sync board title input
  useEffect(() => {
    if (board) {
      setEditBoardTitle(board.name);
      // get user name who created
    }
  }, [board]);


  // ========== API Helpers ==========

  const handleSaveBoardTitle = async () => {
    if (workspace?.role === "GUEST") return;
    if (!editBoardTitle.trim() || editBoardTitle === board.name) {
      setIsEditingTitle(false);
      return;
    }
    try {
      await updateBoard({ id: board._id, body: { name: editBoardTitle.trim() } }).unwrap();
    } catch (err) {
      console.error(err);
    } finally {
      setIsEditingTitle(false);
    }
  };

  const saveColumnsToBackend = async (updatedColumns: ColumnType[]) => {
    if (workspace?.role === "GUEST") return;
    try {
      await updateBoard({ id: board._id, body: { columns: updatedColumns } }).unwrap();
    } catch (err) {
      console.error("Column save error:", err);
    }
  };

  const handleAddColumn = async (name: string, isDone?: boolean) => {
    if (workspace?.role === "GUEST") return;
    const newCol: ColumnType = {
      id: Math.random().toString(36).substring(2, 9),
      name,
      order: board.columns.length,
      isDone: isDone || false,
    };
    await saveColumnsToBackend([...board.columns, newCol]);
  };

  const handleToggleColumnDone = async (colId: string, isDone: boolean) => {
    if (workspace?.role === "GUEST") return;
    const updatedColumns = board.columns.map((c) =>
      c.id === colId ? { ...c, isDone } : c
    );
    await saveColumnsToBackend(updatedColumns);
  };

  const handleRenameColumn = async (colId: string, name: string) => {
    if (workspace?.role === "GUEST") return;
    const updatedColumns = board.columns.map((c) =>
      c.id === colId ? { ...c, name } : c
    );
    await saveColumnsToBackend(updatedColumns);
  };

  const handleUpdateColumn = async (colId: string, updates: Partial<ColumnType>) => {
    if (workspace?.role === "GUEST") return;
    const updatedColumns = board.columns.map((c) =>
      c.id === colId ? { ...c, ...updates } : c
    );
    await saveColumnsToBackend(updatedColumns);
  };

  const handleDeleteColumn = async (colId: string) => {
    if (workspace?.role === "GUEST") return;
    const colToDelete = board.columns.find((c) => c.id === colId);
    if (!colToDelete) return;

    const ok = await confirm({
      title: "Delete Column",
      description: `Are you sure you want to delete column "${colToDelete.name}"? All items in this column will be permanently removed.`,
      confirmText: "Delete Column",
      variant: "destructive",
    });
    if (!ok) return;

    const itemsToDelete = items.filter((item) => item.columnId === colId);
    for (const item of itemsToDelete) {
      await deleteItem(item._id).unwrap();
    }

    await saveColumnsToBackend(
      board.columns.filter((c) => c.id !== colId)
    );
  };

  const handleShiftColumn = async (
    colId: string,
    direction: "left" | "right"
  ) => {
    if (workspace?.role === "GUEST") return;
    const colIdx = board.columns.findIndex((c) => c.id === colId);
    if (colIdx === -1) return;

    const newColumns = [...board.columns];
    if (direction === "left" && colIdx > 0) {
      const temp = newColumns[colIdx];
      newColumns[colIdx] = newColumns[colIdx - 1];
      newColumns[colIdx - 1] = temp;
    } else if (
      direction === "right" &&
      colIdx < newColumns.length - 1
    ) {
      const temp = newColumns[colIdx];
      newColumns[colIdx] = newColumns[colIdx + 1];
      newColumns[colIdx + 1] = temp;
    } else {
      return;
    }

    const orderedCols = newColumns.map((col, index) => ({
      ...col,
      order: index,
    }));
    await saveColumnsToBackend(orderedCols);
  };

  const handleMoveColumnToEnd = async (colId: string) => {
    if (workspace?.role === "GUEST") return;
    const sorted = [...board.columns].sort((a, b) => a.order - b.order);
    const colIdx = sorted.findIndex((c) => c.id === colId);
    if (colIdx === -1 || colIdx === sorted.length - 1) return;

    const [moved] = sorted.splice(colIdx, 1);
    sorted.push(moved);

    const orderedCols = sorted.map((col, index) => ({
      ...col,
      order: index,
    }));
    await saveColumnsToBackend(orderedCols);
  };

  const handleCreateCard = async (
    colId: string,
    title: string,
    type?: string,
    priority?: string
  ) => {
    if (workspace?.role === "GUEST") return;
    try {
      await createItem({
        boardId: board._id,
        body: {
          title,
          columnId: colId,
          type: type || "Task",
          priority: priority || "Medium",
        },
      }).unwrap();
    } catch (err) {
      console.error(err);
    }
  };

  const handleMoveCard = async (
    itemId: string,
    targetColId: string,
    newOrder?: number
  ) => {
    if (workspace?.role === "GUEST") return;

    // Check if target column is a done column to celebrate
    const targetColumn = board.columns.find((col) => col.id === targetColId);
    if (targetColumn) {
      const lower = targetColumn.name.toLowerCase();
      if (lower.includes("done") || lower.includes("complete") || lower.includes("resolved")) {
        triggerConfetti();
      }
    }

    try {
      await updateItem({
        id: itemId,
        body: {
          columnId: targetColId,
          order: newOrder ?? 0,
        },
      }).unwrap();
    } catch (err) {
      console.error("Error saving dropped card status:", err);
    }
  };

  const handleReorderCard = async (
    itemId: string,
    _colId: string,
    newOrder: number
  ) => {
    if (workspace?.role === "GUEST") return;
    try {
      await updateItem({
        id: itemId,
        body: { order: newOrder },
      }).unwrap();
    } catch (err) {
      console.error("Reorder error:", err);
    }
  };

  const handleQuickAddTask = async () => {
    if (workspace?.role === "GUEST") return;
    if (!quickAddTitle.trim() || !board.columns.length) return;
    const firstColId = [...board.columns].sort(
      (a, b) => a.order - b.order
    )[0].id;
    await handleCreateCard(firstColId, quickAddTitle.trim());
    setQuickAddTitle("");
    setShowQuickAdd(false);
  };

  // ========== Bulk Actions ==========

  const handleBulkUpdateStatus = async (itemIds: string[], targetColId: string) => {
    if (workspace?.role === "GUEST") return;

    // Check if target column is a done column to celebrate
    const targetColumn = board.columns.find((col) => col.id === targetColId);
    if (targetColumn) {
      const lower = targetColumn.name.toLowerCase();
      if (lower.includes("done") || lower.includes("complete") || lower.includes("resolved")) {
        triggerConfetti();
      }
    }

    try {
      await Promise.all(
        itemIds.map((id) =>
          updateItem({ id, body: { columnId: targetColId } }).unwrap()
        )
      );
    } catch (err) {
      console.error("Bulk status update error:", err);
    }
  };

  const handleBulkUpdatePriority = async (itemIds: string[], priority: string) => {
    if (workspace?.role === "GUEST") return;
    try {
      await Promise.all(
        itemIds.map((id) =>
          updateItem({ id, body: { priority: priority as ItemPriorityClass } }).unwrap()
        )
      );
    } catch (err) {
      console.error("Bulk priority update error:", err);
    }
  };

  const handleBulkDelete = async (itemIds: string[]) => {
    if (workspace?.role === "GUEST") return;
    const ok = await confirm({
      title: "Bulk Delete Tasks",
      description: `Are you sure you want to delete the ${itemIds.length} selected tasks?`,
      confirmText: "Delete Tasks",
      variant: "destructive",
    });
    if (!ok) return;
    try {
      await Promise.all(itemIds.map((id) => deleteItem(id).unwrap()));
    } catch (err) {
      console.error("Bulk delete error:", err);
    }
  };

  // ========== Filters ==========

  const assigneeOptions: string[] = useMemo(() => {
    const options: string[] = [];
    if (workspaceMembers && workspaceMembers.length > 0) {
      workspaceMembers.forEach((m: any) => {
        if (m.userId && m.userId.email) {
          const email = m.userId.email.toLowerCase().trim();
          if (!options.includes(email)) {
            options.push(email);
          }
        }
      });
    } else if (workspace) {
      const ownerEmail =
        typeof workspace.owner === "object"
          ? workspace.owner.email
          : workspace.owner;
      if (ownerEmail) options.push(ownerEmail.toLowerCase().trim());
      if (workspace.members && Array.isArray(workspace.members)) {
        workspace.members.forEach((m) => {
          if (m) {
            const email = m.toLowerCase().trim();
            if (!options.includes(email)) options.push(email);
          }
        });
      }
    }

    // Always move the system current user to the front
    const currentUserEmail = user?.email?.toLowerCase().trim();
    if (currentUserEmail) {
      const index = options.indexOf(currentUserEmail);
      if (index > -1) {
        options.splice(index, 1);
        options.unshift(currentUserEmail);
      }
    }

    return options;
  }, [workspace, workspaceMembers, user]);


  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description &&
        item.description
          .toLowerCase()
          .includes(searchQuery.toLowerCase()));

    const matchesType =
      filterType === "All" || item.type === filterType;
    const matchesPriority =
      filterPriority === "All" || item.priority === filterPriority;

    let matchesAssignee = true;
    if (filterAssignee !== "All") {
      if (filterAssignee === "Unassigned") {
        matchesAssignee = !item.assignee;
      } else {
        matchesAssignee = item.assignee === filterAssignee;
      }
    }

    return (
      matchesSearch && matchesType && matchesPriority && matchesAssignee
    );
  });

  // ========== Render ==========

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background relative">
      {/* Confetti Celebration overlay */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none z-50 w-full h-full"
      />
      {/* Board Header - Clean & Modern Single-Row Layout */}
      <div className="bg-card text-card-foreground border-b border-border px-6 py-5 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">

          {/* LEFT */}
          <div className="flex items-start gap-4">

            <Button
              variant="ghost"
              size="icon"
              onClick={onBackToDashboard}
              className="rounded-xl"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>

            <div>
              {/* Title */}
              <div className="flex items-center gap-3">
                {isEditingTitle ? (
                  <input
                    type="text"
                    value={editBoardTitle}
                    onChange={(e) => setEditBoardTitle(e.target.value)}
                    onBlur={handleSaveBoardTitle}
                    onKeyDown={(e) =>
                      e.key === "Enter" && handleSaveBoardTitle()
                    }
                    className="text-2xl font-bold bg-background border border-border px-3 py-1 rounded-xl"
                    autoFocus
                  />
                ) : (
                  <>
                    <h1
                      onClick={() => {
                        if (workspace?.role !== 'GUEST') {
                          setIsEditingTitle(true);
                        }
                      }}
                      className={`text-2xl font-bold tracking-tight text-foreground transition-colors ${workspace?.role !== 'GUEST' ? 'cursor-pointer hover:text-primary' : ''
                        }`}
                    >
                      {board.name}
                    </h1>

                    <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-2 py-1">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-xs font-medium text-emerald-700">
                        Active
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Metadata */}
              <div className="mt-2 flex items-center gap-5 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Users className="h-4 w-4" />
                  {workspaceMembers.length || 0} Members
                </div>
                <div className="flex items-center gap-1.5">
                  <RefreshCcw className={`h-4 w-4 ${isSyncing ? "text-green-500 animate-spin" : "text-gray-400"}`} />
                  Real-time Sync
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">

            <Button
              variant="outline"
              onClick={() => setSummaryOpen(true)}
              className="rounded-xl cursor-pointer"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </Button>

            {workspace?.role !== 'GUEST' && (
              showQuickAdd ? (
                <div className="w-[420px] rounded-2xl border border-border bg-card text-card-foreground shadow-xl p-4 animate-in fade-in zoom-in-95 duration-200 absolute right-4 top-10 z-250">

                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-foreground flex items-center gap-2">
                        <PlusCircle className="h-5 w-5 text-primary" />
                        Create New Task
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        Add a roadmap item, feature request, bug, or initiative.
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDocImportOpen(true)}
                        className="h-8 w-8 rounded-lg text-violet-650 hover:text-violet-755 hover:bg-violet-50/50 cursor-pointer"
                        title="Sync with AI Document"
                      >
                        <FileText className="h-4 w-4 text-violet-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setAiChatOpen(true)}
                        className="h-8 w-8 rounded-lg text-indigo-650 hover:text-indigo-750 hover:bg-indigo-50/50 cursor-pointer"
                        title="Ask AI Assistant"
                      >
                        <Sparkles className="h-4 w-4 animate-pulse text-indigo-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setShowQuickAdd(false);
                          setQuickAddTitle("");
                          setQuickAddStory("");
                          setAiTaskMode(false);
                        }}
                        className="h-8 w-8"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Toggle Mode */}
                  <div className="mb-4 flex justify-between items-center bg-muted/65 p-1 rounded-xl">
                    <button
                      onClick={() => setAiTaskMode(false)}
                      className={`flex-1 text-[11px] font-bold py-1.5 rounded-lg transition-colors cursor-pointer text-center outline-none ${!aiTaskMode ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground'}`}
                    >
                      Simple Task
                    </button>
                    <button
                      onClick={() => setAiTaskMode(true)}
                      className={`flex-1 text-[11px] font-bold py-1.5 rounded-lg transition-colors cursor-pointer text-center flex items-center justify-center gap-1 outline-none ${aiTaskMode ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground'}`}
                    >
                      <Sparkles className="h-3 w-3 text-indigo-500 animate-pulse" />
                      AI Generator
                    </button>
                  </div>

                  {/* Inputs and Footers depending on Mode */}
                  {!aiTaskMode ? (
                    <>
                      {/* Simple Mode */}
                      <Input
                        placeholder="What needs to be built?"
                        value={quickAddTitle}
                        onChange={(e) => setQuickAddTitle(e.target.value)}
                        onKeyDown={(e) =>
                          e.key === "Enter" && handleQuickAddTask()
                        }
                        className="h-11 rounded-xl text-sm"
                        autoFocus
                      />

                      <div className="flex justify-between items-center mt-5">
                        <div className="text-xs text-muted-foreground">
                          Press <kbd className="px-1 py-0.5 border rounded">Enter</kbd> to create
                        </div>

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setShowQuickAdd(false);
                              setQuickAddTitle("");
                              setAiTaskMode(false);
                            }}
                            className="rounded-xl"
                          >
                            Cancel
                          </Button>

                          <Button
                            onClick={handleQuickAddTask}
                            className="rounded-xl bg-primary hover:bg-primary/90"
                          >
                            <RefreshCcw className={`h-4 w-4 mr-2 ${isSyncing ? "animate-spin" : ""}`} />
                            Create Task
                          </Button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* AI Mode */}
                      <Input
                        placeholder="Task summary / title"
                        value={quickAddTitle}
                        onChange={(e) => setQuickAddTitle(e.target.value)}
                        className="h-10 rounded-xl text-sm mb-2"
                        autoFocus
                      />

                      <textarea
                        placeholder="Describe the story requirements & details. E.g., 'Design logo, assign to Alice, set due by end of month. Checklist: draft designs, team feedback session.'"
                        value={quickAddStory}
                        onChange={(e) => setQuickAddStory(e.target.value)}
                        className="w-full min-h-[100px] p-2.5 text-xs rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary/20 placeholder:text-muted-foreground resize-none"
                        disabled={isGeneratingTask}
                      />

                      <div className="flex justify-between items-center mt-4">
                        <div className="text-[10px] text-muted-foreground flex items-center gap-0.5 select-none">
                          <BrainCircuit className="h-3.5 w-3.5 text-indigo-500" />
                          Structured Task
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setShowQuickAdd(false);
                              setQuickAddTitle("");
                              setQuickAddStory("");
                              setAiTaskMode(false);
                            }}
                            disabled={isGeneratingTask}
                            className="rounded-xl h-8 text-xs cursor-pointer"
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleGenerateTaskFromStory}
                            disabled={isGeneratingTask || !quickAddTitle.trim() || !quickAddStory.trim()}
                            className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white h-8 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            {isGeneratingTask ? (
                              <>
                                <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                                Generating...
                              </>
                            ) : (
                              <>
                                <Sparkles className="h-3.5 w-3.5 mr-1 animate-pulse" />
                                Generate
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </>
                  )}

                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setAiChatOpen(true)}
                    className="h-11 rounded-xl border-indigo-200 dark:border-indigo-900 text-indigo-650 dark:text-indigo-400 hover:bg-indigo-50/50 cursor-pointer font-semibold flex items-center gap-1.5 px-4"
                  >
                    <Sparkles className="h-4 w-4 text-indigo-500 animate-pulse" />
                    Ask AI
                  </Button>

                  <Button
                    onClick={() => setShowQuickAdd(true)}
                    className="
                      h-11
                      rounded-xl
                      bg-gradient-to-r
                      from-indigo-600
                      to-violet-600
                      hover:from-indigo-700
                      hover:to-violet-700
                      shadow-md
                      hover:shadow-lg
                      transition-all
                      duration-200
                      px-5
                      font-semibold
                      cursor-pointer
                    "
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    New Task
                  </Button>
                </div>
              )
            )}
          </div>
        </div>
      </div>
      <div className="flex mt-4 items-center gap-4 px-6 shrink-0 justify-between md:justify-start w-full">


        {/* Search bar - minimal */}
        <div className="hidden md:block relative shrink-0">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 pr-3 py-1.5 w-36 md:w-44 focus:w-56 bg-muted hover:bg-muted/50 focus:bg-card text-card-foreground text-xs border border-transparent focus:border-border focus:outline-none rounded-xl text-foreground placeholder:text-muted-foreground transition-all font-semibold"
          />
        </div>

        {/* Filters grouped into minimal dropdowns */}
        <div className="hidden md:flex items-center gap-1.5 shrink-0">
          {/* Type */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="bg-muted hover:bg-muted/70 border border-transparent text-[11px] font-bold text-zinc-655 rounded-xl px-2.5 py-1.5 flex items-center gap-1 cursor-pointer transition-colors focus:outline-none">
                <span>Type</span>
                {filterType !== "All" && (
                  <span className="bg-primary text-white text-[9px] w-4.5 h-4.5 rounded-full flex items-center justify-center font-bold">
                    {filterType[0]}
                  </span>
                )}
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {["All", "Task", "Bug", "Lead", "Idea", "Issue", "Event"].map((type) => (
                <DropdownMenuItem
                  key={type}
                  onClick={() => setFilterType(type)}
                >
                  {typeFilterIcons[type]}
                  {type === "All" ? "All Types" : type}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Priority */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="bg-muted hover:bg-muted/70 border border-transparent text-[11px] font-bold text-zinc-655 rounded-xl px-2.5 py-1.5 flex items-center gap-1 cursor-pointer transition-colors focus:outline-none">
                <span>Priority</span>
                {filterPriority !== "All" && (
                  <span className="bg-amber-605 text-white text-[9px] w-4.5 h-4.5 rounded-full flex items-center justify-center font-bold">
                    {filterPriority[0]}
                  </span>
                )}
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {["All", "Lowest", "Low", "Medium", "High", "Highest", "Critical"].map((prio) => (
                <DropdownMenuItem
                  key={prio}
                  onClick={() => setFilterPriority(prio)}
                >
                  {prio === "All" ? (
                    <Sliders className="size-3.5 mr-2 text-zinc-400" />
                  ) : (
                    <PriorityIndicator priority={prio as ItemPriorityClass} showText={false} className="border-0 bg-transparent p-0 mr-2" />
                  )}
                  {prio === "All" ? "All Priorities" : prio}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="hidden md:block w-[1px] h-4 bg-muted shrink-0" />

        {/* Members Avatars */}
        <div className="flex -space-x-1 items-center shrink-0">
          {(assigneeOptions.length >= 3 ? assigneeOptions.slice(0, 2) : assigneeOptions).map((email) => {
            const isSelected = filterAssignee === email;
            const resolvedName = emailToNameMap.get(email.toLowerCase().trim()) || email;
            const initials = resolvedName.split(" ").map((s: string) => s[0]).join("").toUpperCase().slice(0, 2);
            return (
              <Avatar
                key={email}
                onClick={() => {
                  setFilterAssignee(prev => prev === email ? "All" : email);
                }}
                className={`h-6 w-6 border cursor-pointer transition-all duration-200 hover:scale-110 ${isSelected
                  ? "ring-2 ring-blue-500 border-white z-10 scale-105"
                  : "border-white hover:z-10"
                  }`}
                title={resolvedName}
              >
                <AvatarFallback className="bg-muted text-[9px] text-muted-foreground font-bold uppercase">
                  {initials || "??"}
                </AvatarFallback>
              </Avatar>
            );
          })}
          {assigneeOptions.length >= 3 && (() => {
            const remainingAssignees = assigneeOptions.slice(2);
            const isDropdownSelected = remainingAssignees.includes(filterAssignee);
            return (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className={`h-6 w-6 rounded-full bg-muted border cursor-pointer flex items-center justify-center hover:scale-110 transition-all duration-200 shrink-0 outline-none ${
                      isDropdownSelected
                        ? "ring-2 ring-blue-500 border-white z-10 scale-105"
                        : "border-white hover:z-10"
                    }`}
                    title="More Assignees"
                  >
                    <Plus className="h-3 w-3 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 rounded-xl p-1.5 shadow-lg border border-border bg-card text-card-foreground">
                  {remainingAssignees.map((email) => {
                    const isSelected = filterAssignee === email;
                    const resolvedName = emailToNameMap.get(email.toLowerCase().trim()) || email;
                    const initials = resolvedName.split(" ").map((s: string) => s[0]).join("").toUpperCase().slice(0, 2);
                    return (
                      <DropdownMenuItem
                        key={email}
                        onClick={() => {
                          setFilterAssignee(prev => prev === email ? "All" : email);
                        }}
                        className={`flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer transition-colors text-xs font-semibold text-foreground/90 hover:bg-background ${
                          isSelected ? "bg-blue-50/50 text-blue-600" : ""
                        }`}
                      >
                        <Avatar className="h-5 w-5 border border-border">
                          <AvatarFallback className="bg-muted text-[8px] text-zinc-500 font-bold uppercase">
                            {initials || "??"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate flex-1">{resolvedName}</span>
                        {isSelected && (
                          <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                        )}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            );
          })()}
        </div>

        {/* Right Side: View Switcher (Icons Only) & Add Task Button */}
        <div className="flex items-center gap-3 shrink-0 md:ml-auto lg:ml-0">


          <ViewSwitcher
            activeView={viewMode}
            onViewChange={setViewMode}
          />
        </div>


      </div>


      <Dialog open={summaryOpen} onOpenChange={setSummaryOpen} >
        <DialogContent
          className="
          max-w-[90vw]!
          h-[90vh]!
          rounded-xl
          overflow-hidden
          p-0
          border-0
        "
        >
          <DialogTitle className="sr-only">Board Summary</DialogTitle>
          <DialogDescription className="sr-only">Detailed analytics and visual metrics for board items</DialogDescription>
          <div className="flex-1 overflow-auto">

            <div className="p-6">
              <JiraSummaryPage
                items={items}
                board={board}
              />
            </div>

          </div>
        </DialogContent>
      </Dialog>

      {viewMode === "kanban" && (
        <div className="flex-1 h-full overflow-auto pt-4">

          <KanbanView
            board={board}
            items={filteredItems}
            onCardClick={(item) => {
              setSelectedItem(item);
              setIsDetailOpen(true);
            }}
            onCreateCard={handleCreateCard}
            onMoveCard={handleMoveCard}
            onReorderCard={handleReorderCard}
            onAddColumn={handleAddColumn}
            onRenameColumn={handleRenameColumn}
            onUpdateColumn={handleUpdateColumn}
            onToggleColumnDone={handleToggleColumnDone}
            onDeleteColumn={handleDeleteColumn}
            onShiftColumn={handleShiftColumn}
            onMoveColumnToEnd={handleMoveColumnToEnd}
            onBulkUpdateStatus={handleBulkUpdateStatus}
            onBulkUpdatePriority={handleBulkUpdatePriority}
            onBulkDelete={handleBulkDelete}
            workspaceRole={workspace!.role}
            assigneeOptions={assigneeOptions}
            emailToNameMap={emailToNameRecord}
            generateAIColumns={handleGenerateColumnsWithPrompt}
            isGeneratingColumns={isGeneratingColumns}
          />
        </div>
      )}

      {viewMode === "list" && (
        <ListView
          board={board}
          items={filteredItems}
          onCardClick={(item) => {
            setSelectedItem(item);
            setIsDetailOpen(true);
          }}
          onCreateCard={handleCreateCard}
          onMoveCard={handleMoveCard}
          onReorderCard={handleReorderCard}
          onBulkUpdateStatus={handleBulkUpdateStatus}
          onBulkUpdatePriority={handleBulkUpdatePriority}
          onBulkDelete={handleBulkDelete}
          workspaceRole={workspace!.role}
          emailToNameMap={emailToNameRecord}
          assigneeOptions={assigneeOptions}
          onRenameColumn={handleRenameColumn}
          onUpdateColumn={handleUpdateColumn}
          onDeleteColumn={handleDeleteColumn}
          onShiftColumn={handleShiftColumn}
          onMoveColumnToEnd={handleMoveColumnToEnd}
        />
      )}

      {viewMode === "calendar" && (
        <CalendarView
          board={board}
          items={filteredItems}
          onCardClick={(item) => {
            setSelectedItem(item);
            setIsDetailOpen(true);
          }}
          assigneeOptions={assigneeOptions}
          emailToNameMap={emailToNameRecord}
        />
      )}

      {viewMode === "timeline" && (
        <TimelineView
          board={board}
          items={filteredItems}
          onCardClick={(item) => {
            setSelectedItem(item);
            setIsDetailOpen(true);
            // Push item URL so refresh/share works
            if (workspace?._id) {
              navigate(`/workspace/${workspace._id}/board/${boardId}/item/${item._id}`);
            }
          }}
          assigneeOptions={assigneeOptions}
          emailToNameMap={emailToNameRecord}
        />
      )}

      {/* Item Detail Modal */}
      {selectedItem && (
        <ItemDetailModal
          open={isDetailOpen}
          emailToNameMap={emailToNameMap}
          onClose={() => {
            setIsDetailOpen(false);
            setSelectedItem(null);
            // Navigate back to the board URL when closing the item modal
            if (workspace?._id) {
              navigate(`/workspace/${workspace._id}/board/${boardId}`);
            }
          }}
          item={selectedItem}
          workspace={workspace}
          token={token}
          onItemUpdated={(updated) => {
            setSelectedItem(updated);
            // Instantly patch cache so cards update without refresh lag
            dispatch(
              backendApi.util.updateQueryData("getBoardItems", boardId, (draft) => {
                const idx = draft.items.findIndex((it) => it._id === updated._id);
                if (idx !== -1) {
                  draft.items[idx] = updated;
                }
              })
            );
          }}
          onItemDeleted={(_itemId) => {
            setSelectedItem(null);
          }}
        />
      )}

      {/* Board Chat Assistant Dialog */}
      <Dialog open={aiChatOpen} onOpenChange={setAiChatOpen}>
        <DialogContent className="max-w-lg! h-[80vh]! flex! flex-col! p-0! gap-0! overflow-hidden! border border-border bg-card text-card-foreground shadow-2xl rounded-2xl">
          {/* Header */}
          <div className="shrink-0 p-4 border-b border-border flex items-center justify-between select-none bg-muted/30">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-650 dark:text-indigo-400">
                <BrainCircuit className="h-5 w-5 animate-pulse" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-foreground">AI Board Assistant</h3>
                <p className="text-[10px] text-muted-foreground">Ask questions about tasks, progress, or columns.</p>
              </div>
            </div>
          </div>

          {/* Chat Messages - using native scroll for reliability */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4 bg-muted/10">
            <div className="space-y-4">
              {chatHistory.map((chat, idx) => (
                <div
                  key={idx}
                  className={`flex ${chat.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs shadow-xs leading-relaxed ${
                      chat.sender === 'user'
                        ? 'bg-indigo-600 text-white rounded-br-none'
                        : 'bg-card text-foreground border border-border rounded-bl-none'
                    }`}
                  >
                    <p className="whitespace-pre-line font-medium">{chat.text}</p>
                    {/* Render table if present */}
                    {chat.table && (
                      <div className="mt-2 overflow-x-auto">
                        <table className="w-full text-[11px] border-collapse">
                          <thead>
                            <tr>
                              {chat.table.headers.map((h, hi) => (
                                <th key={hi} className="text-left px-2 py-1.5 border-b border-border/50 font-bold text-muted-foreground whitespace-nowrap bg-muted/30">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {chat.table.rows.map((row, ri) => (
                              <tr key={ri} className="hover:bg-muted/20 transition-colors">
                                {row.map((cell, ci) => (
                                  <td key={ci} className="px-2 py-1.5 border-b border-border/30 whitespace-nowrap">{cell}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isChatting && (
                <div className="flex justify-start">
                  <div className="bg-card text-foreground border border-border rounded-2xl rounded-bl-none px-3.5 py-2.5 text-xs flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-indigo-550" />
                    <span className="font-semibold text-muted-foreground animate-pulse">Analyzing board tasks...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          </div>

          {/* Input Area */}
          <div className="shrink-0 p-3 border-t border-border bg-card flex gap-2 items-center">
            <Input
              placeholder="Ask a question about this board..."
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendChatMessage()}
              className="flex-1 h-10 rounded-xl text-xs bg-muted/30 border-muted"
              disabled={isChatting}
            />
            <Button
              onClick={handleSendChatMessage}
              disabled={isChatting || !chatMessage.trim()}
              size="icon"
              className="h-10 w-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl cursor-pointer"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Document Sync Modal */}
      {board?._id && (
        <AIDocumentToBoardModal
          open={docImportOpen}
          onOpenChange={setDocImportOpen}
          workspaceId={board.workspace}
          boardId={board._id}
          onComplete={() => {
            // Sync triggers automatically
          }}
        />
      )}
    </div>
  );
}

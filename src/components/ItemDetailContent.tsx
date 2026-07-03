import { useState, useEffect, useMemo, useRef, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch } from "@/store/hooks";
import { useAuth } from "@/context/AuthContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Calendar,
  CheckSquare,
  MessageSquare,
  Paperclip,
  Trash2,
  AlertCircle,
  X,
  Plus,
  Bug,
  Lightbulb,
  Target,
  ChevronDown,
  AlertTriangle,
  ArrowLeft,
  Share2,
  Check,
  Settings,
  Link,
  Copy,
} from "lucide-react";
import type { ItemType, ItemPriorityClass, ItemTypeClass } from "@/types/workspace";
import {
  useGetItemQuery,
  useGetBoardQuery,
  useGetWorkspacesQuery,
  useUpdateItemMutation,
  useDeleteItemMutation,
  useCreateItemMutation,
  useGetTaskHistoryQuery,
  useGetWorkspaceMembersQuery,
  useGetLabelsQuery,
  useGetMilestonesQuery,
  useCreateLabelMutation,
  useDeleteLabelMutation,
  backendApi,
} from "@/store/services/api";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PriorityIndicator } from "@/components/ui/priority-indicator";
import { StatusIndicator } from "@/components/ui/status-indicator";

interface ItemDetailContentProps {
  itemId: string;
  onClose?: () => void;
  onItemUpdated?: (updatedItem: ItemType) => void;
  onItemDeleted?: (itemId: string) => void;
  isModal?: boolean;
  emailToNameMap?: Map<string, string> | Record<string, string>;
}

const PRIORITIES: ItemPriorityClass[] = ["Lowest", "Low", "Medium", "High", "Highest", "Critical"];

const typeConfig: Record<ItemTypeClass, { color: string; bg: string; icon: ReactNode }> = {
  Task: { color: "text-blue-650", bg: "bg-blue-50", icon: <CheckSquare className="h-4 w-4 text-blue-500 shrink-0" /> },
  Bug: { color: "text-red-605", bg: "bg-red-50", icon: <Bug className="h-4 w-4 text-red-500 shrink-0" /> },
  Lead: { color: "text-emerald-600", bg: "bg-emerald-50", icon: <Target className="h-4 w-4 text-emerald-500 shrink-0" /> },
  Idea: { color: "text-purple-650", bg: "bg-purple-50", icon: <Lightbulb className="h-4 w-4 text-purple-500 shrink-0" /> },
  Issue: { color: "text-yellow-655", bg: "bg-yellow-50", icon: <AlertCircle className="h-4 w-4 text-yellow-500 shrink-0" /> },
  Event: { color: "text-primary", bg: "bg-primary/10", icon: <Calendar className="h-4 w-4 text-indigo-500 shrink-0" /> },
};

export function ItemDetailContent({
  itemId,
  onClose,
  onItemUpdated,
  onItemDeleted,
  isModal = false,
  emailToNameMap,
}: ItemDetailContentProps) {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAuth();

  // Queries
  const { data: itemData, isLoading: itemLoading, error: itemError } = useGetItemQuery(itemId);
  const item = itemData?.item;

  const { data: boardData } = useGetBoardQuery(item?.board || "", { skip: !item?.board });
  const board = boardData?.board;

  const { data: workspacesData } = useGetWorkspacesQuery();
  const workspace = workspacesData?.workspaces.find((w) => w._id === board?.workspace) || null;

  const { data: membersData } = useGetWorkspaceMembersQuery(
    workspace?._id || "",
    { skip: !workspace?._id }
  );
  const workspaceMembers = membersData?.members || [];



  const { data: historyData } = useGetTaskHistoryQuery(itemId, { skip: !itemId });

  const { data: milestonesData } = useGetMilestonesQuery(workspace?._id || "", {
    skip: !workspace?._id,
  });

  const { data: labelsData } = useGetLabelsQuery(workspace?._id || "", {
    skip: !workspace?._id,
  });

  const allLabels = labelsData?.labels || [];

  const localEmailToNameRecord = useMemo(() => {
    const record: Record<string, string> = {};
    if (workspaceMembers && workspaceMembers.length > 0) {
      workspaceMembers.forEach((m: any) => {
        if (m.userId && m.userId.email && m.userId.name) {
          record[m.userId.email.toLowerCase().trim()] = m.userId.name;
        }
      });
    }
    if (emailToNameMap) {
      if (typeof emailToNameMap.forEach === "function") {
        emailToNameMap.forEach((val, key) => {
          record[key.toLowerCase().trim()] = val;
        });
      } else {
        Object.entries(emailToNameMap).forEach(([key, val]) => {
          record[key.toLowerCase().trim()] = val as string;
        });
      }
    }
    return record;
  }, [workspaceMembers, emailToNameMap]);

  // Member options for Assignee dropdown
  const memberEmails = useMemo(() => {
    const list: string[] = [];
    if (workspace) {
      const ownerEmail = typeof workspace.owner === "object" ? workspace.owner.email : workspace.owner;
      if (ownerEmail) list.push(ownerEmail.toLowerCase().trim());
    }
    if (workspaceMembers && workspaceMembers.length > 0) {
      workspaceMembers.forEach((m: any) => {
        if (m.userId && m.userId.email) {
          const email = m.userId.email.toLowerCase().trim();
          if (!list.includes(email)) {
            list.push(email);
          }
        }
      });
    } else if (workspace?.members && Array.isArray(workspace.members)) {
      workspace.members.forEach((m) => {
        if (m) {
          const email = m.toLowerCase().trim();
          if (!list.includes(email)) {
            list.push(email);
          }
        }
      });
    }
    return list;
  }, [workspace, workspaceMembers]);

  // Mutations
  const [updateItem] = useUpdateItemMutation();
  const [deleteItem] = useDeleteItemMutation();
  const [createItem] = useCreateItemMutation();
  const [createLabel] = useCreateLabelMutation();
  const [deleteLabel] = useDeleteLabelMutation();

  // Local state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [checklist, setChecklist] = useState<any[]>([]);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [newAttachment, setNewAttachment] = useState("");
  const [showAttachInput, setShowAttachInput] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activityTab, setActivityTab] = useState<'comments' | 'history'>('comments');
  const [copiedLink, setCopiedLink] = useState(false);

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

  // Comment edit/delete state
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");

  // Labels state
  const [labelSearch, setLabelSearch] = useState("");

  const filteredLabelsForPopover = useMemo(() => {
    if (!labelSearch) return allLabels;
    return allLabels.filter((l: any) => l.name.toLowerCase().includes(labelSearch.toLowerCase()));
  }, [allLabels, labelSearch]);

  // Plus dropdown
  const [showPlusDropdown, setShowPlusDropdown] = useState(false);
  const plusDropdownRef = useRef<HTMLDivElement>(null);

  // Section scroll refs
  const subtaskSectionRef = useRef<HTMLDivElement>(null);
  const attachSectionRef = useRef<HTMLDivElement>(null);
  const commentSectionRef = useRef<HTMLDivElement>(null);

  // Close plus dropdown on outside click
  useEffect(() => {
    if (!showPlusDropdown) return;
    const handler = (e: MouseEvent) => {
      if (plusDropdownRef.current && !plusDropdownRef.current.contains(e.target as Node)) {
        setShowPlusDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showPlusDropdown]);



  // Sync state when item loads or changes
  useEffect(() => {
    if (item) {
      setTitle(item.title || "");
      setDescription(item.description || "");
      setChecklist(item.checklist || []);
      setAttachments(item.attachments || []);
    }
  }, [item]);

  if (itemLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 min-h-[400px] bg-card text-card-foreground">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-zinc-505 text-sm font-semibold">Loading issue...</p>
      </div>
    );
  }

  if (itemError || !item) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center min-h-[400px] bg-card text-card-foreground">
        <AlertTriangle className="h-10 w-10 text-red-500 mb-3" />
        <h3 className="text-lg font-bold text-[#172b4d]">Issue Not Found</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-md">
          This issue may have been deleted, or you might not have permission to view it.
        </p>
        {!isModal && (
          <Button
            onClick={() => navigate("/")}
            className="mt-4 bg-primary hover:bg-primary/90 text-white rounded-xl"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        )}
      </div>
    );
  }



  // Update item field handler
  const handleSaveField = async (updatedFields: Partial<ItemType>) => {
    // Prepare patched fields for optimistic update (e.g. map labels IDs back to full label objects)
    let patchedFields = { ...updatedFields };
    if (updatedFields.labels) {
      patchedFields.labels = updatedFields.labels.map((lblId: any) => {
        const found = allLabels.find((al: any) => al._id === lblId);
        return found ? found : { _id: lblId, name: lblId, color: "#64748b" };
      });
    }

    // 1. OPTIMISTIC CACHE UPDATE (0ms delay for fields like status, assignee, priority, checklist, title, desc, storyPoints, dates, milestone)
    const boardPatch = item.board
      ? dispatch(
        backendApi.util.updateQueryData("getBoardItems", item.board, (draft) => {
          const idx = draft.items.findIndex((i) => i._id === item._id);
          if (idx !== -1) {
            draft.items[idx] = { ...draft.items[idx], ...patchedFields };
          }
        })
      )
      : null;

    const itemPatch = dispatch(
      backendApi.util.updateQueryData("getItem", itemId, (draft) => {
        if (draft?.item) {
          draft.item = { ...draft.item, ...patchedFields };
        }
      })
    );

    try {
      const res = await updateItem({ id: item._id, body: updatedFields }).unwrap();
      if (onItemUpdated) {
        onItemUpdated(res.item);
      }
    } catch (error) {
      console.error("Failed to update item, rolling back cache:", error);
      if (boardPatch) boardPatch.undo();
      itemPatch.undo();
    }
  };

  const handlePostComment = async (text: string) => {
    if (!text.trim()) return;
    try {
      const res = await updateItem({
        id: item._id,
        body: { commentText: text.trim() } as any
      }).unwrap();
      if (onItemUpdated) {
        onItemUpdated(res.item);
      }
    } catch (error) {
      console.error("Failed to post comment:", error);
    }
  };


  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm("Are you sure you want to delete this comment?")) return;
    const updated = (item.comments || []).filter((c: any) => c._id !== commentId);
    handleSaveField({ comments: updated });
  };

  const handleStartEditComment = (commentId: string, currentText: string) => {
    setEditingCommentId(commentId);
    setEditingCommentText(currentText);
  };

  const handleSaveEditComment = async (commentId: string) => {
    if (!editingCommentText.trim()) return;
    const updated = (item.comments || []).map((c: any) =>
      c._id === commentId ? { ...c, text: editingCommentText.trim() } : c
    );
    handleSaveField({ comments: updated });
    setEditingCommentId(null);
    setEditingCommentText("");
  };

  const handleToggleCheckItem = (id: string) => {
    const updated = checklist.map((c) => {
      const cId = c._id || c.id;
      return cId === id ? { ...c, completed: !c.completed } : c;
    });
    setChecklist(updated);
    handleSaveField({ checklist: updated });

    // Apple-style complete celebration trigger
    const total = updated.length;
    const completed = updated.filter((c) => c.completed).length;
    if (total > 0 && completed === total) {
      triggerConfetti();
    }
  };

  const handleRemoveCheckItem = (id: string) => {
    const updated = checklist.filter((c) => {
      const cId = c._id || c.id;
      return cId !== id;
    });
    setChecklist(updated);
    handleSaveField({ checklist: updated });
  };

  const handleAddAttachment = () => {
    if (!newAttachment.trim()) return;
    const updated = [...attachments, newAttachment.trim()];
    setAttachments(updated);
    setNewAttachment("");
    setShowAttachInput(false);
    handleSaveField({ attachments: updated });
  };

  const handleRemoveAttachment = (idx: number) => {
    const updated = attachments.filter((_, i) => i !== idx);
    setAttachments(updated);
    handleSaveField({ attachments: updated });
  };

  const handleDeleteItem = async () => {
    if (!window.confirm("Are you sure you want to permanently delete this issue?")) return;
    try {
      await deleteItem(item._id).unwrap();

      // Update store cache
      if (item.board) {
        dispatch(
          backendApi.util.updateQueryData("getBoardItems", item.board, (draft) => {
            draft.items = draft.items.filter((i) => i._id !== item._id);
          })
        );
      }

      if (onItemDeleted) {
        onItemDeleted(item._id);
      }
      if (onClose) {
        onClose();
      } else {
        navigate("/");
      }
    } catch (error) {
      console.error("Failed to delete item:", error);
    }
  };

  const handleCopyLink = () => {
    // Generate a shareable URL that encodes workspace + board + item so
    // the recipient lands on the exact item without losing navigation context.
    const url = workspace?._id && board?._id
      ? `${window.location.origin}/workspace/${workspace._id}/board/${board._id}/item/${item._id}`
      : `${window.location.origin}/item/${item._id}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleDuplicateCard = async () => {
    if (!item.board) return;
    setSaving(true);
    try {
      const res = await createItem({
        boardId: item.board,
        body: {
          title: `${item.title} (copy)`,
          columnId: item.columnId,
          type: item.type,
          priority: item.priority,
          assignee: item.assignee || undefined,
          dueDate: item.dueDate || undefined,
          description: item.description || undefined,
        },
      }).unwrap();
      // Update board cache
      dispatch(
        backendApi.util.updateQueryData("getBoardItems", item.board, (draft) => {
          draft.items.push(res.item);
        })
      );
    } catch (err) {
      console.error("Failed to duplicate card:", err);
    } finally {
      setSaving(false);
    }
  };

  const completedChecklistCount = checklist.filter((c) => c.completed).length;
  const checklistProgress = checklist.length > 0 ? Math.round((completedChecklistCount / checklist.length) * 100) : 0;

  // Find column name (status)
  const currentColumn = board?.columns.find((col) => col.id === item.columnId);
  const statusLabel = currentColumn?.name || item.status || "To Do";

  // Check if due date is overdue
  const isOverdue = item.dueDate && new Date(item.dueDate) < new Date() && !statusLabel.toLowerCase().includes("done");

  return (
    <div className="flex flex-col h-full min-h-0 bg-card text-card-foreground text-[#172b4d] font-sans selection:bg-[#deebff] selection:text-[#0747a6] relative">

      {/* Apple Canvas Confetti Celebration overlay */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none z-50 w-full h-full"
      />

      {/* Jira Top Header / Breadcrumbs Area */}
      <div className="flex items-center justify-between px-6 py-2.5 border-b border-border bg-card text-card-foreground shrink-0 select-none">

        {/* Left Side: Type Icon, Epic Tag, Issue Key */}
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          {!isModal && (
            <button
              onClick={() => navigate(-1)}
              className="p-1 hover:bg-muted rounded mr-1.5 flex items-center gap-1 text-muted-foreground cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back</span>
            </button>
          )}
          <span className="p-1 hover:bg-muted rounded cursor-pointer flex items-center gap-1 text-foreground/90">
            <span className="hover:underline font-medium pl-0.5">{board?.name}</span>
          </span>
          <span>/</span>
          {typeConfig[item.type].icon}
          <span onClick={() => navigate(`/workspace/${workspace?._id}/board/${board?._id}/item/${item._id}`)} className="hover:underline cursor-pointer text-[#0052cc] font-extrabold flex items-center gap-1">
            <span>{item.type.toUpperCase()}-{item._id.slice(-5).toUpperCase()}</span>
          </span>
        </div>

        {/* Right Side toolbar buttons */}
        <div className="flex items-center gap-1 text-zinc-550">
          {saving && (
            <span className="text-xs text-muted-foreground italic animate-pulse mr-2">
              Saving...
            </span>
          )}

          <button onClick={handleCopyLink} className="p-1.5 hover:bg-muted rounded cursor-pointer" title="Share link">
            {copiedLink ? <Check className="h-4.5 w-4.5 text-emerald-600" /> : <Share2 className="h-4.5 w-4.5" />}
          </button>
          <button onClick={handleDeleteItem} className="p-1.5 hover:bg-muted rounded text-red-500 cursor-pointer" title="Delete issue">
            <Trash2 className="h-4.5 w-4.5" />
          </button>
          {isModal && onClose && (
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-muted rounded transition-colors text-muted-foreground cursor-pointer ml-1"
            >
              <X className="h-4.5 w-4.5 stroke-[2]" />
            </button>
          )}
        </div>
      </div>

      {/* Main Grid View */}
      <div className="flex-grow flex flex-col lg:flex-row h-full min-h-0 overflow-y-auto lg:overflow-hidden bg-card">
        {/* Left Side: Summary, Description, Subtasks, Activity */}
        <div className="flex-1 overflow-y-auto h-auto lg:h-full px-4 lg:px-8 py-4 lg:py-6 space-y-6 min-h-0">

          {/* Title / Summary */}
          <div className="group relative">
            <TitleInput initialTitle={title} onSave={(newTitle) => handleSaveField({ title: newTitle })} />
          </div>

          {/* Mobile-Only Compact Details panel */}
          <div className="block lg:hidden border border-border rounded-2xl p-4 bg-muted/40 space-y-3.5 shadow-sm">
            {/* Status */}
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-bold text-muted-foreground">Status</span>
              <div className="w-48 shrink-0">
                {board?.columns && board.columns.length > 0 ? (
                  <Select
                    value={item.columnId}
                    onValueChange={(val) => {
                      handleSaveField({ columnId: val });
                      const targetColumn = board.columns.find((col) => col.id === val);
                      if (targetColumn) {
                        const lower = targetColumn.name.toLowerCase();
                        if (lower.includes("done") || lower.includes("complete") || lower.includes("resolved")) {
                          triggerConfetti();
                        }
                      }
                    }}
                  >
                    <SelectTrigger className="h-8 border border-border focus:ring-0 rounded-xl w-full cursor-pointer transition-all px-3 bg-card text-card-foreground hover:bg-background shadow-none font-bold text-xs">
                      <SelectValue placeholder={statusLabel} />
                    </SelectTrigger>
                    <SelectContent>
                      {board.columns.map((col) => (
                        <SelectItem key={col.id} value={col.id} className="cursor-pointer">
                          <StatusIndicator status={col.name} />
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="py-1.5 px-3 bg-muted text-foreground rounded-xl font-bold flex-1 text-xs">
                    <StatusIndicator status={statusLabel} />
                  </div>
                )}
              </div>
            </div>

            {/* Assignee */}
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-bold text-muted-foreground">Assignee</span>
              <div className="flex items-center gap-2 w-48 shrink-0">
                <Avatar className="h-6 w-6 border border-border shrink-0">
                  <AvatarFallback className="text-[10px] bg-muted text-muted-foreground font-bold">
                    {item.assignee ? (() => {
                      const resolvedName = localEmailToNameRecord[item.assignee.toLowerCase().trim()] || item.assignee;
                      return resolvedName.split(" ").map((s: string) => s[0]).join("").toUpperCase().slice(0, 2);
                    })() : '👤'}
                  </AvatarFallback>
                </Avatar>
                <Select
                  value={item.assignee || "unassigned"}
                  onValueChange={(val) => {
                    const newAssignee = val === "unassigned" ? "" : val;
                    handleSaveField({ assignee: newAssignee });
                  }}
                >
                  <SelectTrigger className="h-7 border-none bg-transparent hover:bg-muted text-foreground text-xs font-bold focus:ring-0 w-full rounded-md cursor-pointer transition-all shadow-none px-1">
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned" className="cursor-pointer">Unassigned</SelectItem>
                    {memberEmails.map((email) => {
                      const resolvedName = localEmailToNameRecord[email.toLowerCase().trim()] || email;
                      return (
                        <SelectItem key={email} value={email} className="cursor-pointer">
                          {resolvedName}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Priority */}
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-bold text-muted-foreground">Priority</span>
              <div className="w-48 shrink-0">
                <Select
                  value={item.priority}
                  onValueChange={(val: ItemPriorityClass) => handleSaveField({ priority: val })}
                >
                  <SelectTrigger className="h-7 border-none bg-transparent hover:bg-muted text-foreground text-xs font-bold focus:ring-0 rounded-md w-full cursor-pointer transition-all shadow-none px-1">
                    <SelectValue placeholder={item.priority} />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p} className="cursor-pointer">
                        <PriorityIndicator priority={p} />
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Due Date */}
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-bold text-muted-foreground">Due Date</span>
              <div className="w-48 shrink-0 flex items-center justify-end">
                {item.dueDate ? (
                  <Badge
                    variant="outline"
                    className={`h-7 px-2.5 text-xs font-bold flex items-center gap-1 bg-card text-card-foreground cursor-pointer rounded-md ${isOverdue ? "border-red-300 text-red-655 bg-red-50/50" : "border-border text-foreground/90"}`}
                    onClick={() => handleSaveField({ dueDate: null })}
                  >
                    <Calendar className="h-3.5 w-3.5" />
                    <span>
                      {new Date(item.dueDate).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                    <X className="h-3 w-3 ml-1 text-muted-foreground" />
                  </Badge>
                ) : (
                  <Input
                    type="date"
                    onChange={(e) => handleSaveField({ dueDate: e.target.value ? e.target.value : null })}
                    className="h-7 border-none bg-transparent hover:bg-muted text-foreground text-xs px-1 rounded-md cursor-pointer focus:ring-0 w-full text-right"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Subheader button toggles */}
          <div className="flex gap-2 relative">

            {/* Plus dropdown trigger */}
            <div ref={plusDropdownRef} className="relative">
              <button
                onClick={() => setShowPlusDropdown((v) => !v)}
                className="flex items-center gap-1 px-2.5 py-1.5 border border-border rounded-md hover:bg-muted text-muted-foreground text-xs font-bold shrink-0 cursor-pointer transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add</span>
                <ChevronDown className="h-3 w-3 ml-0.5 text-muted-foreground" />
              </button>

              {showPlusDropdown && (
                <div className="absolute top-full left-0 mt-1.5 z-50 w-52 bg-card text-card-foreground border border-border rounded-xl shadow-xl overflow-hidden py-1 animate-in fade-in slide-in-from-top-1 duration-100">

                  {/* New Subtask */}
                  <button
                    onClick={() => {
                      setShowPlusDropdown(false);
                      setTimeout(() => {
                        const input = document.getElementById("add-subtask-input") as HTMLInputElement;
                        if (input) {
                          input.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          input.focus();
                        }
                      }, 50);
                    }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-foreground/90 hover:bg-background transition-colors cursor-pointer"
                  >
                    <CheckSquare className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                    New subtask
                  </button>

                  {/* Duplicate Card */}
                  <button
                    onClick={() => {
                      setShowPlusDropdown(false);
                      handleDuplicateCard();
                    }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-foreground/90 hover:bg-background transition-colors cursor-pointer"
                  >
                    <Copy className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                    Duplicate card
                  </button>

                  <div className="border-t border-border my-1" />

                  {/* New Attachment */}
                  <button
                    onClick={() => {
                      setShowPlusDropdown(false);
                      setShowAttachInput(true);
                      setTimeout(() => {
                        attachSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }, 50);
                    }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-foreground/90 hover:bg-background transition-colors cursor-pointer"
                  >
                    <Paperclip className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    New attachment
                  </button>

                  {/* New Comment */}
                  <button
                    onClick={() => {
                      setShowPlusDropdown(false);
                      setActivityTab('comments');
                      setTimeout(() => {
                        commentSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        commentSectionRef.current?.focus();
                      }, 80);
                    }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-foreground/90 hover:bg-background transition-colors cursor-pointer"
                  >
                    <MessageSquare className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                    New comment
                  </button>

                </div>
              )}
            </div>

            <button className="flex items-center justify-center px-2.5 py-1.5 border border-border rounded-md hover:bg-muted text-muted-foreground text-sm shrink-0 cursor-pointer font-bold leading-none">
              ···
            </button>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <h4 className="text-sm font-bold text-[#172b4d]">Description</h4>
            <DescriptionEditor
              initialDescription={description}
              onSave={(newDesc) => handleSaveField({ description: newDesc })}
            />
          </div>

          {/* Subtasks Section */}
          <div ref={subtaskSectionRef} className="space-y-3">
            <div className="flex items-center justify-between border-b border-border/80 pb-1.5 select-none">
              <div className="flex items-center gap-1.5">
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-sm font-bold text-foreground">Subtasks</h4>
              </div>
              {checklist.length > 0 && (
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-muted-foreground">
                    {checklistProgress}% Completed
                  </span>
                </div>
              )}
            </div>

            {/* Checklist progress bar */}
            {checklist.length > 0 && (
              <div className="flex items-center gap-3 pr-1">
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-300"
                    style={{ width: `${checklistProgress}%` }}
                  />
                </div>
                <span className="text-[10px] font-bold text-muted-foreground shrink-0">{completedChecklistCount}/{checklist.length}</span>
              </div>
            )}

            {/* Subtasks List – Apple Reminders/Notes Style */}
            <div className="space-y-1">
              {checklist.map((task) => (
                <SubtaskItem
                  key={task._id || task.id}
                  task={task}
                  onToggle={handleToggleCheckItem}
                  onDelete={handleRemoveCheckItem}
                  onTextSave={(taskId, newText) => {
                    if (!newText.trim()) {
                      handleRemoveCheckItem(taskId);
                    } else {
                      const updated = checklist.map((c) => {
                        const cId = c._id || c.id;
                        return cId === taskId ? { ...c, text: newText.trim() } : c;
                      });
                      setChecklist(updated);
                      handleSaveField({ checklist: updated });
                    }
                  }}
                />
              ))}

              <NewSubtaskInput
                onAdd={(text) => {
                  const newItem = {
                    id: Math.random().toString(36).substring(2, 9),
                    text: text.trim(),
                    completed: false,
                  };
                  const updated = [...checklist, newItem];
                  setChecklist(updated);
                  handleSaveField({ checklist: updated });
                }}
              />
            </div>
          </div>

          {/* Attachments Section */}
          <div ref={attachSectionRef} className="space-y-2">
            <div className="flex items-center justify-between border-b pb-1 select-none">
              <div className="flex items-center gap-2">
                <Paperclip className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-sm font-bold text-[#172b4d]">Attachments</h4>
              </div>
              <button
                onClick={() => setShowAttachInput((v) => !v)}
                title="Add attachment"
                className="p-1 hover:bg-muted rounded text-muted-foreground cursor-pointer"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {/* Attachment chips */}
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {attachments.map((att, idx) => {
                  const isUrl = att.startsWith("http://") || att.startsWith("https://");
                  const displayName = isUrl
                    ? att.replace(/^https?:\/\//, "").split("/")[0]
                    : att.split("/").pop() || att;
                  return (
                    <div
                      key={idx}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 border border-border rounded-lg bg-background text-xs text-foreground/90 group hover:border-border transition-colors"
                    >
                      {isUrl ? (
                        <Link className="h-3 w-3 text-blue-500 shrink-0" />
                      ) : (
                        <Paperclip className="h-3 w-3 text-muted-foreground shrink-0" />
                      )}
                      {isUrl ? (
                        <a
                          href={att}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-blue-600 hover:underline max-w-[160px] truncate"
                        >
                          {displayName}
                        </a>
                      ) : (
                        <span className="font-semibold max-w-[160px] truncate">{displayName}</span>
                      )}
                      <button
                        onClick={() => handleRemoveAttachment(idx)}
                        className="ml-0.5 text-muted-foreground hover:text-red-500 transition-colors cursor-pointer"
                        title="Remove attachment"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add attachment input */}
            {showAttachInput && (
              <div className="flex items-center gap-2 p-2.5 border border-blue-200 bg-blue-50/50 rounded-lg">
                <Paperclip className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                <input
                  autoFocus
                  type="text"
                  placeholder="Paste a URL or file name..."
                  value={newAttachment}
                  onChange={(e) => setNewAttachment(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddAttachment();
                    else if (e.key === "Escape") { setShowAttachInput(false); setNewAttachment(""); }
                  }}
                  className="flex-1 bg-transparent border-none outline-none focus:ring-0 text-xs text-foreground placeholder:text-muted-foreground"
                />
                <button
                  onClick={handleAddAttachment}
                  className="text-[10px] font-bold px-3 py-1 rounded-full bg-[#0052cc] text-white hover:bg-[#0065ff] cursor-pointer shrink-0"
                >
                  Attach
                </button>
                <button
                  onClick={() => { setShowAttachInput(false); setNewAttachment(""); }}
                  className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-muted text-muted-foreground hover:bg-muted cursor-pointer shrink-0"
                >
                  Cancel
                </button>
              </div>
            )}

            {attachments.length === 0 && !showAttachInput && (
              <button
                onClick={() => setShowAttachInput(true)}
                className="text-xs text-[#0052cc] hover:underline font-bold cursor-pointer pl-1"
              >
                + Add attachment
              </button>
            )}
          </div>



          <Separator />

          {/* Activity Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-1">
              <div className="flex items-center gap-2 select-none">
                <span className="text-xs font-bold text-[#5e6c84] uppercase tracking-wide">
                  Activity
                </span>
                <div className="flex gap-1.5 ml-4">
                  <button className="px-2 py-0.5 bg-muted hover:bg-muted text-foreground/90 text-[10px] font-bold rounded">
                    All
                  </button>
                  <button
                    onClick={() => setActivityTab('comments')}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded transition-all cursor-pointer ${activityTab === 'comments'
                      ? 'bg-[#deebff] text-[#0747a6]'
                      : 'text-muted-foreground hover:bg-muted'
                      }`}
                  >
                    Comments
                  </button>
                  <button
                    onClick={() => setActivityTab('history')}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded transition-all cursor-pointer ${activityTab === 'history'
                      ? 'bg-[#deebff] text-[#0747a6]'
                      : 'text-muted-foreground hover:bg-muted'
                      }`}
                  >
                    History
                  </button>

                </div>
              </div>
            </div>

            {activityTab === 'comments' ? (
              <div className="space-y-4">
                {/* List Comments */}
                <div className="space-y-4">
                  {item.comments?.map((comment, index) => {
                    const initials = comment.authorName
                      ? comment.authorName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
                      : "U";
                    const isAuthor = comment.authorEmail?.toLowerCase().trim() === user?.email?.toLowerCase().trim();
                    const isEditing = editingCommentId === comment._id;

                    return (
                      <div key={comment._id || index} className="flex gap-3 text-sm">
                        <Avatar className="h-8 w-8 border border-border shrink-0">
                          <AvatarFallback className="bg-blue-50 text-[#0052cc] text-xs font-extrabold">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[#172b4d]">{comment.authorName}</span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(comment.createdAt).toLocaleDateString()} at{" "}
                              {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          {isEditing ? (
                            <div className="space-y-2">
                              <Textarea
                                value={editingCommentText}
                                onChange={(e) => setEditingCommentText(e.target.value)}
                                className="min-h-[60px] resize-none border-blue-500 focus-visible:ring-1 focus-visible:ring-blue-500 text-xs bg-card text-card-foreground"
                              />
                              <div className="flex gap-2">
                                <Button
                                  onClick={() => handleSaveEditComment(comment._id || "")}
                                  size="sm"
                                  className="bg-[#0052cc] hover:bg-[#0065ff] text-white font-bold h-6 text-[10px] px-2.5"
                                >
                                  Save
                                </Button>
                                <Button
                                  onClick={() => setEditingCommentId(null)}
                                  variant="ghost"
                                  size="sm"
                                  className="hover:bg-muted font-bold h-6 text-[10px] px-2.5"
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <p className="text-foreground/90 leading-relaxed bg-[#f4f5f7] p-2.5 rounded-lg border border-border text-xs whitespace-pre-wrap">
                                {comment.text}
                              </p>
                              {isAuthor && (
                                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground pl-1 select-none">
                                  <button
                                    onClick={() => handleStartEditComment(comment._id || "", comment.text)}
                                    className="hover:underline hover:text-blue-600 cursor-pointer"
                                  >
                                    Edit
                                  </button>
                                  <span>·</span>
                                  <button
                                    onClick={() => handleDeleteComment(comment._id || "")}
                                    className="hover:underline hover:text-red-600 cursor-pointer"
                                  >
                                    Delete
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Add Comment Input */}
                <div ref={commentSectionRef}>
                  <CommentInputSection
                    user={user}
                    workspaceMembers={workspaceMembers}
                    onPostComment={handlePostComment}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4 pt-1">
                {(!historyData?.activities || historyData.activities.length === 0) ? (
                  <p className="text-sm text-muted-foreground italic">No history recorded yet.</p>
                ) : (
                  historyData.activities.map((act: any) => {
                    const fallback = act.actorId?.name
                      ? act.actorId.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
                      : "U";
                    return (
                      <div key={act._id} className="flex gap-3 text-sm">
                        <Avatar className="h-8 w-8 border border-border shrink-0">
                          <AvatarFallback className="bg-muted text-muted-foreground text-xs font-bold">
                            {fallback}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-0.5">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-foreground">
                              {act.actorId?.name || act.actorId?.email || 'System'}
                            </span>
                            <span className="text-xs text-zinc-450">
                              {new Date(act.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <div className="text-muted-foreground text-xs">
                            {renderHistoryText(act, localEmailToNameRecord)}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Status and Details Sidebar (Jira Cloud style) */}
        <div className="hidden lg:flex lg:w-96 border-t lg:border-t-0 lg:border-l border-border bg-card text-card-foreground p-4 lg:p-6 flex-col shrink-0">
          {/* Status Dropdown + Action triggers */}
          <div className="flex items-center pb-3">

            {board?.columns && board.columns.length > 0 ? (
              <Select
                value={item.columnId}
                onValueChange={(val) => {
                  handleSaveField({ columnId: val });
                  const targetColumn = board.columns.find((col) => col.id === val);
                  if (targetColumn) {
                    const lower = targetColumn.name.toLowerCase();
                    if (lower.includes("done") || lower.includes("complete") || lower.includes("resolved")) {
                      triggerConfetti();
                    }
                  }
                }}
              >
                <SelectTrigger className="h-8 border border-border focus:ring-0 rounded-xl w-full cursor-pointer transition-all px-3 bg-card text-card-foreground hover:bg-background shadow-none font-bold text-xs">
                  <div className="flex items-center gap-1.5">
                    <SelectValue placeholder={statusLabel} />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {board.columns.map((col) => (
                    <SelectItem key={col.id} value={col.id} className="cursor-pointer">
                      <StatusIndicator status={col.name} />
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="py-2 px-3 bg-muted text-foreground rounded font-bold flex-1">
                <StatusIndicator status={statusLabel} />
              </div>
            )}

            {/* Future Need */}
            {/* <button className="h-8 w-8 flex items-center justify-center border hover:bg-background rounded-md text-muted-foreground cursor-pointer">
              <Bolt className="h-4 w-4" />
            </button> */}
            {/* <button className="h-8 border hover:bg-background rounded-md px-2.5 font-bold text-xs text-muted-foreground cursor-pointer flex items-center gap-1">
              <Plus className="h-3.5 w-3.5" />
              <span>Improve Story</span>
            </button> */}
          </div>

          {/* Details Accordion Panel */}
          <div className="border border-border rounded-lg overflow-hidden bg-card text-card-foreground">

            {/* Details Header Accordion Trigger */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-muted/50 border-b select-none">
              <div className="flex items-center gap-1.5">
                <ChevronDown className="h-4.5 w-4.5 text-muted-foreground" />
                <span className="font-bold text-[#172b4d] text-xs">Details</span>
              </div>
              <button className="p-0.5 hover:bg-muted rounded text-zinc-550 cursor-pointer">
                <Settings className="h-4 w-4" />
              </button>
            </div>

            {/* Details grid list */}
            <div className="p-4 grid grid-cols-[120px_1fr] items-center gap-y-3.5 text-xs">
              {/* Assignee */}
              <span className="text-[#5e6c84] font-semibold text-xs">Assignee</span>
              <div className="flex flex-col gap-1 w-full">
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6 border border-border shrink-0">
                    <AvatarFallback className="text-[10px] bg-muted text-muted-foreground font-bold">
                      {item.assignee ? (() => {
                        const resolvedName = localEmailToNameRecord[item.assignee.toLowerCase().trim()] || item.assignee;
                        return resolvedName.split(" ").map((s: string) => s[0]).join("").toUpperCase().slice(0, 2);
                      })() : '👤'}
                    </AvatarFallback>
                  </Avatar>
                  <Select
                    value={item.assignee || "unassigned"}
                    onValueChange={(val) => {
                      const newAssignee = val === "unassigned" ? "" : val;
                      handleSaveField({ assignee: newAssignee });
                    }}
                  >
                    <SelectTrigger className="h-7 border-none bg-transparent hover:bg-muted text-foreground text-xs font-bold focus:ring-0 w-full rounded-md cursor-pointer transition-all shadow-none px-1">
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned" className="cursor-pointer">Unassigned</SelectItem>
                      {memberEmails.map((email) => {
                        const resolvedName = localEmailToNameRecord[email.toLowerCase().trim()] || email;
                        return (
                          <SelectItem key={email} value={email} className="cursor-pointer">
                            {resolvedName}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                {!item.assignee && (
                  <button
                    onClick={() => handleSaveField({ assignee: user?.email || "" })}
                    className="text-[#0052cc] hover:underline text-[10px] font-bold text-left ml-8 cursor-pointer"
                  >
                    Assign to me
                  </button>
                )}
              </div>



              {/* Priority */}
              <span className="text-[#5e6c84] font-semibold text-xs">Priority</span>
              <Select
                value={item.priority}
                onValueChange={(val: ItemPriorityClass) => handleSaveField({ priority: val })}
              >
                <SelectTrigger className="h-7 border-none bg-transparent hover:bg-muted text-foreground text-xs font-bold focus:ring-0 rounded-md w-full cursor-pointer transition-all shadow-none px-1">
                  <div className="flex items-center gap-1.5">

                    <SelectValue placeholder={item.priority} />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p} className="cursor-pointer">
                      <PriorityIndicator priority={p} />
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>



              {/* Due Date */}
              <span className="text-[#5e6c84] font-semibold text-xs">Due date</span>
              <div className="flex items-center gap-1.5 w-full">
                {item.dueDate ? (
                  <Badge
                    variant="outline"
                    className={`h-7 px-2.5 text-xs font-bold flex items-center gap-1 bg-card text-card-foreground cursor-pointer rounded-md ${isOverdue ? "border-red-300 text-red-650 bg-red-50/50 shadow-xs shadow-red-50" : "border-border text-foreground/90"
                      }`}
                    onClick={() => handleSaveField({ dueDate: null })}
                  >
                    <Calendar className="h-3.5 w-3.5" />
                    <span>
                      {new Date(item.dueDate).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                    <X className="h-3 w-3 ml-1 text-muted-foreground hover:text-foreground/90" />
                  </Badge>
                ) : (
                  <Input
                    type="date"
                    onChange={(e) => handleSaveField({ dueDate: e.target.value ? e.target.value : null })}
                    className="h-7 border-none bg-transparent hover:bg-muted text-foreground text-xs px-1 rounded-md cursor-pointer focus:ring-0 max-w-32"
                  />
                )}
              </div>

              {/* Milestone */}
              <span className="text-[#5e6c84] font-semibold text-xs">Milestone</span>
              <div className="flex items-center gap-1.5 w-full">
                <Select
                  value={item.milestone_id || "none"}
                  onValueChange={(val) => {
                    const newMilestoneId = val === "none" ? null : val;
                    handleSaveField({ milestone_id: newMilestoneId } as any);
                  }}
                >
                  <SelectTrigger className="h-7 border-none bg-transparent hover:bg-muted text-foreground text-xs font-bold focus:ring-0 w-full rounded-md cursor-pointer transition-all shadow-none px-1">
                    <SelectValue placeholder="No Milestone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" className="cursor-pointer">No Milestone</SelectItem>
                    {milestonesData?.milestones?.map((m: any) => (
                      <SelectItem key={m._id} value={m._id} className="cursor-pointer">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: m.color }}
                          />
                          <span>{m.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Labels */}
              <span className="text-[#5e6c84] font-semibold text-xs">Labels</span>
              <div className="flex flex-wrap gap-1.5 items-center min-h-7 pl-1">
                {item.labels && item.labels.length > 0 ? (
                  item.labels.map((l: any) => {
                    const labelId = getLabelId(l);
                    const labelName = l.name || l;
                    const labelColor = l.color || "#64748b";
                    return (
                      <Badge
                        key={labelId}
                        variant="outline"
                        className="h-6 px-2 text-xs font-semibold flex items-center gap-1.5 text-white border-none rounded-md"
                        style={{ backgroundColor: labelColor }}
                      >
                        <span>{labelName}</span>
                        <X
                          className="h-3 w-3 text-white/80 hover:text-white cursor-pointer"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const updated = item.labels
                              ? item.labels.filter((itemL: any) => getLabelId(itemL) !== labelId).map((itemL: any) => getLabelId(itemL))
                              : [];
                            handleSaveField({ labels: updated });
                          }}
                        />
                      </Badge>
                    );
                  })
                ) : (
                  <span className="text-muted-foreground italic text-[11px]">None</span>
                )}

                <Popover>
                  <PopoverTrigger asChild>
                    <button className="text-[#0052cc] hover:underline text-xs font-bold cursor-pointer ml-1 select-none">
                      {(item.labels && item.labels.length > 0) ? "+ Add/Edit" : "+ Edit Labels"}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-60 bg-card text-card-foreground border border-border shadow-xl rounded-xl p-3 text-xs">
                    <div className="font-bold text-foreground mb-2 select-none">Task Labels</div>

                    {/* Search labels */}
                    <input
                      type="text"
                      placeholder="Search or filter..."
                      value={labelSearch}
                      onChange={(e) => setLabelSearch(e.target.value)}
                      className="w-full border border-border rounded-lg px-2.5 py-1.5 mb-2 focus:outline-none focus:border-primary/50 font-semibold"
                    />

                    <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                      {filteredLabelsForPopover.length === 0 ? (
                        <div className="text-muted-foreground italic text-center py-4 select-none">No labels found</div>
                      ) : (
                        filteredLabelsForPopover.map((l: any) => {
                          const isChecked = item.labels?.some((itemL: any) => getLabelId(itemL) === l._id);
                          return (
                            <div
                              key={l._id}
                              className="flex items-center justify-between px-2 py-1 hover:bg-background rounded-lg group text-xs font-semibold text-foreground/90"
                            >
                              <label className="flex items-center gap-2 cursor-pointer select-none flex-1 min-w-0 py-0.5">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                    let updated = [];
                                    if (isChecked) {
                                      updated = item.labels
                                        ? item.labels.filter((itemL: any) => getLabelId(itemL) !== l._id).map((itemL: any) => getLabelId(itemL))
                                        : [];
                                    } else {
                                      const current = item.labels ? item.labels.map((itemL: any) => getLabelId(itemL)) : [];
                                      updated = [...current, l._id];
                                    }
                                    handleSaveField({ labels: updated });
                                  }}
                                  className="w-3.5 h-3.5 text-primary border-border rounded focus:ring-indigo-500 cursor-pointer"
                                />
                                <span
                                  className="w-2.5 h-2.5 rounded-full shrink-0"
                                  style={{ backgroundColor: l.color }}
                                />
                                <span className="truncate">{l.name}</span>
                              </label>

                              {/* Delete workspace label */}
                              <button
                                onClick={async (e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (window.confirm(`Are you sure you want to permanently delete label "${l.name}"?`)) {
                                    try {
                                      await deleteLabel(l._id).unwrap();
                                    } catch (err) {
                                      console.error("Failed to delete label:", err);
                                    }
                                  }
                                }}
                                className="opacity-0 group-hover:opacity-100 hover:text-red-500 text-muted-foreground p-0.5 rounded cursor-pointer transition-opacity shrink-0"
                                title="Delete label from workspace"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Inline Create Label */}
                    {labelSearch.trim() && !allLabels.some((lbl: any) => lbl.name.toLowerCase().trim() === labelSearch.toLowerCase().trim()) && (
                      <button
                        onClick={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (!workspace?._id) return;
                          try {
                            const res = await createLabel({
                              workspaceId: workspace._id,
                              name: labelSearch.trim(),
                              color: "#3b82f6"
                            }).unwrap();
                            const newLbl = res.label;
                            const current = item.labels ? item.labels.map((itemL: any) => itemL._id || itemL) : [];
                            const updated = [...current, newLbl._id];
                            handleSaveField({ labels: updated });
                            setLabelSearch("");
                          } catch (err) {
                            console.error(err);
                          }
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-2 hover:bg-primary/10 text-primary rounded-lg cursor-pointer text-left font-bold text-xs border border-dashed border-primary/25 mt-2.5 transition-colors"
                      >
                        <Plus className="h-3.5 w-3.5 shrink-0" />
                        <span>Create label "{labelSearch.trim()}"</span>
                      </button>
                    )}
                  </PopoverContent>
                </Popover>
              </div>



              {/* Start Date */}
              <span className="text-[#5e6c84] font-semibold text-xs">Start date</span>
              <Input
                type="date"
                value={item.startDate ? new Date(item.startDate).toISOString().slice(0, 10) : ""}
                onChange={(e) => handleSaveField({ startDate: e.target.value ? e.target.value : null })}
                className="h-7 border-none bg-transparent hover:bg-muted text-foreground text-xs px-1 rounded-md cursor-pointer focus:ring-0 max-w-32"
              />


              {/* Story Point Estimate */}
              <span className="text-[#5e6c84] font-semibold text-xs">Story point estimate</span>
              <Input
                type="number"
                value={item.storyPoints !== undefined && item.storyPoints !== null ? item.storyPoints : ""}
                onChange={(e) => {
                  const val = e.target.value === "" ? null : parseInt(e.target.value, 10);
                  handleSaveField({ storyPoints: val } as any);
                }}
                className="h-7 border-none bg-transparent hover:bg-muted text-foreground text-xs px-1 rounded-md cursor-pointer focus:ring-0 max-w-16 font-extrabold focus:bg-card text-card-foreground focus:border-border"
                placeholder="None"
              />



            </div>
          </div>



          {/* Audit Timestamps */}
          <div className="pt-2 pl-1.5 space-y-1 text-[11px] text-muted-foreground select-none">
            <div>Created {new Date(item.createdAt).toLocaleDateString([], { day: "numeric", month: "long", year: "numeric" })} at {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        </div>

      </div>
    </div>
  );
}

// History parsing helper function
function renderHistoryText(act: any, emailToNameMap?: Record<string, string>) {
  const type = act.actionType;
  const oldVal = act.oldValue;
  const newVal = act.newValue;

  const pill = "inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-muted text-foreground mx-1 border";

  switch (type) {
    case 'TASK_CREATED':
      return <span>created the issue.</span>;
    case 'TASK_DELETED':
      return <span>deleted the issue.</span>;
    case 'TITLE_CHANGED':
      return (
        <span>
          changed title from <span className="font-semibold text-foreground">"{oldVal}"</span> to <span className="font-semibold text-zinc-850">"{newVal}"</span>.
        </span>
      );
    case 'DESCRIPTION_CHANGED':
      return <span className="italic text-muted-foreground">updated the issue description.</span>;
    case 'STATUS_CHANGED':
      return (
        <span>
          moved status from <span className={pill}>{oldVal || 'None'}</span> to <span className={pill}>{newVal}</span>.
        </span>
      );
    case 'PRIORITY_CHANGED':
      return (
        <span>
          changed priority from <span className={pill}>{oldVal}</span> to <span className={pill}>{newVal}</span>.
        </span>
      );
    case 'TASK_ASSIGNED': {
      const resolvedNew = (emailToNameMap && newVal && emailToNameMap[newVal.toLowerCase().trim()]) || newVal;
      return (
        <span>
          assigned issue to <span className="font-bold text-foreground">{resolvedNew}</span>.
        </span>
      );
    }
    case 'TASK_UNASSIGNED': {
      const resolvedOld = (emailToNameMap && oldVal && emailToNameMap[oldVal.toLowerCase().trim()]) || oldVal;
      return (
        <span>
          removed assignee (previously <span className="text-muted-foreground font-medium">{resolvedOld}</span>).
        </span>
      );
    }
    case 'DUE_DATE_CHANGED':
      return (
        <span>
          changed due date from <span className="font-bold">{oldVal || 'None'}</span> to <span className="font-bold">{newVal || 'None'}</span>.
        </span>
      );
    case 'START_DATE_CHANGED':
      return (
        <span>
          changed start date from <span className="font-bold">{oldVal || 'None'}</span> to <span className="font-bold">{newVal || 'None'}</span>.
        </span>
      );
    case 'COMMENT_ADDED':
      return (
        <div className="mt-1">
          <span className="text-muted-foreground italic">added a comment:</span>
          <p className="border-l-2 border-border pl-3.5 py-1 text-zinc-655 italic mt-1 font-mono text-xs">
            "{newVal}"
          </p>
        </div>
      );
    case 'COMMENT_UPDATED':
      return <span className="italic text-muted-foreground">updated a comment.</span>;
    case 'COMMENT_DELETED':
      return <span className="italic text-muted-foreground">deleted a comment.</span>;
    case 'ATTACHMENT_ADDED':
      return (
        <span>
          attached file <span className="text-blue-600 font-bold hover:underline cursor-pointer">{newVal}</span>.
        </span>
      );
    case 'ATTACHMENT_REMOVED':
      return (
        <span>
          removed attachment <span className="line-through text-muted-foreground">{oldVal}</span>.
        </span>
      );
    default:
      return <span>performed action: {type.toLowerCase().replace(/_/g, ' ')}</span>;
  }
}

function TitleInput({ initialTitle, onSave }: { initialTitle: string; onSave: (val: string) => void }) {
  const [value, setValue] = useState(initialTitle);

  useEffect(() => {
    setValue(initialTitle);
  }, [initialTitle]);

  const handleBlur = () => {
    if (value.trim() && value !== initialTitle) {
      onSave(value.trim());
    } else {
      setValue(initialTitle);
    }
  };

  return (
    <input
      type="text"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
      className="w-full text-2xl font-semibold border-2 border-transparent hover:bg-background focus:bg-card text-card-foreground focus:border-[#4c9aff] px-2 py-0.5 rounded transition-all focus:outline-none placeholder:text-muted-foreground text-[#172b4d]"
      placeholder="What needs to be done?"
    />
  );
}

function DescriptionEditor({ initialDescription, onSave }: { initialDescription: string; onSave: (val: string) => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(initialDescription);

  useEffect(() => {
    setValue(initialDescription);
  }, [initialDescription]);

  const handleSave = () => {
    onSave(value);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="space-y-2">
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Add a detailed description..."
          className="min-h-[120px] resize-none border-blue-500 focus-visible:ring-1 focus-visible:ring-blue-500 bg-card text-card-foreground"
          autoFocus
        />
        <div className="flex gap-2">
          <Button
            onClick={handleSave}
            size="sm"
            className="bg-[#0052cc] hover:bg-[#0065ff] text-white font-bold"
          >
            Save
          </Button>
          <Button
            onClick={() => {
              setValue(initialDescription);
              setIsEditing(false);
            }}
            variant="ghost"
            size="sm"
            className="hover:bg-muted font-bold"
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      className="min-h-[60px] p-2 hover:bg-background hover:border-border cursor-pointer text-sm text-[#172b4d] leading-relaxed whitespace-pre-wrap transition-all select-none"
    >
      {value || <span className="text-muted-foreground italic">Edit description</span>}
    </div>
  );
}

function SubtaskItem({
  task,
  onToggle,
  onDelete,
  onTextSave,
}: {
  task: any;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onTextSave: (id: string, text: string) => void;
}) {
  const taskId = task._id || task.id;
  const [localText, setLocalText] = useState(task.text);

  useEffect(() => {
    setLocalText(task.text);
  }, [task.text]);

  return (
    <div
      className="flex items-center justify-between py-1.5 px-2 hover:bg-background/70 rounded-lg group transition-all duration-150 gap-3"
    >
      {/* Left: Custom Apple Checkbox & Input */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Checkbox button */}
        <button
          onClick={() => onToggle(taskId)}
          className={`w-4.5 h-4.5 rounded-full border flex items-center justify-center cursor-pointer transition-all duration-200 shrink-0 ${task.completed
              ? "bg-primary border-indigo-600 text-white shadow-xs"
              : "border-border hover:border-primary/50 hover:bg-primary/10/20"
            }`}
        >
          {task.completed && <Check className="h-3 w-3 stroke-[3]" />}
        </button>

        {/* Text input */}
        <input
          type="text"
          value={localText}
          onChange={(e) => setLocalText(e.target.value)}
          onBlur={() => {
            onTextSave(taskId, localText);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.currentTarget.blur();
            }
          }}
          className={`bg-transparent border-none outline-none focus:ring-0 w-full text-xs font-semibold text-zinc-805 focus:text-foreground transition-colors p-0 ${task.completed ? "line-through text-zinc-450 select-none" : ""
            }`}
        />
      </div>

      {/* Right: Deletion Button */}
      <button
        onClick={() => onDelete(taskId)}
        className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 hover:bg-muted p-1 rounded-full text-muted-foreground hover:text-red-500 transition-all cursor-pointer shrink-0"
        title="Delete subtask"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

function NewSubtaskInput({ onAdd }: { onAdd: (text: string) => void }) {
  const [value, setValue] = useState("");

  return (
    <div className="flex items-center gap-3 py-1.5 px-2 hover:bg-muted/50 rounded-lg group transition-all duration-150">
      <div className="w-4.5 h-4.5 rounded-full border border-dashed border-border flex items-center justify-center text-muted-foreground group-hover:border-zinc-400 group-hover:text-muted-foreground transition-all shrink-0">
        <Plus className="h-3 w-3" />
      </div>
      <input
        id="add-subtask-input"
        type="text"
        placeholder="Add a subtask..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && value.trim()) {
            onAdd(value.trim());
            setValue("");
          }
        }}
        className="bg-transparent border-none outline-none focus:ring-0 flex-1 text-xs text-zinc-850 placeholder:text-muted-foreground/80 font-semibold p-0"
      />
    </div>
  );
}

function CommentInputSection({
  user,
  workspaceMembers,
  onPostComment,
}: {
  user: any;
  workspaceMembers: any[];
  onPostComment: (text: string) => Promise<void>;
}) {
  const [commentInput, setCommentInput] = useState("");
  const [mentionSearch, setMentionSearch] = useState("");
  const [mentionTriggerIndex, setMentionTriggerIndex] = useState(-1);
  const [showMentionsDropdown, setShowMentionsDropdown] = useState(false);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const commentSectionRef = useRef<HTMLTextAreaElement>(null);

  const filteredMembers = useMemo(() => {
    if (!mentionSearch) return workspaceMembers;
    return workspaceMembers.filter((m: any) => {
      if (!m.userId) return false;
      const name = (m.userId.name || "").toLowerCase();
      const email = (m.userId.email || "").toLowerCase();
      const search = mentionSearch.toLowerCase();
      return name.includes(search) || email.includes(search);
    });
  }, [workspaceMembers, mentionSearch]);

  const handlePostComment = async () => {
    if (!commentInput.trim()) return;
    await onPostComment(commentInput.trim());
    setCommentInput("");
  };

  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setCommentInput(val);

    const selectionStart = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, selectionStart);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");

    if (lastAtIndex !== -1 && (lastAtIndex === 0 || /\s/.test(textBeforeCursor[lastAtIndex - 1]))) {
      const query = textBeforeCursor.slice(lastAtIndex + 1);
      if (!/\n/.test(query) && query.length < 30) {
        setMentionSearch(query);
        setMentionTriggerIndex(lastAtIndex);
        setShowMentionsDropdown(true);
        setSelectedMentionIndex(0);
        return;
      }
    }
    setShowMentionsDropdown(false);
  };

  const selectMember = (member: any) => {
    if (!member || !member.userId) return;
    const name = member.userId.name;

    const textBeforeTrigger = commentInput.slice(0, mentionTriggerIndex);
    const textAfterCursor = commentInput.slice(mentionTriggerIndex + mentionSearch.length + 1);

    const mentionText = `@${name} `;
    const newValue = textBeforeTrigger + mentionText + textAfterCursor;

    setCommentInput(newValue);
    setShowMentionsDropdown(false);

    setTimeout(() => {
      if (commentSectionRef.current) {
        commentSectionRef.current.focus();
        const newCursorPos = mentionTriggerIndex + mentionText.length;
        commentSectionRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  const handleCommentKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMentionsDropdown && filteredMembers.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedMentionIndex((prev) => (prev + 1) % filteredMembers.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedMentionIndex((prev) => (prev - 1 + filteredMembers.length) % filteredMembers.length);
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        selectMember(filteredMembers[selectedMentionIndex]);
      } else if (e.key === "Escape") {
        e.preventDefault();
        setShowMentionsDropdown(false);
      }
    } else {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handlePostComment();
      }
    }
  };

  return (
    <div className="flex gap-3 pt-2">
      <Avatar className="h-8 w-8 border border-border shrink-0">
        <AvatarFallback className="bg-[#deebff] text-[#0747a6] text-xs font-bold">
          {user?.name ? user.name.split(" ").map((n: any) => n[0]).join("").toUpperCase().slice(0, 2) : "U"}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 space-y-2 relative">
        <Textarea
          ref={commentSectionRef}
          id="comment-textarea"
          placeholder="Add a comment... (Press Enter to send, Shift+Enter for newline, @ to mention)"
          value={commentInput}
          onChange={handleCommentChange}
          onKeyDown={handleCommentKeyDown}
          className="min-h-[80px] resize-none border-zinc-250 focus-visible:ring-1 focus-visible:ring-blue-600 text-sm mb-1 bg-card text-card-foreground"
        />

        {showMentionsDropdown && filteredMembers.length > 0 && (
          <div className="absolute left-0 bottom-full mb-1.5 z-50 w-72 bg-card text-card-foreground border border-border rounded-lg shadow-xl max-h-48 overflow-y-auto divide-y divide-zinc-100">
            {filteredMembers.map((member: any, idx: number) => {
              const u = member.userId;
              if (!u) return null;
              const initials = u.name
                ? u.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
                : "U";
              const isSelected = idx === selectedMentionIndex;
              return (
                <div
                  key={u._id}
                  onClick={() => selectMember(member)}
                  className={`flex items-center gap-2.5 px-3 py-2 text-xs cursor-pointer transition-colors ${isSelected ? "bg-blue-50 text-blue-900 animate-pulse" : "hover:bg-background"
                    }`}
                >
                  <Avatar className="h-6 w-6 border shrink-0">
                    <AvatarFallback className="text-[9px] bg-slate-100 font-extrabold text-slate-700">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col min-w-0">
                    <span className="font-bold truncate">{u.name}</span>
                    <span className="text-[10px] text-muted-foreground truncate">{u.email}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex flex-wrap gap-1.5 text-xs text-zinc-550 select-none pb-1.5">
          <button
            onClick={() => setCommentInput("Who is working on this...?")}
            className="px-2.5 py-1 border rounded-full bg-background hover:bg-muted cursor-pointer font-medium"
          >
            Who is working on this...?
          </button>
          <button
            onClick={() => setCommentInput("Can I get more info...?")}
            className="px-2.5 py-1 border rounded-full bg-background hover:bg-muted cursor-pointer font-medium"
          >
            Can I get more info...?
          </button>
          <button
            onClick={() => setCommentInput("Status update...")}
            className="px-2.5 py-1 border rounded-full bg-background hover:bg-muted cursor-pointer font-medium"
          >
            Status update...
          </button>
        </div>

        <div className="flex justify-between items-center text-[10px] text-muted-foreground select-none">
          <span>Pro tip: press <kbd className="border px-1 py-0.5 rounded bg-background font-mono">M</kbd> to comment</span>
          <Button
            onClick={handlePostComment}
            size="sm"
            className="bg-[#0052cc] hover:bg-[#0065ff] text-white font-bold cursor-pointer h-7 text-xs px-4"
          >
            Save Comment
          </Button>
        </div>
      </div>
    </div>
  );
}

const getLabelId = (lbl: any): string => {
  if (!lbl) return "";
  if (typeof lbl === "string") return lbl;
  return lbl._id || lbl.id || "";
};

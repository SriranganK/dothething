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
  Sparkles,
  Bold,
  Italic,
  Code,
  List,
  FileText,
  FileSpreadsheet,
  FileArchive,
  FileCode,
  File,
  MoreVertical,
  Download,
  ExternalLink,
  Edit2,
  Loader2,
  Eye,
  RefreshCw,
  UploadCloud,
  FileImage,
  Globe,
  GitBranch,
  GitCommit,
  GitPullRequest,
  Search,
  Clock,
  Activity,
  ChevronRight,
  Zap,
  Terminal,
  ArrowUpRight,
} from "lucide-react";
import type { ItemType, ItemPriorityClass, ItemTypeClass, AttachmentType } from "@/types/workspace";
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
  useGetPresignedUrlMutation,
  useCreateAttachmentMutation,
  useDeleteAttachmentMutation,
  useUpdateAttachmentMutation,
  useGetItemDevelopmentQuery,
  useLinkItemRepoMutation,
  useCreateItemBranchMutation,
  useGetWorkspaceIntegrationsQuery,
  backendApi,
  useSuggestTaskMetaMutation,
  useBreakTaskMutation,
  useRewriteDescriptionMutation,
} from "@/store/services/api";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PriorityIndicator } from "@/components/ui/priority-indicator";
import { StatusIndicator } from "@/components/ui/status-indicator";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Dialog as CustomDialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useConfirm } from "@/context/ConfirmContext";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ItemDetailContentProps {
  itemId: string;
  onClose?: () => void;
  onItemUpdated?: (updatedItem: ItemType) => void;
  onItemDeleted?: (itemId: string) => void;
  isModal?: boolean;
  emailToNameMap?: Map<string, string> | Record<string, string>;
}

interface UploadingFile {
  id: string;
  name: string;
  size: number;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  error?: string;
  file: File;
}

const PRIORITIES: ItemPriorityClass[] = ["Lowest", "Low", "Medium", "High", "Highest", "Critical"];

const typeConfig: Record<string, { color: string; bg: string; icon: ReactNode }> = {
  Task:          { color: "text-blue-650",    bg: "bg-blue-50",    icon: <CheckSquare className="h-4 w-4 text-blue-500 shrink-0" /> },
  Bug:           { color: "text-red-605",     bg: "bg-red-50",     icon: <Bug className="h-4 w-4 text-red-500 shrink-0" /> },
  Lead:          { color: "text-emerald-600", bg: "bg-emerald-50", icon: <Target className="h-4 w-4 text-emerald-500 shrink-0" /> },
  Idea:          { color: "text-purple-650",  bg: "bg-purple-50",  icon: <Lightbulb className="h-4 w-4 text-purple-500 shrink-0" /> },
  Issue:         { color: "text-yellow-655",  bg: "bg-yellow-50",  icon: <AlertCircle className="h-4 w-4 text-yellow-500 shrink-0" /> },
  Event:         { color: "text-primary",     bg: "bg-primary/10", icon: <Calendar className="h-4 w-4 text-indigo-500 shrink-0" /> },
  Feature:       { color: "text-violet-600",  bg: "bg-violet-50",  icon: <Zap className="h-4 w-4 text-violet-500 shrink-0" /> },
  Research:      { color: "text-cyan-600",    bg: "bg-cyan-50",    icon: <Search className="h-4 w-4 text-cyan-500 shrink-0" /> },
  Documentation: { color: "text-slate-600",   bg: "bg-slate-50",   icon: <FileText className="h-4 w-4 text-slate-500 shrink-0" /> },
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
  const confirm = useConfirm();

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

  // Development Integrations query & modal state
  const { data: devResponse, isLoading: loadingDev, error: devError, refetch: refetchDev } = useGetItemDevelopmentQuery(itemId, {
    skip: !itemId
  });
  const development = devResponse?.development || null;
  const integrationsActive = devResponse?.integrationsActive || false;
  const devPlatform = devResponse?.platform || '';

  const [showDevModal, setShowDevModal] = useState(false);
  const [activeDevTab, setActiveDevTab] = useState<'overview' | 'branches' | 'commits' | 'prs' | 'deployments' | 'create_branch'>('overview');
  const [popoverTab, setPopoverTab] = useState<'main' | 'create_branch' | 'switch_branch' | 'commits' | 'prs' | 'deployments'>('main');
  const [isDevPopoverOpen, setIsDevPopoverOpen] = useState(false);
  const [branchSearchQuery, setBranchSearchQuery] = useState('');
  const [isRefreshingDev, setIsRefreshingDev] = useState(false);
  const [isDetailsCollapsed, setIsDetailsCollapsed] = useState(false);
  const [isDevCollapsed, setIsDevCollapsed] = useState(false);

  // Manual integration hooks and states
  const [linkItemRepo] = useLinkItemRepoMutation();
  const [createItemBranch] = useCreateItemBranchMutation();
  const { data: workspaceIntegrations } = useGetWorkspaceIntegrationsQuery(workspace?._id || '', {
    skip: !workspace?._id
  });

  const [selectedRepo, setSelectedRepo] = useState('');
  const [showBranchCreate, setShowBranchCreate] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [baseBranch, setBaseBranch] = useState('main');
  const [isCreatingBranch, setIsCreatingBranch] = useState(false);

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
  
  const [getPresignedUrl] = useGetPresignedUrlMutation();
  const [createAttachment] = useCreateAttachmentMutation();
  const [deleteAttachment] = useDeleteAttachmentMutation();
  const [updateAttachment] = useUpdateAttachmentMutation();

  // AI Mutations & handlers
  const [suggestTaskMeta, { isLoading: isSuggestingMeta }] = useSuggestTaskMetaMutation();
  const [breakTask, { isLoading: isBreakingTask }] = useBreakTaskMutation();
  const [rewriteDescription, { isLoading: isRewritingDesc }] = useRewriteDescriptionMutation();

  const handleRewriteDescription = async (tone: string) => {
    if (!item) return;
    // If the description editor is empty, warn the user
    if (!description.trim()) {
      toast.error("Please write a description first before improving it.");
      return;
    }
    try {
      // Pass the current live editor text + title as context to the backend
      // The backend will use item.description from DB, so first save the editor text
      await updateItem({ id: item._id, body: { description } }).unwrap();
      const res = await rewriteDescription({ itemId: item._id, tone }).unwrap();
      if (res.success && res.description !== undefined) {
        setDescription(res.description);
        onItemUpdated?.({ ...item, description: res.description });
        toast.success("Description improved by AI!");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.data?.message || "Failed to improve description");
    }
  };

  const handleBreakTask = async () => {
    if (!item) return;
    try {
      const res = await breakTask({ itemId: item._id }).unwrap();
      if (res.success && res.item) {
        setChecklist(res.item.checklist || []);
        onItemUpdated?.(res.item);
        toast.success("Subtasks generated successfully by AI!");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.data?.message || "Failed to generate subtasks");
    }
  };

  const handleAISuggestFields = async () => {
    if (!item) return;
    try {
      const res = await suggestTaskMeta({
        boardId: item.board,
        title: item.title,
        description: description
      }).unwrap();

      if (res.success && res.suggestions) {
        const { priority, type, daysFromNow } = res.suggestions;
        const dueDate = daysFromNow
          ? new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000).toISOString()
          : undefined;

        // Only save fields that map directly to item schema (no labels –
        // AI returns label *names* not IDs, so applying them would crash the cache updater)
        const body: any = {};
        if (priority) body.priority = priority;
        if (type) body.type = type;
        if (dueDate) body.dueDate = dueDate;

        await handleSaveField(body);
        toast.success("AI suggested fields applied! (Priority, Type & Due Date updated)");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.data?.message || "Failed to suggest fields");
    }
  };

  // Local state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [checklist, setChecklist] = useState<any[]>([]);
  
  // Attachments Management State
  const [attachments, setAttachments] = useState<AttachmentType[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceFileInputRef = useRef<HTMLInputElement>(null);
  const [replacingAttachment, setReplacingAttachment] = useState<AttachmentType | null>(null);

  // Link Dialog states
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkTitle, setLinkTitle] = useState("");

  // Edit / Rename states
  const [editingAttachment, setEditingAttachment] = useState<AttachmentType | null>(null);
  const [editName, setEditName] = useState("");
  const [editUrl, setEditUrl] = useState("");

  // Delete Confirm states
  const [deletingAttachment, setDeletingAttachment] = useState<AttachmentType | null>(null);
  const [deletePermanent, setDeletePermanent] = useState(true);

  // Lightbox / Image Preview state
  const [lightboxAttachment, setLightboxAttachment] = useState<AttachmentType | null>(null);

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
  const [isGeneratingLabels, setIsGeneratingLabels] = useState(false);
  const [isSuggestingMilestone, setIsSuggestingMilestone] = useState(false);

  const filteredLabelsForPopover = useMemo(() => {
    if (!labelSearch) return allLabels;
    return allLabels.filter((l: any) => l.name.toLowerCase().includes(labelSearch.toLowerCase()));
  }, [allLabels, labelSearch]);

  // AI: generate & apply labels
  const handleAIGenerateLabels = async () => {
    if (!item || !workspace?._id) return;
    setIsGeneratingLabels(true);
    try {
      // Auto-save live editor text first so AI gets the latest description
      if (description.trim()) {
        await updateItem({ id: item._id, body: { description } }).unwrap();
      }
      const res = await suggestTaskMeta({
        boardId: item.board,
        title: item.title,
        description: description
      }).unwrap();

      const suggestedNames: string[] = res.suggestions?.labels || [];
      if (!suggestedNames.length) {
        toast.info("AI couldn't suggest any labels for this task.");
        return;
      }

      // Match existing labels or create missing ones
      const labelIds: string[] = [];
      for (const name of suggestedNames) {
        const existing = allLabels.find((l: any) => l.name.toLowerCase().trim() === name.toLowerCase().trim());
        if (existing) {
          labelIds.push(existing._id);
        } else {
          // Create the label in the workspace with a nice auto color
          const colors = ['#6366f1', '#8b5cf6', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];
          const color = colors[Math.floor(Math.random() * colors.length)];
          try {
            const created = await createLabel({ workspaceId: workspace._id, name, color }).unwrap();
            if (created.label?._id) labelIds.push(created.label._id);
          } catch { /* skip if creation fails */ }
        }
      }

      if (!labelIds.length) {
        toast.error("Failed to create or find suggested labels.");
        return;
      }

      // Merge with existing labels (no duplicates)
      const currentIds = (item.labels || []).map((l: any) => l._id || l);
      const merged = [...new Set([...currentIds, ...labelIds])];
      await handleSaveField({ labels: merged });
      toast.success(`${suggestedNames.join(', ')} — labels applied!`);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.data?.message || "Failed to generate labels");
    } finally {
      setIsGeneratingLabels(false);
    }
  };

  // AI: suggest best matching milestone
  const handleAISuggestMilestone = async () => {
    if (!item || !milestonesData?.milestones?.length) {
      toast.info("No milestones available in this workspace.");
      return;
    }
    setIsSuggestingMilestone(true);
    try {
      // Auto-save live editor text first so AI gets the latest description
      if (description.trim()) {
        await updateItem({ id: item._id, body: { description } }).unwrap();
      }
      const milestoneList = milestonesData.milestones.map((m: any) => m.name).join(', ');
      const res = await suggestTaskMeta({
        boardId: item.board,
        title: `${item.title}. Available milestones: ${milestoneList}. Pick the best one.`,
        description: description
      }).unwrap();

      // Find closest matching milestone by name
      const suggestedLabel = res.suggestions?.labels?.[0] || '';
      const milestones: any[] = milestonesData.milestones;
      const match = milestones.find((m: any) =>
        suggestedLabel && m.name.toLowerCase().includes(suggestedLabel.toLowerCase())
      ) || milestones[0];

      if (match) {
        await handleSaveField({ milestone_id: match._id } as any);
        toast.success(`Milestone set to "${match.name}" by AI`);
      } else {
        toast.info("AI couldn't determine the best milestone.");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.data?.message || "Failed to suggest milestone");
    } finally {
      setIsSuggestingMilestone(false);
    }
  };

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
    const ok = await confirm({
      title: "Delete Comment",
      description: "Are you sure you want to delete this comment?",
      confirmText: "Delete",
      cancelText: "Cancel",
      variant: "destructive"
    });
    if (!ok) return;
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

  // Helper to determine icon for files/links
  const getFileIcon = (att: AttachmentType) => {
    if (att.type === 'link') return <Globe className="h-4 w-4 text-blue-500" />;
    const mime = att.mimeType || '';
    const name = att.originalName || '';
    if (mime.startsWith('image/')) return <FileImage className="h-4 w-4 text-emerald-500" />;
    if (mime.includes('pdf')) return <FileText className="h-4 w-4 text-red-500" />;
    if (mime.includes('word') || name.endsWith('.doc') || name.endsWith('.docx')) return <FileText className="h-4 w-4 text-blue-500" />;
    if (mime.includes('excel') || mime.includes('sheet') || name.endsWith('.xls') || name.endsWith('.xlsx')) return <FileSpreadsheet className="h-4 w-4 text-emerald-600" />;
    if (mime.includes('zip') || mime.includes('tar') || mime.includes('compressed') || name.endsWith('.zip') || name.endsWith('.rar')) return <FileArchive className="h-4 w-4 text-amber-500" />;
    if (name.endsWith('.js') || name.endsWith('.ts') || name.endsWith('.tsx') || name.endsWith('.html') || name.endsWith('.css')) return <FileCode className="h-4 w-4 text-zinc-500" />;
    return <File className="h-4 w-4 text-zinc-400" />;
  };

  const formatBytes = (bytes?: number, decimals = 2) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const getHostname = (url: string) => {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  };

  // Drag and Drop Upload Event Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUploadFiles(Array.from(e.dataTransfer.files));
    }
  };

  // File upload logic (presigned URL + Direct R2 upload + DB Metadata)
  const handleUploadFiles = async (files: File[]) => {
    const newUploads: UploadingFile[] = files.map(f => ({
      id: Math.random().toString(36).substring(7),
      name: f.name,
      size: f.size,
      progress: 0,
      status: 'uploading',
      file: f
    }));

    setUploadingFiles(prev => [...prev, ...newUploads]);

    for (const uploadItem of newUploads) {
      try {
        // 1. Get presigned upload URL
        const res = await getPresignedUrl({
          fileName: uploadItem.name,
          mimeType: uploadItem.file.type,
          itemId: itemId
        }).unwrap();

        const { uploadUrl, storageKey, publicUrl } = res;

        // 2. Upload file directly to Cloudflare R2 / local mock URL
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('PUT', uploadUrl, true);
          xhr.setRequestHeader('Content-Type', uploadItem.file.type);

          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const percentage = Math.round((event.loaded / event.total) * 100);
              setUploadingFiles(prev =>
                prev.map(item => item.id === uploadItem.id ? { ...item, progress: percentage } : item)
              );
            }
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve();
            } else {
              reject(new Error(`Upload failed (${xhr.status})`));
            }
          };

          xhr.onerror = () => reject(new Error('Network error during upload'));
          xhr.send(uploadItem.file);
        });

        // 3. Save metadata to DB
        const createRes = await createAttachment({
          issueId: itemId,
          type: 'file',
          fileName: uploadItem.name,
          originalName: uploadItem.name,
          mimeType: uploadItem.file.type,
          size: uploadItem.file.size,
          storageKey,
          publicUrl
        }).unwrap();

        if (createRes.success) {
          // Optimistically update caches
          dispatch(
            backendApi.util.updateQueryData("getItem", itemId, (draft) => {
              if (draft?.item) {
                draft.item.attachments = [...(draft.item.attachments || []), createRes.attachment];
              }
            })
          );

          if (item.board) {
            dispatch(
              backendApi.util.updateQueryData("getBoardItems", item.board, (draft) => {
                const idx = draft.items.findIndex(i => i._id === itemId);
                if (idx !== -1) {
                  draft.items[idx].attachments = [...(draft.items[idx].attachments || []), createRes.attachment];
                }
              })
            );
          }

          setUploadingFiles(prev =>
            prev.map(item => item.id === uploadItem.id ? { ...item, status: 'success', progress: 100 } : item)
          );

          setTimeout(() => {
            setUploadingFiles(prev => prev.filter(item => item.id !== uploadItem.id));
          }, 2000);
        } else {
          throw new Error('Failed to save metadata');
        }

      } catch (err: any) {
        console.error('File upload failed:', uploadItem.name, err);
        setUploadingFiles(prev =>
          prev.map(item => item.id === uploadItem.id ? { ...item, status: 'error', error: err.message || 'Upload failed' } : item)
        );
      }
    }
  };

  const handleRetryUpload = (failedItem: UploadingFile) => {
    setUploadingFiles(prev => prev.filter(item => item.id !== failedItem.id));
    handleUploadFiles([failedItem.file]);
  };

  // Add Link handler
  const handleAddLink = async () => {
    if (!linkUrl.trim()) return;
    
    let targetUrl = linkUrl.trim();
    if (!/^https?:\/\//i.test(targetUrl)) {
      targetUrl = 'https://' + targetUrl;
    }

    const title = linkTitle.trim() || targetUrl.replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
    const fileName = title;

    try {
      const createRes = await createAttachment({
        issueId: itemId,
        type: 'link',
        fileName,
        originalName: title,
        publicUrl: targetUrl
      }).unwrap();

      if (createRes.success) {
        // Optimistically push the newly added link to local cache
        dispatch(
          backendApi.util.updateQueryData("getItem", itemId, (draft) => {
            if (draft?.item) {
              draft.item.attachments = [...(draft.item.attachments || []), createRes.attachment];
            }
          })
        );
        if (item.board) {
          dispatch(
            backendApi.util.updateQueryData("getBoardItems", item.board, (draft) => {
              const idx = draft.items.findIndex(i => i._id === itemId);
              if (idx !== -1) {
                draft.items[idx].attachments = [...(draft.items[idx].attachments || []), createRes.attachment];
              }
            })
          );
        }

        setShowLinkModal(false);
        setLinkUrl("");
        setLinkTitle("");
      }
    } catch (err) {
      console.error('Failed to add link:', err);
    }
  };

  // Rename/edit attachment metadata
  const handleEditAttachment = async () => {
    if (!editingAttachment || !editName.trim()) return;

    const body: any = { originalName: editName.trim() };
    if (editingAttachment.type === 'link') {
      let targetUrl = editUrl.trim();
      if (targetUrl) {
        if (!/^https?:\/\//i.test(targetUrl)) {
          targetUrl = 'https://' + targetUrl;
        }
        body.publicUrl = targetUrl;
      }
    }

    // Apply Optimistic update
    const itemPatch = dispatch(
      backendApi.util.updateQueryData("getItem", itemId, (draft) => {
        if (draft?.item) {
          draft.item.attachments = (draft.item.attachments || []).map(att => 
            att._id === editingAttachment._id 
              ? { ...att, originalName: editName.trim(), publicUrl: body.publicUrl || att.publicUrl } 
              : att
          );
        }
      })
    );

    const boardPatch = item.board ? dispatch(
      backendApi.util.updateQueryData("getBoardItems", item.board, (draft) => {
        const idx = draft.items.findIndex(i => i._id === itemId);
        if (idx !== -1) {
          draft.items[idx].attachments = (draft.items[idx].attachments || []).map(att => 
            att._id === editingAttachment._id 
              ? { ...att, originalName: editName.trim(), publicUrl: body.publicUrl || att.publicUrl } 
              : att
          );
        }
      })
    ) : null;

    try {
      setEditingAttachment(null);
      await updateAttachment({
        id: editingAttachment._id,
        body
      }).unwrap();
    } catch (err) {
      console.error('Failed to edit attachment:', err);
      itemPatch.undo();
      if (boardPatch) boardPatch.undo();
    }
  };

  // Delete attachment (confirm callback)
  const handleDeleteAttachment = async () => {
    if (!deletingAttachment) return;
    const targetId = deletingAttachment._id;

    // Apply Optimistic update
    const itemPatch = dispatch(
      backendApi.util.updateQueryData("getItem", itemId, (draft) => {
        if (draft?.item) {
          draft.item.attachments = (draft.item.attachments || []).filter(att => att._id !== targetId);
        }
      })
    );

    const boardPatch = item.board ? dispatch(
      backendApi.util.updateQueryData("getBoardItems", item.board, (draft) => {
        const idx = draft.items.findIndex(i => i._id === itemId);
        if (idx !== -1) {
          draft.items[idx].attachments = (draft.items[idx].attachments || []).filter(att => att._id !== targetId);
        }
      })
    ) : null;

    try {
      setDeletingAttachment(null);
      await deleteAttachment({
        id: targetId,
        permanent: deletePermanent
      }).unwrap();
    } catch (err) {
      console.error('Failed to delete attachment:', err);
      itemPatch.undo();
      if (boardPatch) boardPatch.undo();
    }
  };

  // Replace file triggering
  const handleReplaceFileSelect = (att: AttachmentType) => {
    setReplacingAttachment(att);
    if (replaceFileInputRef.current) {
      replaceFileInputRef.current.click();
    }
  };

  const handleReplaceFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!replacingAttachment || !e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    e.target.value = "";
    
    const uploadId = Math.random().toString(36).substring(7);
    const mockUploading: UploadingFile = {
      id: uploadId,
      name: file.name,
      size: file.size,
      progress: 0,
      status: 'uploading',
      file
    };
    
    setUploadingFiles(prev => [...prev, mockUploading]);
    const targetAtt = replacingAttachment;
    setReplacingAttachment(null);

    try {
      // 1. Get presigned upload URL
      const res = await getPresignedUrl({
        fileName: file.name,
        mimeType: file.type,
        itemId: itemId
      }).unwrap();

      const { uploadUrl, storageKey, publicUrl } = res;

      // 2. Upload file
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', uploadUrl, true);
        xhr.setRequestHeader('Content-Type', file.type);

        xhr.upload.onprogress = (evt) => {
          if (evt.lengthComputable) {
            const percentage = Math.round((evt.loaded / evt.total) * 100);
            setUploadingFiles(prev =>
              prev.map(item => item.id === uploadId ? { ...item, progress: percentage } : item)
            );
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Upload failed (${xhr.status})`));
          }
        };

        xhr.onerror = () => reject(new Error('Network error during upload'));
        xhr.send(file);
      });

      // 3. Update existing Attachment
      const updateRes = await updateAttachment({
        id: targetAtt._id,
        body: {
          fileName: file.name,
          originalName: file.name,
          mimeType: file.type,
          size: file.size,
          storageKey,
          publicUrl
        }
      }).unwrap();

      if (updateRes.success) {
        setUploadingFiles(prev =>
          prev.map(item => item.id === uploadId ? { ...item, status: 'success', progress: 100 } : item)
        );
        setTimeout(() => {
          setUploadingFiles(prev => prev.filter(item => item.id !== uploadId));
        }, 1500);
      } else {
        throw new Error('Failed to update attachment');
      }
    } catch (err: any) {
      console.error('Replacement upload failed:', err);
      setUploadingFiles(prev =>
        prev.map(item => item.id === uploadId ? { ...item, status: 'error', error: err.message || 'Replacement failed' } : item)
      );
    }
  };

  const handleDeleteItem = async () => {
    const ok = await confirm({
      title: "Delete Card",
      description: "Are you sure you want to permanently delete this issue?",
      confirmText: "Delete",
      cancelText: "Cancel",
      variant: "destructive"
    });
    if (!ok) return;
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

  const handleResetDetails = async () => {
    const ok = await confirm({
      title: "Reset Details",
      description: "Are you sure you want to reset all details information?",
      confirmText: "Reset",
      cancelText: "Cancel",
      variant: "destructive"
    });
    if (!ok) return;
    try {
      await handleSaveField({
        assignee: "",
        priority: "Medium",
        dueDate: null,
        milestone_id: null,
        labels: [],
        startDate: null,
        storyPoints: null as any,
      });
      toast.success("Details reset successfully");
    } catch (err: any) {
      console.error("Failed to reset details:", err);
      toast.error(err?.message || "Failed to reset details");
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
          {(typeConfig[item.type] ?? typeConfig['Task']).icon}
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
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 lg:overflow-hidden bg-card">
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
                    <SelectContent position="popper" className="bg-card text-card-foreground border border-border rounded-xl shadow-lg max-h-72 overflow-y-auto z-[110]">
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
                  <SelectContent position="popper" className="bg-card text-card-foreground border border-border rounded-xl shadow-lg max-h-72 overflow-y-auto z-[110]">
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
                  <SelectContent position="popper" className="bg-card text-card-foreground border border-border rounded-xl shadow-lg max-h-72 overflow-y-auto z-[110]">
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p} className="cursor-pointer">
                        <PriorityIndicator priority={p} />
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Source Document Traceability */}
            {item.source && (
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-bold text-muted-foreground">Source</span>
                <div className="w-48 shrink-0 flex items-center justify-end">
                  <Badge variant="outline" className="h-7 px-2.5 text-xs font-bold bg-muted/40 text-muted-foreground border-border rounded-md max-w-full truncate" title={`Source: ${item.source}`}>
                    <Link className="h-3.5 w-3.5 mr-1 inline shrink-0" />
                    <span className="truncate">{item.source}</span>
                  </Badge>
                </div>
              </div>
            )}

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
                      fileInputRef.current?.click();
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
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-[#172b4d]">Description</h4>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-extrabold text-indigo-650 hover:bg-muted outline-none border border-transparent cursor-pointer">
                    <Sparkles className="h-3 w-3 animate-pulse text-indigo-500" />
                    <span>Improve Description</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44 bg-card border border-border">
                  {[
                    { label: "Make Professional", tone: "make it professional and clear" },
                    { label: "Technical Review", tone: "add technical details and structured bullet points" },
                    { label: "Summarize", tone: "summarize into a short actionable paragraph" },
                    { label: "Grammar & Flow", tone: "improve grammar, spelling, and readability" }
                  ].map((option) => (
                    <DropdownMenuItem
                      key={option.label}
                      onClick={() => handleRewriteDescription(option.tone)}
                      className="cursor-pointer text-xs"
                      disabled={isRewritingDesc}
                    >
                      {option.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <DescriptionEditor
              initialDescription={description}
              onSave={(newDesc) => handleSaveField({ description: newDesc })}
              onUploadFiles={handleUploadFiles}
              onAddLink={() => setShowLinkModal(true)}
            />
          </div>

          {/* Subtasks Section */}
          <div ref={subtaskSectionRef} className="space-y-3">
            <div className="flex items-center justify-between border-b border-border/80 pb-1.5 select-none">
              <div className="flex items-center gap-1.5">
                <ChevronDown className="h-4.5 w-4.5 text-muted-foreground" />
                <h4 className="text-sm font-bold text-foreground">Subtasks</h4>
              </div>
              <div className="flex items-center gap-3">
                {checklist.length > 0 && (
                  <span className="text-xs font-semibold text-muted-foreground">
                    {checklistProgress}% Completed
                  </span>
                )}
                <button
                  onClick={handleBreakTask}
                  disabled={isBreakingTask}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-extrabold text-violet-650 hover:bg-muted outline-none border border-transparent cursor-pointer disabled:opacity-50"
                >
                  {isBreakingTask ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin text-violet-500" />
                      <span>Breaking down...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3 w-3 animate-pulse text-violet-500" />
                      <span>Break down with AI</span>
                    </>
                  )}
                </button>
              </div>
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
          <div ref={attachSectionRef} className="space-y-4">

            {/* Header */}
            <div className="flex items-center justify-between border-b pb-1.5 select-none">
              <div className="flex items-center gap-2">
                <Paperclip className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-sm font-bold text-[#172b4d]">Attachments</h4>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1 text-xs font-bold bg-[#deebff] hover:bg-[#b3d4ff] text-[#0747a6] rounded-md flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Plus className="h-3 w-3" /> Upload File
                </button>
                <button
                  onClick={() => setShowLinkModal(true)}
                  className="px-2.5 py-1 text-xs font-bold hover:bg-muted text-muted-foreground border border-border rounded-md flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Link className="h-3 w-3" /> Add Link
                </button>
              </div>
            </div>

            {/* Drag and Drop Upload Area */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                dragOver
                  ? 'border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/10 scale-[0.99]'
                  : 'border-zinc-200 hover:border-zinc-350 dark:border-zinc-800'
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleUploadFiles(Array.from(e.target.files));
                  }
                }}
                multiple
                className="hidden"
              />
              <input
                type="file"
                ref={replaceFileInputRef}
                onChange={handleReplaceFile}
                className="hidden"
              />

              <div className="flex flex-col items-center justify-center space-y-2">
                <div className="p-3 bg-zinc-50 dark:bg-zinc-805/80 rounded-full text-zinc-400">
                  <UploadCloud className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">
                    Drag and drop files here, or <span className="text-[#0052cc] hover:underline">browse</span>
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Images, PDFs, documents, or spreadsheet files up to 25MB
                  </p>
                </div>
              </div>
            </div>

            {/* Uploading Files Status List */}
            {uploadingFiles.length > 0 && (
              <div className="space-y-2 border border-zinc-100 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-900/10 p-3.5 rounded-xl">
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider select-none">
                  Uploading ({uploadingFiles.length})
                </p>
                <div className="space-y-2.5">
                  {uploadingFiles.map((file) => (
                    <div key={file.id} className="flex items-center justify-between gap-3 bg-background border border-border p-2.5 rounded-lg text-xs">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {file.status === 'uploading' ? (
                          <Loader2 className="h-4 w-4 text-primary animate-spin shrink-0" />
                        ) : file.status === 'success' ? (
                          <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                        )}
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold truncate text-foreground/90">{file.name}</span>
                            <span className="text-[10px] text-muted-foreground shrink-0">{file.progress}%</span>
                          </div>
                          <Progress value={file.progress} className="h-1 bg-zinc-100" />
                        </div>
                      </div>

                      <div className="flex items-center shrink-0">
                        {file.status === 'error' && (
                          <button
                            onClick={() => handleRetryUpload(file)}
                            className="p-1 text-[10px] font-bold text-blue-650 hover:bg-zinc-100 rounded shrink-0 cursor-pointer flex items-center gap-1 transition-colors"
                          >
                            <RefreshCw className="h-3 w-3" /> Retry
                          </button>
                        )}
                        <button
                          onClick={() => setUploadingFiles(prev => prev.filter(item => item.id !== file.id))}
                          className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-muted-foreground shrink-0 cursor-pointer transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Attachments Cards list */}
            {attachments.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {attachments.map((att) => {
                  const isImage = att.type === 'file' && att.mimeType?.startsWith('image/');
                  return (
                    <div
                      key={att._id}
                      className="group flex flex-col justify-between border border-border rounded-xl bg-background hover:shadow-md hover:border-zinc-350 dark:hover:border-zinc-700 transition-all overflow-hidden relative"
                    >
                      {/* Top section: Content */}
                      <div className="flex items-start gap-3 p-3 min-w-0">
                        {/* Thumbnail / Icon */}
                        <div className="h-11 w-11 rounded-lg border border-border bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center overflow-hidden shrink-0">
                          {isImage ? (
                            <img
                              src={att.publicUrl}
                              alt={att.originalName}
                              className="h-full w-full object-cover cursor-pointer hover:scale-105 transition-transform"
                              onClick={() => setLightboxAttachment(att)}
                              loading="lazy"
                            />
                          ) : (
                            getFileIcon(att)
                          )}
                        </div>

                        {/* Text Metadata */}
                        <div className="min-w-0 flex-1 space-y-0.5 select-none">
                          <p className="text-xs font-bold text-foreground truncate leading-tight">
                            {att.type === 'link' ? (
                              <a
                                href={att.publicUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-blue-600 hover:underline"
                              >
                                {att.originalName}
                              </a>
                            ) : (
                              <span
                                className="cursor-pointer hover:text-indigo-600"
                                onClick={() => att.mimeType?.startsWith('image/') ? setLightboxAttachment(att) : window.open(att.publicUrl, '_blank')}
                              >
                                {att.originalName}
                              </span>
                            )}
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {att.type === 'link' ? getHostname(att.publicUrl) : formatBytes(att.size)}
                          </p>
                          <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground/80 mt-1 select-none">
                            {att.uploadedBy && (
                              <span className="font-semibold truncate max-w-[80px]" title={`Uploaded by ${att.uploadedBy}`}>
                                {att.uploadedBy}
                              </span>
                            )}
                            <span className="shrink-0">•</span>
                            <span className="shrink-0">
                              {new Date(att.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Dropdown Menu (Top Right) */}
                      <div className="absolute top-2.5 right-2.5">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              aria-label="Attachment Actions"
                              className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-transparent hover:border-border rounded-lg text-muted-foreground hover:text-foreground cursor-pointer transition-all"
                            >
                              <MoreVertical className="h-3.5 w-3.5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40 z-50">
                            <DropdownMenuItem onClick={() => window.open(att.publicUrl, '_blank')}>
                              <ExternalLink className="h-3.5 w-3.5 mr-2" /> Open
                            </DropdownMenuItem>
                            {isImage && (
                              <DropdownMenuItem onClick={() => setLightboxAttachment(att)}>
                                <Eye className="h-3.5 w-3.5 mr-2" /> Preview
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => {
                                navigator.clipboard.writeText(att.publicUrl);
                                alert("Link copied to clipboard!");
                              }}
                            >
                              <Copy className="h-3.5 w-3.5 mr-2" /> Copy Link
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setEditingAttachment(att);
                                setEditName(att.originalName);
                                setEditUrl(att.publicUrl);
                              }}
                            >
                              <Edit2 className="h-3.5 w-3.5 mr-2" /> Rename
                            </DropdownMenuItem>
                            {att.type === 'file' && (
                              <DropdownMenuItem onClick={() => handleReplaceFileSelect(att)}>
                                <RefreshCw className="h-3.5 w-3.5 mr-2" /> Replace File
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => {
                                setDeletingAttachment(att);
                                setDeletePermanent(att.type === 'file');
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Empty State Illustration */
              <div className="border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl p-8 text-center bg-zinc-50/20">
                <Paperclip className="h-6 w-6 text-zinc-300 dark:text-zinc-700 mx-auto mb-2" />
                <p className="text-xs font-semibold text-muted-foreground">No attachments yet</p>
                <p className="text-[10px] text-muted-foreground/80 mt-0.5">Drag files in or add links to get started</p>
              </div>
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
                    onUploadFiles={handleUploadFiles}
                    onAddLink={() => setShowLinkModal(true)}
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
<div className="hidden lg:flex lg:w-96 border-t lg:border-t-0 lg:border-l border-border bg-card text-card-foreground flex-col shrink-0 min-h-0 h-full">
  <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
    <div className="p-4 lg:p-6 space-y-4">
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
                <SelectContent position="popper" className="bg-card text-card-foreground border border-border rounded-xl shadow-lg max-h-72 overflow-y-auto z-[110]">
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
            <div 
              onClick={() => setIsDetailsCollapsed(!isDetailsCollapsed)}
              className="flex items-center justify-between px-4 py-2.5 bg-muted/50 border-b select-none cursor-pointer hover:bg-muted/70 transition-colors"
            >
              <div className="flex items-center gap-1.5">
                {isDetailsCollapsed ? (
                  <ChevronRight className="h-4.5 w-4.5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4.5 w-4.5 text-muted-foreground" />
                )}
                <span className="font-bold text-[#172b4d] text-xs">Details</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAISuggestFields();
                  }}
                  disabled={isSuggestingMeta}
                  className="p-1 hover:bg-muted rounded text-indigo-550 hover:text-indigo-650 cursor-pointer focus:outline-none disabled:opacity-50"
                  title="Ask AI to Suggest Fields"
                >
                  {isSuggestingMeta ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-500" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5 text-indigo-550 animate-pulse" />
                  )}
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                      className="p-0.5 hover:bg-muted rounded text-zinc-550 cursor-pointer focus:outline-none"
                    >
                      <Settings className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 z-50 bg-card border border-border" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenuItem onClick={handleResetDetails} className="cursor-pointer">
                      <RefreshCw className="h-3.5 w-3.5 mr-2" /> Reset details
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleCopyLink} className="cursor-pointer">
                      {copiedLink ? <Check className="h-3.5 w-3.5 mr-2 text-emerald-600" /> : <Share2 className="h-3.5 w-3.5 mr-2" />} Share card
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={handleDeleteItem}
                      className="cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete card
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Details grid list */}
            {!isDetailsCollapsed && (
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
                    <SelectContent position="popper" className="bg-card text-card-foreground border border-border rounded-xl shadow-lg max-h-72 overflow-y-auto z-[110]">
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
                <SelectContent position="popper" className="bg-card text-card-foreground border border-border rounded-xl shadow-lg max-h-72 overflow-y-auto z-[110]">
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
                  <SelectContent position="popper" className="bg-card text-card-foreground border border-border rounded-xl shadow-lg max-h-72 overflow-y-auto z-[110]">
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
                {/* AI pick milestone */}
                {milestonesData?.milestones?.length && milestonesData?.milestones?.length > 0 && (
                  <button
                    onClick={handleAISuggestMilestone}
                    disabled={isSuggestingMilestone}
                    title="AI pick best milestone"
                    className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/20 border border-violet-200/60 dark:border-violet-800/30 cursor-pointer transition-colors disabled:opacity-50"
                  >
                    {isSuggestingMilestone
                      ? <Loader2 className="h-3 w-3 animate-spin" />
                      : <Sparkles className="h-3 w-3 animate-pulse" />}
                  </button>
                )}
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
                  <PopoverContent className="w-64 bg-card text-card-foreground border border-border shadow-xl rounded-xl p-3 text-xs">
                    {/* Header with AI button */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-bold text-foreground text-sm">Task Labels</span>
                      <button
                        onClick={handleAIGenerateLabels}
                        disabled={isGeneratingLabels}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-gradient-to-r from-violet-500/10 to-indigo-500/10 text-violet-600 dark:text-violet-400 hover:from-violet-500/20 hover:to-indigo-500/20 border border-violet-300/40 dark:border-violet-700/30 cursor-pointer transition-all disabled:opacity-50"
                      >
                        {isGeneratingLabels
                          ? <><Loader2 className="h-3 w-3 animate-spin" /> Generating...</>
                          : <><Sparkles className="h-3 w-3 animate-pulse" /> Generate with AI</>}
                      </button>
                    </div>

                    {/* Search labels */}
                    <input
                      type="text"
                      placeholder="Search or create..."
                      value={labelSearch}
                      onChange={(e) => setLabelSearch(e.target.value)}
                      className="w-full border border-border rounded-lg px-2.5 py-1.5 mb-2 focus:outline-none focus:border-primary/50 font-semibold text-xs bg-transparent"
                    />

                    <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
                      {filteredLabelsForPopover.length === 0 ? (
                        <div className="text-muted-foreground italic text-center py-4 select-none text-xs">No labels found</div>
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
                                  className="w-3.5 h-3.5 text-primary border-border rounded focus:ring-indigo-500 cursor-pointer accent-indigo-500"
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
                                  const ok = await confirm({
                                    title: "Delete Label",
                                    description: `Are you sure you want to permanently delete label "${l.name}"?`,
                                    confirmText: "Delete",
                                    cancelText: "Cancel",
                                    variant: "destructive"
                                  });
                                  if (ok) {
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

              {/* Source Document Traceability */}
              {item.source && (
                <>
                  <span className="text-[#5e6c84] font-semibold text-xs">Source</span>
                  <div className="flex items-center gap-1.5 w-full">
                    <Badge variant="outline" className="h-7 px-2.5 text-xs font-bold bg-muted/40 text-muted-foreground border-border rounded-md max-w-full truncate" title={`Source: ${item.source}`}>
                      <Link className="h-3.5 w-3.5 mr-1 inline shrink-0" />
                      <span className="truncate">{item.source}</span>
                    </Badge>
                  </div>
                </>
              )}

            </div>
            )}
          </div>
              {/* Development Accordion Panel */}
          {integrationsActive ? (
            loadingDev ? (
              <div className="mt-4 rounded-2xl border border-border overflow-hidden bg-card shadow-sm p-4 space-y-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-6 h-6 rounded-lg" />
                  <Skeleton className="h-4 w-28 rounded" />
                  <Skeleton className="h-4 w-16 rounded-full" />
                </div>
                <div className="flex items-center gap-2 border-b border-border pb-2">
                  <Skeleton className="h-7 w-20 rounded" />
                  <Skeleton className="h-7 w-20 rounded" />
                  <Skeleton className="h-7 w-20 rounded" />
                  <Skeleton className="h-7 w-20 rounded" />
                  <Skeleton className="h-7 w-20 rounded" />
                </div>
                <div className="space-y-3 pt-2">
                  <div className="flex justify-between items-center">
                    <Skeleton className="h-3 w-16 rounded" />
                    <Skeleton className="h-5 w-40 rounded" />
                  </div>
                  <div className="flex justify-between items-center">
                    <Skeleton className="h-3 w-14 rounded" />
                    <Skeleton className="h-5 w-32 rounded" />
                  </div>
                  <Skeleton className="h-px w-full" />
                  <div className="grid grid-cols-2 gap-3">
                    <Skeleton className="h-14 rounded-xl" />
                    <Skeleton className="h-14 rounded-xl" />
                    <Skeleton className="h-14 rounded-xl" />
                    <Skeleton className="h-14 rounded-xl" />
                  </div>
                </div>
              </div>
            ) : devError || !development ? (
              <div className="mt-4 rounded-2xl border border-border overflow-hidden bg-card shadow-sm p-4 text-xs text-red-500 italic">
                Failed to load development logs.
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-border overflow-hidden bg-card shadow-sm">
                {/* Header */}
                <div className="flex flex-col border-b border-border bg-gradient-to-r from-indigo-500/5 via-transparent to-transparent">
                  <div 
                    onClick={() => setIsDevCollapsed(!isDevCollapsed)}
                    className="flex items-center justify-between px-4 pt-3.5 pb-2 select-none cursor-pointer hover:bg-muted/10 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      {isDevCollapsed ? (
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                      <div className="w-6 h-6 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0">
                        <GitBranch className="h-3.5 w-3.5 text-indigo-500" />
                      </div>
                      <span className="font-black text-foreground text-xs tracking-tight">Development</span>
                      {/* Branch pill — show only the short segment, truncated */}
                      {!isDevCollapsed && (item.githubBranchName || item.gitlabBranchName) && (() => {
                        const fullBranch = item.githubBranchName || item.gitlabBranchName || '';
                        const parts = fullBranch.split('/');
                        const prefix = parts.length > 1 ? parts[0] : null;
                        const shortName = parts.slice(-1)[0];
                        return (
                          <span className="hidden sm:inline-flex items-center gap-1 max-w-[160px] overflow-hidden text-[9px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 pl-1.5 pr-2 py-0.5 rounded-full border border-indigo-500/20 font-mono shrink-0">
                            <GitBranch className="h-2.5 w-2.5 shrink-0" />
                            {prefix && <span className="text-indigo-400/60 shrink-0">{prefix}/</span>}
                            <span className="truncate">{shortName}</span>
                          </span>
                        );
                      })()}
                    </div>

                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <span className="text-[10px] font-black uppercase tracking-wider bg-muted/60 text-muted-foreground px-2 py-0.5 rounded border border-border/60">
                        {devPlatform === 'github' ? 'GitHub' : 'GitLab'}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async (e) => {
                          e.stopPropagation();
                          setIsRefreshingDev(true);
                          try {
                            await refetchDev().unwrap();
                            toast.success('Development data refreshed');
                          } catch {
                            toast.error('Failed to refresh development data');
                          } finally {
                            setIsRefreshingDev(false);
                          }
                        }}
                        className="h-7 w-7 p-0 hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer rounded-lg border border-border/60"
                      >
                        <RefreshCw className={`h-3 w-3 ${isRefreshingDev ? 'animate-spin' : ''}`} />
                      </Button>
                    </div>
                  </div>

                  {/* Navigation Tab Bar */}
                  {!isDevCollapsed && (
                    <div className="flex gap-1.5 px-3 border-t border-border/40 overflow-x-auto scrollbar-none select-none py-1.5">
                    {[
                      { id: 'overview', label: 'Overview', icon: <Activity className="h-3 w-3" /> },
                      { id: 'branches', label: 'Branches', icon: <GitBranch className="h-3 w-3" /> },
                      { id: 'commits', label: 'Commits', icon: <GitCommit className="h-3 w-3" /> },
                      { id: 'prs', label: devPlatform === 'github' ? 'PRs' : 'MRs', icon: <GitPullRequest className="h-3 w-3" /> },
                      { id: 'deployments', label: 'CI/CD', icon: <Globe className="h-3 w-3" /> },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => {
                          setActiveDevTab(tab.id as any);
                          setPopoverTab('main');
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs cursor-pointer transition-all duration-150 relative ${
                          activeDevTab === tab.id
                            ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/10'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                        }`}
                      >
                        {tab.icon}
                        <span>{tab.label}</span>
                        {tab.id === 'branches' && development.branches?.length > 0 && (
                          <span className="text-[9px] font-black px-1.5 py-0.2 bg-muted-foreground/10 rounded-full">{development.branches.length}</span>
                        )}
                        {tab.id === 'commits' && development.commits?.length > 0 && (
                          <span className="text-[9px] font-black px-1.5 py-0.2 bg-muted-foreground/10 rounded-full">{development.commits.length}</span>
                        )}
                        {tab.id === 'prs' && development.pullRequests?.length > 0 && (
                          <span className="text-[9px] font-black px-1.5 py-0.2 bg-muted-foreground/10 rounded-full">{development.pullRequests.length}</span>
                        )}
                      </button>
                    ))}
                  </div>
                  )}
                </div>

                {/* Card Body */}
                {!isDevCollapsed && (
                  <div className="p-4 bg-card text-foreground select-none">
                  {activeDevTab === 'overview' && (
                    <div className="space-y-4">
                      {/* Repository info */}
                      <div className="flex items-center justify-between gap-3 bg-muted/20 border border-border/45 p-3 rounded-xl">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center shrink-0 border border-border/40">
                            {devPlatform === 'github' ? (
                              <svg viewBox="0 0 24 24" className="h-4 w-4 text-white fill-current"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" /></svg>
                            ) : (
                              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-[#FC6D26]"><path d="M22.65 14.39L12 22.13 1.35 14.39a.84.84 0 0 1-.3-.94l1.22-3.78 2.44-7.51A.42.42 0 0 1 4.82 2a.43.43 0 0 1 .58 0 .42.42 0 0 1 .11.18l2.44 7.49h8.1l2.44-7.51A.42.42 0 0 1 18.6 2a.43.43 0 0 1 .58 0 .42.42 0 0 1 .11.18l2.44 7.51L23 13.45a.84.84 0 0 1-.35.94z" /></svg>
                            )}
                          </div>
                          <div className="min-w-0 flex flex-col gap-0.5">
                            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest leading-none">Active Repository</span>
                            {item.linkedRepo ? (
                              <span className="font-mono text-xs font-semibold text-foreground truncate select-all">{item.linkedRepo}</span>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">None linked</span>
                            )}
                          </div>
                        </div>
                        {item.linkedRepo ? (
                          <button
                            onClick={async () => {
                              try {
                                await linkItemRepo({ itemId: item._id, repo: '' }).unwrap();
                                toast.success('Repository unlinked');
                                refetchDev();
                              } catch (err: any) { toast.error(err.message || 'Failed to unlink'); }
                            }}
                            className="shrink-0 h-7 px-3 text-[10px] font-semibold text-muted-foreground hover:text-red-500 hover:bg-red-500/8 cursor-pointer rounded-lg border border-border/50 transition-colors"
                          >
                            Unlink
                          </button>
                        ) : (
                          <Popover>
                            <PopoverTrigger asChild>
                              <button className="shrink-0 h-7 px-3 text-[10px] font-semibold rounded-lg border border-dashed border-indigo-500/40 hover:border-indigo-500 hover:bg-indigo-500/5 text-indigo-600 dark:text-indigo-400 flex items-center gap-1 cursor-pointer transition-colors">
                                <Plus className="h-3 w-3" />Link Repo
                              </button>
                            </PopoverTrigger>
                            <PopoverContent align="end" className="w-64 p-2 bg-card border border-border shadow-xl rounded-xl z-[90]">
                              <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest px-2 py-1">Select Repository</div>
                              <div className="max-h-64 overflow-y-auto space-y-0.5 mt-1 pr-1">
                                {workspaceIntegrations?.integrations?.[devPlatform]?.linkedRepos?.length ? (
                                  workspaceIntegrations.integrations[devPlatform].linkedRepos.map((r: string) => (
                                    <button
                                      key={r}
                                      onClick={async () => {
                                        try {
                                          await linkItemRepo({ itemId: item._id, repo: r }).unwrap();
                                          toast.success('Repository linked');
                                          refetchDev();
                                        } catch (err: any) { toast.error(err.message || 'Failed'); }
                                      }}
                                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs hover:bg-muted text-foreground font-semibold truncate cursor-pointer transition-colors"
                                    >
                                      {r}
                                    </button>
                                  ))
                                ) : (
                                  <div className="text-[10px] text-muted-foreground italic px-2.5 py-2">No repositories linked to workspace</div>
                                )}
                              </div>
                            </PopoverContent>
                          </Popover>
                        )}
                      </div>

                      {/* Active Branch info */}
                      <div className="flex items-center justify-between gap-3 bg-muted/20 border border-border/45 p-3 rounded-xl">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-indigo-500/8 flex items-center justify-center shrink-0 border border-indigo-500/15">
                            <GitBranch className="h-4 w-4 text-indigo-500" />
                          </div>
                          <div className="min-w-0 flex flex-col gap-0.5">
                            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest leading-none">Active Branch</span>
                            {item.githubBranchName || item.gitlabBranchName ? (() => {
                              const fullBranch = item.githubBranchName || item.gitlabBranchName || '';
                              const slashIdx = fullBranch.indexOf('/');
                              const prefix = slashIdx !== -1 ? fullBranch.slice(0, slashIdx + 1) : null;
                              const name = slashIdx !== -1 ? fullBranch.slice(slashIdx + 1) : fullBranch;
                              return (
                                <span className="font-mono text-xs font-semibold flex items-center gap-0.5 min-w-0 truncate">
                                  {prefix && <span className="text-muted-foreground/60 shrink-0">{prefix}</span>}
                                  <span className="text-indigo-600 dark:text-indigo-400 truncate">{name}</span>
                                </span>
                              );
                            })() : (
                              <span className="text-xs text-muted-foreground italic">None active</span>
                            )}
                          </div>
                        </div>

                        {item.githubBranchName || item.gitlabBranchName ? (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => {
                                const branch = item.githubBranchName || item.gitlabBranchName || '';
                                navigator.clipboard.writeText(`git fetch && git checkout ${branch}`);
                                toast.success('Checkout command copied!');
                              }}
                              className="h-7 px-2.5 text-[10px] font-semibold text-muted-foreground hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-muted cursor-pointer rounded-lg border border-border/50 transition-colors flex items-center gap-1"
                              title="Copy git checkout command"
                            >
                              <Copy className="h-3 w-3" /> Cmd
                            </button>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(item.githubBranchName || item.gitlabBranchName || '');
                                toast.success('Branch name copied');
                              }}
                              className="h-7 px-2.5 text-[10px] font-semibold text-muted-foreground hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-muted cursor-pointer rounded-lg border border-border/50 transition-colors flex items-center gap-1"
                              title="Copy branch name"
                            >
                              <Copy className="h-3 w-3" /> Name
                            </button>
                          </div>
                        ) : (
                          <button
                            disabled={!item.linkedRepo}
                            onClick={() => {
                              const ticketKey = `${item.type.toUpperCase()}-${item._id.slice(-5).toUpperCase()}`;
                              const titleSlug = item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '').slice(0, 30);
                              setNewBranchName(`${item.type === 'Bug' ? 'bugfix' : 'feature'}/${ticketKey}-${titleSlug}`);
                              setActiveDevTab('create_branch');
                            }}
                            className="shrink-0 h-7 px-3 text-[10px] font-semibold cursor-pointer rounded-lg border border-dashed border-indigo-500/40 hover:border-indigo-500 hover:bg-indigo-500/5 text-indigo-600 dark:text-indigo-400 flex items-center gap-1 transition-colors disabled:opacity-40"
                          >
                            <Plus className="h-3 w-3" />Create Branch
                          </button>
                        )}
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: 'branches', label: 'Branches', count: development.branches?.length || 0, icon: <GitBranch className="h-3.5 w-3.5" />, color: 'indigo' },
                          { id: 'commits', label: 'Commits', count: development.commits?.length || 0, icon: <GitCommit className="h-3.5 w-3.5" />, color: 'indigo' },
                          { id: 'prs', label: devPlatform === 'github' ? 'Pull Requests' : 'Merge Requests', count: development.pullRequests?.length || 0, icon: <GitPullRequest className="h-3.5 w-3.5" />, color: 'violet' },
                        ].map(stat => (
                          <button
                            key={stat.id}
                            onClick={() => setActiveDevTab(stat.id as any)}
                            className="group flex items-center justify-between p-3 border border-border/60 hover:border-indigo-500/30 hover:bg-indigo-500/5 rounded-xl cursor-pointer transition-all duration-150 bg-muted/10 text-left"
                          >
                            <div className="flex flex-col gap-1">
                              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{stat.label}</span>
                              <span className="text-xl font-black text-foreground tabular-nums">{stat.count}</span>
                            </div>
                            <span className="text-indigo-500/40 group-hover:text-indigo-500 transition-colors">{stat.icon}</span>
                          </button>
                        ))}

                        {/* CI Status card */}
                        <button
                          onClick={() => setActiveDevTab('deployments')}
                          className="group flex items-center justify-between p-3 border border-border/60 hover:border-emerald-500/30 hover:bg-emerald-500/5 rounded-xl cursor-pointer transition-all duration-150 bg-muted/10 text-left"
                        >
                          <div className="flex flex-col gap-1">
                            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">CI Status</span>
                            {(() => {
                              const status = development.workflows?.[0]?.status;
                              const isPass = status === 'passed';
                              const isFail = status === 'failed';
                              return (
                                <span className={`text-sm font-black flex items-center gap-1 ${
                                  isPass ? 'text-emerald-500' : isFail ? 'text-red-500' : 'text-amber-500'
                                }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${
                                    isPass ? 'bg-emerald-500' : isFail ? 'bg-red-500' : 'bg-amber-400 animate-pulse'
                                  }`} />
                                  {isPass ? 'Passing' : isFail ? 'Failed' : status ? 'Running' : 'No runs'}
                                </span>
                              );
                            })()}
                          </div>
                          <Globe className="h-3.5 w-3.5 text-emerald-500/40 group-hover:text-emerald-500 transition-colors" />
                        </button>
                      </div>

                      {/* Quick Actions Row */}
                      {item.linkedRepo && (
                        <div className="pt-2 flex flex-wrap gap-2">
                          <Button
                            variant="ghost"
                            onClick={() => {
                              const branch = item.githubBranchName || item.gitlabBranchName;
                              if (branch) {
                                const prUrl = devPlatform === 'github'
                                  ? `https://github.com/${item.linkedRepo}/compare/${branch}?expand=1`
                                  : `https://gitlab.com/${item.linkedRepo}/-/merge_requests/new?merge_request%5Bsource_branch%5D=${encodeURIComponent(branch)}`;
                                window.open(prUrl, '_blank');
                              } else {
                                toast.error('Switch to a branch first to open a PR');
                              }
                            }}
                            disabled={!(item.githubBranchName || item.gitlabBranchName)}
                            className="flex items-center gap-1.5 h-8 px-3.5 text-xs font-semibold rounded-lg bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100/60 dark:hover:bg-indigo-950/40 border border-indigo-200/50 dark:border-indigo-900/30 cursor-pointer disabled:opacity-50"
                          >
                            <ArrowUpRight className="h-3.5 w-3.5" />
                            <span>Create Pull Request</span>
                          </Button>

                          <Button
                            variant="ghost"
                            onClick={() => {
                              const url = devPlatform === 'github'
                                ? `https://github.com/${item.linkedRepo}`
                               : `https://gitlab.com/${item.linkedRepo}`;
                              window.open(url, '_blank');
                            }}
                            className="flex items-center gap-1.5 h-8 px-3.5 text-xs font-semibold rounded-lg bg-muted text-foreground hover:bg-muted/85 border border-border/65 cursor-pointer"
                          >
                            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>View Repository</span>
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {activeDevTab === 'branches' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        {/* Search Bar */}
                        <div className="relative flex-1">
                          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                          <Input
                            value={branchSearchQuery}
                            onChange={(e) => setBranchSearchQuery(e.target.value)}
                            placeholder="Search branches..."
                            className="h-8.5 pl-8 text-xs bg-muted/40 border-border"
                          />
                        </div>

                        <Button
                          disabled={!item.linkedRepo}
                          onClick={() => {
                            const ticketKey = `${item.type.toUpperCase()}-${item._id.slice(-5).toUpperCase()}`;
                            const titleSlug = item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '').slice(0, 30);
                            setNewBranchName(`${item.type === 'Bug' ? 'bugfix' : 'feature'}/${ticketKey}-${titleSlug}`);
                            setActiveDevTab('create_branch');
                          }}
                          className="h-8.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg px-3 cursor-pointer"
                        >
                          <Plus className="h-3.5 w-3.5 mr-1" /> New Branch
                        </Button>
                      </div>

                      {/* Branch list */}
                      <div className="space-y-1.5 pr-1">
                        {development.branches?.length ? (
                          development.branches
                            .filter((b: any) => b.name.toLowerCase().includes(branchSearchQuery.toLowerCase()))
                            .map((b: any) => {
                              const isActive = (item.githubBranchName || item.gitlabBranchName) === b.name;
                              return (
                                <div
                                  key={b.name}
                                  className={`flex items-center justify-between p-2 rounded-lg border transition-all duration-155 ${
                                    isActive
                                      ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20'
                                      : 'bg-muted/10 border-border/40 hover:bg-muted/40'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <GitBranch className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-indigo-500' : 'text-muted-foreground/60'}`} />
                                    <span className="font-mono text-xs font-semibold truncate leading-none">{b.name}</span>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    {isActive ? (
                                      <span className="text-[10px] font-black uppercase text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">Active</span>
                                    ) : (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={async () => {
                                          try {
                                            await createItemBranch({ itemId: item._id, repo: item.linkedRepo || '', branchName: b.name, baseBranch: '' }).unwrap();
                                            toast.success(`Switched active branch reference to ${b.name}`);
                                            refetchDev();
                                          } catch (err: any) {
                                            toast.error(err?.data?.message || 'Failed to switch branch reference');
                                          }
                                        }}
                                        className="h-6 px-2 text-[10px] font-bold text-muted-foreground hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-muted rounded-md cursor-pointer"
                                      >
                                        Use Branch
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              );
                            })
                        ) : (
                          <div className="text-muted-foreground italic text-xs px-2 py-4 text-center">No branches found</div>
                        )}
                      </div>
                    </div>
                  )}

                  {activeDevTab === 'commits' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-border pb-1.5 mb-1">
                        <span className="text-xs font-black text-muted-foreground uppercase tracking-wider">Commit History</span>
                        <span className="text-[10px] text-muted-foreground italic">{development.commits?.length || 0} commits total</span>
                      </div>
                      <div className="relative pr-1 pl-3.5 space-y-4">
                        {development.commits?.length > 1 && (
                          <div className="absolute left-1.5 top-1.5 bottom-1.5 w-0.5 bg-border/60" />
                        )}
                        {development.commits?.length ? (
                          development.commits.map((c: any) => (
                            <div key={c.sha} className="relative flex gap-3.5 text-xs">
                              <div className="absolute -left-[15px] top-1.5 w-2 h-2 rounded-full bg-indigo-500 border border-background z-10 shrink-0" />
                              <div className="min-w-0 flex-1 bg-muted/10 border border-border/40 p-2.5 rounded-xl hover:bg-muted/20 transition-all duration-150">
                                <p className="text-xs font-bold text-foreground leading-snug">{c.message}</p>
                                <div className="flex items-center justify-between gap-2 mt-2 pt-1.5 border-t border-border/40 text-[10px] text-muted-foreground select-none">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="font-semibold text-foreground/80 truncate">{c.author}</span>
                                    <span>•</span>
                                    <span className="font-mono text-indigo-500 font-bold bg-indigo-500/5 px-1.5 py-0.2 rounded border border-indigo-500/10 select-all cursor-pointer" onClick={() => { navigator.clipboard.writeText(c.sha); toast.success('SHA copied'); }}>
                                      {c.sha?.slice(0, 7)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-muted-foreground italic text-xs py-4 text-center pl-0">No commits found</div>
                        )}
                      </div>
                    </div>
                  )}

                  {activeDevTab === 'prs' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between border-b border-border pb-1.5 mb-1">
                        <span className="text-xs font-black text-muted-foreground uppercase tracking-wider">Pull Requests</span>
                        <span className="text-[10px] text-muted-foreground italic">{development.pullRequests?.length || 0} total</span>
                      </div>
                      <div className="space-y-2 pr-1">
                        {development.pullRequests?.length ? (
                          development.pullRequests.map((pr: any) => {
                            const isOpen = pr.state === 'open';
                            const isMerged = pr.state === 'merged';
                            return (
                              <a
                                key={pr.id}
                                href={pr.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex flex-col gap-2 p-3 rounded-xl bg-muted/10 border border-border/40 hover:bg-muted/40 transition-all duration-150 block cursor-pointer"
                              >
                                <div className="flex items-start justify-between gap-3.5">
                                  <p className="text-xs font-bold text-foreground hover:text-indigo-500 transition-colors leading-snug min-w-0 flex-1 truncate">
                                    {pr.title}
                                  </p>
                                  <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border shrink-0 ${
                                    isOpen ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                    : isMerged ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
                                    : 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20'
                                  }`}>{pr.state}</span>
                                </div>
                                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                                  <span className="font-mono">#{pr.id?.split('/').pop() || pr.id}</span>
                                  <span className="flex items-center gap-1 hover:underline">
                                    Open on GitHub <ArrowUpRight className="h-3 w-3" />
                                  </span>
                                </div>
                              </a>
                            );
                          })
                        ) : (
                          <div className="text-muted-foreground italic text-xs py-4 text-center">No pull requests found</div>
                        )}
                      </div>
                    </div>
                  )}

                  {activeDevTab === 'deployments' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between border-b border-border pb-1.5 mb-1">
                        <span className="text-xs font-black text-muted-foreground uppercase tracking-wider">Workflows & CI</span>
                        <span className="text-[10px] text-muted-foreground italic">{development.workflows?.length || 0} runs total</span>
                      </div>
                      <div className="space-y-2 pr-1">
                        {development.workflows?.length ? (
                          development.workflows.map((w: any, i: number) => {
                            const isPassed = w.status === 'passed';
                            const isFailed = w.status === 'failed';
                            return (
                              <div
                                key={i}
                                className="flex items-center justify-between p-3 rounded-xl bg-muted/10 border border-border/40"
                              >
                                <div className="min-w-0 flex flex-col gap-0.5">
                                  <p className="text-xs font-bold text-foreground truncate leading-none">{w.name}</p>
                                  <span className="font-mono text-[10px] text-muted-foreground truncate flex items-center gap-1 mt-1">
                                    <GitBranch className="h-2.5 w-2.5 shrink-0" />
                                    {w.branch}
                                  </span>
                                </div>
                                <span className={`text-[10px] font-black uppercase px-2.5 py-0.8 rounded-full border shrink-0 ${
                                  isPassed ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                  : isFailed ? 'bg-red-500/10 text-red-500 border-red-500/20'
                                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 animate-pulse'
                                }`}>{w.status === 'passed' ? '✓ Passed' : w.status === 'failed' ? '✗ Failed' : 'Running'}</span>
                              </div>
                            );
                          })
                        ) : (
                          <div className="text-muted-foreground italic text-xs py-4 text-center">No deployments found</div>
                        )}
                      </div>
                    </div>
                  )}

                  {activeDevTab === 'create_branch' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-border pb-1.5 select-none">
                        <span className="text-xs font-black text-muted-foreground uppercase tracking-wider">Create New Branch</span>
                        <button
                          onClick={() => setActiveDevTab('overview')}
                          className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>

                      <div className="space-y-3.5">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Branch Name</label>
                          <div className="flex gap-2">
                            <Input
                              value={newBranchName}
                              onChange={(e) => setNewBranchName(e.target.value)}
                              placeholder="feature/ticket-title"
                              className="h-8.5 text-xs font-mono bg-muted/40 border-border"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const ticketKey = `${item.type.toUpperCase()}-${item._id.slice(-5).toUpperCase()}`;
                                const titleSlug = item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '').slice(0, 30);
                                setNewBranchName(`${item.type === 'Bug' ? 'bugfix' : 'feature'}/${ticketKey}-${titleSlug}`);
                              }}
                              className="h-8.5 border border-border px-2 text-[10px] font-bold cursor-pointer hover:bg-muted text-muted-foreground"
                              title="Reset to default ticket name"
                            >
                              Autogen
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Base Branch</label>
                          <Input
                            value={baseBranch}
                            onChange={(e) => setBaseBranch(e.target.value)}
                            placeholder="main"
                            className="h-8.5 text-xs font-mono bg-muted/40 border-border"
                          />
                        </div>

                        <Button
                          disabled={!newBranchName.trim() || isCreatingBranch}
                          onClick={async () => {
                            setIsCreatingBranch(true);
                            try {
                              await createItemBranch({ itemId: item._id, repo: item.linkedRepo || '', branchName: newBranchName.trim(), baseBranch: baseBranch.trim() || 'main' }).unwrap();
                              toast.success(`Branch "${newBranchName}" created successfully!`);
                              setActiveDevTab('overview');
                              refetchDev();
                            } catch (err: any) {
                              toast.error(err?.data?.message || 'Failed to create branch');
                            } finally {
                              setIsCreatingBranch(false);
                            }
                          }}
                          className="w-full h-9.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg border-0 cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          {isCreatingBranch ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              <span>Creating Branch...</span>
                            </>
                          ) : (
                            <span>Create Branch Reference</span>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
                )}
              </div>
            )
          ) : (
            <div className="mt-4 rounded-2xl border border-border bg-card p-5 text-xs select-none shadow-sm">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center">
                  <GitBranch className="h-4 w-4 text-muted-foreground" />
                </div>
                <span className="font-black text-foreground tracking-tight">Development Integration</span>
              </div>
              <p className="text-muted-foreground leading-relaxed text-[11px]">
                Connect GitHub or GitLab in your{' '}
                <button onClick={() => navigate('/')} className="text-indigo-600 dark:text-indigo-400 hover:underline font-bold cursor-pointer">
                  Workspace Profile
                </button>{' '}
                to link branches, commits, builds, and deployments directly to issues.
              </p>
            </div>
          )}
          <div className="pt-2 pl-1.5 space-y-1 text-[11px] text-muted-foreground select-none">
            <div>Created {new Date(item.createdAt).toLocaleDateString([], { day: "numeric", month: "long", year: "numeric" })} at {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        </div>
      </div>
    </div>
  </div>

      {/* POPUP DIALOGS */}
      {/* ADD LINK MODAL */}
      <CustomDialog open={showLinkModal} onOpenChange={setShowLinkModal}>
        <DialogContent className="max-w-[400px] w-full p-6 border border-border shadow-2xl bg-card rounded-2xl focus:outline-none">
          <DialogTitle className="text-sm font-bold text-foreground">Attach external link</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-1">
            Attach a URL link to this task.
          </DialogDescription>
          <div className="space-y-4 mt-4">
            <div className="space-y-1.5">
              <label htmlFor="link-url-input" className="text-[11px] font-bold text-muted-foreground uppercase">Link URL</label>
              <Input
                id="link-url-input"
                type="text"
                placeholder="https://example.com"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                className="w-full text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="link-title-input" className="text-[11px] font-bold text-muted-foreground uppercase">Link Title (Optional)</label>
              <Input
                id="link-title-input"
                type="text"
                placeholder="My Document"
                value={linkTitle}
                onChange={(e) => setLinkTitle(e.target.value)}
                className="w-full text-xs"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => { setShowLinkModal(false); setLinkUrl(""); setLinkTitle(""); }}
                className="text-xs h-8 px-4 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddLink}
                className="bg-[#0052cc] hover:bg-[#0065ff] text-white text-xs h-8 px-4 rounded-xl"
              >
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </CustomDialog>

      {/* RENAME / EDIT ATTACHMENT MODAL */}
      <CustomDialog open={!!editingAttachment} onOpenChange={(val) => !val && setEditingAttachment(null)}>
        <DialogContent className="max-w-[400px] w-full p-6 border border-border shadow-2xl bg-card rounded-2xl focus:outline-none">
          <DialogTitle className="text-sm font-bold text-foreground">
            {editingAttachment?.type === 'link' ? 'Edit Link' : 'Rename Attachment'}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-1">
            Update the details of your attachment.
          </DialogDescription>
          <div className="space-y-4 mt-4">
            <div className="space-y-1.5">
              <label htmlFor="edit-name-input" className="text-[11px] font-bold text-muted-foreground uppercase">
                {editingAttachment?.type === 'link' ? 'Link Title' : 'File Name'}
              </label>
              <Input
                id="edit-name-input"
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full text-xs"
              />
            </div>
            {editingAttachment?.type === 'link' && (
              <div className="space-y-1.5">
                <label htmlFor="edit-url-input" className="text-[11px] font-bold text-muted-foreground uppercase">Link URL</label>
                <Input
                  id="edit-url-input"
                  type="text"
                  value={editUrl}
                  onChange={(e) => setEditUrl(e.target.value)}
                  className="w-full text-xs"
                />
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setEditingAttachment(null)}
                className="text-xs h-8 px-4 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={handleEditAttachment}
                className="bg-[#0052cc] hover:bg-[#0065ff] text-white text-xs h-8 px-4 rounded-xl"
              >
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </CustomDialog>

      {/* DELETE CONFIRMATION MODAL */}
      <CustomDialog open={!!deletingAttachment} onOpenChange={(val) => !val && setDeletingAttachment(null)}>
        <DialogContent className="max-w-[400px] w-full p-6 border border-border shadow-2xl bg-card rounded-2xl focus:outline-none">
          <DialogTitle className="text-sm font-bold text-foreground">Delete Attachment</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-1">
            Are you sure you want to delete this attachment? This action cannot be undone.
          </DialogDescription>
          <div className="space-y-4 mt-4">
            {deletingAttachment?.type === 'file' && (
              <div className="border border-border p-3.5 rounded-xl space-y-2.5 bg-zinc-50/50 dark:bg-zinc-900/10">
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Choose deletion method:</p>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                    <input
                      type="radio"
                      name="deleteMethod"
                      checked={!deletePermanent}
                      onChange={() => setDeletePermanent(false)}
                      className="h-3.5 w-3.5 text-primary accent-primary"
                    />
                    <span>Remove from issue only</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                    <input
                      type="radio"
                      name="deleteMethod"
                      checked={deletePermanent}
                      onChange={() => setDeletePermanent(true)}
                      className="h-3.5 w-3.5 text-primary accent-primary"
                    />
                    <span className="text-red-600 dark:text-red-500 font-bold">Delete permanently from cloud storage</span>
                  </label>
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setDeletingAttachment(null)}
                className="text-xs h-8 px-4 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteAttachment}
                className="text-xs h-8 px-4 rounded-xl"
              >
                Delete
              </Button>
            </div>
          </div>
        </DialogContent>
      </CustomDialog>

      {/* LIGHTBOX MODAL */}
      <CustomDialog open={!!lightboxAttachment} onOpenChange={(val) => !val && setLightboxAttachment(null)}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-1 border border-border shadow-2xl bg-black rounded-2xl overflow-hidden flex flex-col items-center justify-center focus:outline-none">
          <DialogTitle className="sr-only">Image Preview</DialogTitle>
          <DialogDescription className="sr-only">Lightbox image view</DialogDescription>
          {lightboxAttachment && (
            <div className="relative w-full h-full flex flex-col items-center justify-center p-2">
              <img
                src={lightboxAttachment.publicUrl}
                alt={lightboxAttachment.originalName}
                className="max-w-full max-h-[80vh] object-contain rounded-lg"
              />
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/75 px-4 py-1.5 rounded-full text-white text-xs select-none">
                {lightboxAttachment.originalName}
              </div>
            </div>
          )}
        </DialogContent>
      </CustomDialog>
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

function DescriptionEditor({
  initialDescription,
  onSave,
  onUploadFiles,
  onAddLink,
}: {
  initialDescription: string;
  onSave: (val: string) => void;
  onUploadFiles: (files: File[]) => void;
  onAddLink: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(initialDescription);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setValue(initialDescription);
  }, [initialDescription]);

  const handleSave = () => {
    onSave(value);
    setIsEditing(false);
  };

  const insertText = (before: string, after: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.slice(start, end);
    const replacement = before + selected + after;
    setValue(text.slice(0, start) + replacement + text.slice(end));
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selected.length);
    }, 0);
  };

  if (isEditing) {
    return (
      <div className="space-y-0 border border-zinc-250 focus-within:border-blue-500 rounded-lg overflow-hidden bg-card text-card-foreground">
        {/* Rich editor style toolbar */}
        <div className="flex items-center gap-1 bg-zinc-50 dark:bg-zinc-800 border-b border-border p-1.5 rounded-t-lg select-none">
          <button
            type="button"
            onClick={() => insertText("**", "**")}
            className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded text-muted-foreground hover:text-foreground cursor-pointer"
            title="Bold"
          >
            <Bold className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertText("*", "*")}
            className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded text-muted-foreground hover:text-foreground cursor-pointer"
            title="Italic"
          >
            <Italic className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertText("`", "`")}
            className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded text-muted-foreground hover:text-foreground cursor-pointer"
            title="Code block"
          >
            <Code className="h-3.5 w-3.5" />
          </button>
          
          <div className="h-4 w-px bg-border mx-1" />

          <button
            type="button"
            onClick={() => insertText("- ", "")}
            className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded text-muted-foreground hover:text-foreground cursor-pointer"
            title="Bullet list"
          >
            <List className="h-3.5 w-3.5" />
          </button>

          <div className="h-4 w-px bg-border mx-1" />

          <button
            type="button"
            onClick={onAddLink}
            className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded text-muted-foreground hover:text-foreground cursor-pointer"
            title="Link"
          >
            <Link className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded text-muted-foreground hover:text-foreground cursor-pointer"
            title="Attach file"
          >
            <Paperclip className="h-3.5 w-3.5" />
          </button>

          <div className="h-4 w-px bg-border mx-1" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded text-muted-foreground hover:text-foreground cursor-pointer flex items-center gap-0.5"
                title="Insert"
              >
                <Plus className="h-3.5 w-3.5" />
                <ChevronDown className="h-2.5 w-2.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-40 z-50">
              <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                <Paperclip className="h-3.5 w-3.5 mr-2" /> Attachment
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onAddLink}>
                <Link className="h-3.5 w-3.5 mr-2" /> Link
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              onUploadFiles(Array.from(e.target.files));
            }
          }}
          multiple
          className="hidden"
        />

        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Add a detailed description..."
          className="min-h-[120px] resize-none border-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent text-foreground shadow-none rounded-none focus-visible:outline-none focus:outline-none"
          autoFocus
        />
        
        <div className="flex gap-2 p-1.5 bg-zinc-50/50 dark:bg-zinc-900/10 border-t border-border">
          <Button
            onClick={handleSave}
            size="sm"
            className="bg-[#0052cc] hover:bg-[#0065ff] text-white font-bold h-7 text-xs px-4"
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
            className="hover:bg-muted font-bold text-muted-foreground h-7 text-xs px-3"
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
      className="min-h-[60px] p-2 hover:bg-background cursor-pointer text-sm text-[#172b4d] leading-relaxed transition-all select-none rounded border border-transparent hover:border-border/30"
    >
      {value ? (
        <div className="md-preview">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
        </div>
      ) : (
        <span className="text-muted-foreground italic">Edit description</span>
      )}
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
  onUploadFiles,
  onAddLink,
}: {
  user: any;
  workspaceMembers: any[];
  onPostComment: (text: string) => Promise<void>;
  onUploadFiles: (files: File[]) => void;
  onAddLink: () => void;
}) {
  const [commentInput, setCommentInput] = useState("");
  const [mentionSearch, setMentionSearch] = useState("");
  const [mentionTriggerIndex, setMentionTriggerIndex] = useState(-1);
  const [showMentionsDropdown, setShowMentionsDropdown] = useState(false);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const commentSectionRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const insertText = (before: string, after: string) => {
    const textarea = commentSectionRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.slice(start, end);
    const replacement = before + selected + after;
    setCommentInput(text.slice(0, start) + replacement + text.slice(end));
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selected.length);
    }, 0);
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
      <div className="flex-1 border border-zinc-250 focus-within:border-blue-500 rounded-lg overflow-hidden bg-card text-card-foreground">
        
        {/* Jira rich text editor toolbar */}
        <div className="flex items-center gap-1 bg-zinc-50 dark:bg-zinc-800 border-b border-border p-1.5 rounded-t-lg select-none">
          <button
            type="button"
            onClick={() => insertText("**", "**")}
            className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded text-muted-foreground hover:text-foreground cursor-pointer"
            title="Bold"
          >
            <Bold className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertText("*", "*")}
            className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded text-muted-foreground hover:text-foreground cursor-pointer"
            title="Italic"
          >
            <Italic className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertText("`", "`")}
            className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded text-muted-foreground hover:text-foreground cursor-pointer"
            title="Code block"
          >
            <Code className="h-3.5 w-3.5" />
          </button>
          
          <div className="h-4 w-px bg-border mx-1" />

          <button
            type="button"
            onClick={() => insertText("- ", "")}
            className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded text-muted-foreground hover:text-foreground cursor-pointer"
            title="Bullet list"
          >
            <List className="h-3.5 w-3.5" />
          </button>

          <div className="h-4 w-px bg-border mx-1" />

          <button
            type="button"
            onClick={onAddLink}
            className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded text-muted-foreground hover:text-foreground cursor-pointer"
            title="Link"
          >
            <Link className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded text-muted-foreground hover:text-foreground cursor-pointer"
            title="Attach file"
          >
            <Paperclip className="h-3.5 w-3.5" />
          </button>

          <div className="h-4 w-px bg-border mx-1" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded text-muted-foreground hover:text-foreground cursor-pointer flex items-center gap-0.5"
                title="Insert"
              >
                <Plus className="h-3.5 w-3.5" />
                <ChevronDown className="h-2.5 w-2.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-40 z-50">
              <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                <Paperclip className="h-3.5 w-3.5 mr-2" /> Attachment
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onAddLink}>
                <Link className="h-3.5 w-3.5 mr-2" /> Link
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              onUploadFiles(Array.from(e.target.files));
            }
          }}
          multiple
          className="hidden"
        />

        <div className="relative">
          <Textarea
            ref={commentSectionRef}
            id="comment-textarea"
            placeholder="Add a comment... (Press Enter to send, Shift+Enter for newline, @ to mention)"
            value={commentInput}
            onChange={handleCommentChange}
            onKeyDown={handleCommentKeyDown}
            className="min-h-[80px] resize-none border-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent text-foreground shadow-none rounded-none focus-visible:outline-none focus:outline-none"
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
        </div>

        <div className="flex flex-wrap gap-1.5 text-xs text-zinc-550 select-none p-1.5 bg-zinc-50/10">
          <button
            onClick={() => setCommentInput("Who is working on this...?")}
            className="px-2.5 py-1 border rounded-full bg-background hover:bg-muted cursor-pointer font-medium text-[10px]"
          >
            Who is working on this...?
          </button>
          <button
            onClick={() => setCommentInput("Can I get more info...?")}
            className="px-2.5 py-1 border rounded-full bg-background hover:bg-muted cursor-pointer font-medium text-[10px]"
          >
            Can I get more info...?
          </button>
          <button
            onClick={() => setCommentInput("Status update...")}
            className="px-2.5 py-1 border rounded-full bg-background hover:bg-muted cursor-pointer font-medium text-[10px]"
          >
            Status update...
          </button>
        </div>

        <div className="flex justify-between items-center p-2 bg-zinc-50/50 dark:bg-zinc-900/10 border-t border-border">
          <div className="flex flex-wrap gap-1 text-[10px] text-muted-foreground select-none">
            <span>Press <kbd className="border px-1 py-0.5 rounded bg-background font-mono">Enter</kbd> to save</span>
          </div>
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

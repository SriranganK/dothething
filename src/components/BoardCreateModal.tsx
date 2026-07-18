// src/components/BoardCreateModal.tsx
import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { API_BASE_URL } from "@/config";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Activity,
  Briefcase,
  CalendarDays,
  CalendarRange,
  Compass,
  Kanban as KanbanIcon,
  Layers,
  Megaphone,
  UserPlus,
  Layout,
  ArrowRight,
  Check,
  Sparkles,
  UploadCloud,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  User as UserIcon,
  CheckSquare,
  Send,
  FileText,
  X,
  Link as LinkIcon,
  HelpCircle,
  Clock,
  PlusCircle,
  ChevronRight,
  MessageSquare,
  Eye,
  Trash2,
  Download,
  ChevronDown,
} from "lucide-react";
import { BOARD_TEMPLATES, type TemplateDefinition } from "@/lib/BoardTemplates";
import {
  useGenerateAIBoardMutation,
  useUploadDocumentSessionMutation,
  useAddCommentToSessionMutation,
  useAnswerSessionQuestionMutation,
  useConfirmSessionMutation,
  useCancelSessionMutation,
} from "@/store/services/api";
import { toast } from "sonner";

// Icon mapping helper for manual templates
const iconMap: Record<string, any> = {
  CalendarDays,
  Activity,
  CalendarRange,
  Layers,
  Kanban: KanbanIcon,
  Compass,
  Briefcase,
  Megaphone,
  UserPlus,
};

interface BoardCreateModalProps {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
  token: string;
  onBoardCreated: (board: any) => void;
}

type CreationMode = "manual" | "ai-prompt" | "ai-doc";
type DocStep = "upload" | "analyzing" | "review" | "preview" | "confirming" | "success";

export function BoardCreateModal({
  open,
  onClose,
  workspaceId,
  token,
  onBoardCreated,
}: BoardCreateModalProps) {
  // Creation Pathway Tab State
  const [creationMode, setCreationMode] = useState<CreationMode>("manual");

  // Mode 1: Manual States
  const [boardName, setBoardName] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateDefinition | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<"All" | "Personal" | "Team" | "Business">("All");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Mode 2: AI Prompt States
  const [aiPrompt, setAiPrompt] = useState("");
  const [generateAIBoard, { isLoading: isGeneratingAI }] = useGenerateAIBoardMutation();

  // Mode 3: AI Document States
  const [docStep, setDocStep] = useState<DocStep>("upload");
  const [docFile, setDocFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [session, setSession] = useState<any>(null);
  const [showDetailedSummary, setShowDetailedSummary] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [answerText, setAnswerText] = useState("");
  
  // Custom interactive summary states
  const [activeTab, setActiveTab] = useState<"summary" | "full-spec">("summary");
  const [expandedTaskId, setExpandedTaskId] = useState<number | null>(null);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("Developer");

  const [uploadDocument, { isLoading: isUploading }] = useUploadDocumentSessionMutation();
  const [addComment, { isLoading: isRefining }] = useAddCommentToSessionMutation();
  const [answerQuestion, { isLoading: isAnswering }] = useAnswerSessionQuestionMutation();
  const [confirmSession, { isLoading: isConfirming }] = useConfirmSessionMutation();
  const [cancelSession] = useCancelSessionMutation();

  const maxFileSize = 50 * 1024 * 1024; // 50MB

  // Reset internal states on open change or cancel
  const handleClose = () => {
    // If mid-session, cancel in background
    if (session?._id && docStep !== "success") {
      cancelSession({ sessionId: session._id }).catch((e) => console.error(e));
    }
    setCreationMode("manual");
    setBoardName("");
    setSelectedTemplate(null);
    setCategoryFilter("All");
    setError("");
    setAiPrompt("");
    setDocStep("upload");
    setDocFile(null);
    setSession(null);
    setCommentText("");
    setAnswerText("");
    onClose();
  };

  useEffect(() => {
    if (!open) {
      handleClose();
    }
  }, [open]);

  // Mode 1: Submit Manual Creation
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!boardName.trim()) {
      setError("Please specify a board name.");
      return;
    }

    // Check duplicate
    try {
      const dupRes = await fetch(`${API_BASE_URL}/api/boards?workspaceId=${workspaceId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (dupRes.ok) {
        const dupData = await dupRes.json();
        const exists = dupData.boards?.some(
          (b: any) => b.name.toLowerCase() === boardName.trim().toLowerCase()
        );
        if (exists) {
          setError("A board with this name already exists in this workspace.");
          return;
        }
      }
    } catch (err) {
      console.error("Duplicate check failed", err);
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/boards`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: boardName,
          workspaceId,
          templateKey: selectedTemplate?.key || null,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to create board");

      onBoardCreated(data.board);
      handleClose();
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  // Mode 2: Submit AI Prompt
  const handlePromptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;
    try {
      const res = await generateAIBoard({
        workspaceId,
        prompt: aiPrompt.trim(),
      }).unwrap();
      if (res.success && res.board) {
        toast.success("Board generated successfully with AI!");
        onBoardCreated(res.board);
        handleClose();
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.data?.message || "Failed to generate board with AI");
    }
  };

  // Mode 3: AI Document Handlers
  const handleFileChange = (selectedFile: File) => {
    if (selectedFile.size > maxFileSize) {
      toast.error("File size exceeds 50MB limit.");
      return;
    }
    setDocFile(selectedFile);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleDocUploadSubmit = async () => {
    if (!docFile) return;
    setDocStep("analyzing");
    try {
      const res = await uploadDocument({
        workspaceId,
        boardId: null, // creates a new board
        file: docFile,
      }).unwrap();

      if (res.success && res.session) {
        setSession(res.session);
        if (res.session.status === "preview") {
          setDocStep("preview");
        } else {
          setDocStep("review");
        }
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.data?.message || "Failed to parse document. Check file structure.");
      setDocStep("upload");
    }
  };

  const handleSendComment = async () => {
    if (!commentText.trim() || !session?._id) return;
    const txt = commentText.trim();
    setCommentText("");
    try {
      const res = await addComment({
        sessionId: session._id,
        comment: txt,
      }).unwrap();

      if (res.success && res.session) {
        setSession(res.session);
        if (res.session.status === "preview") {
          setDocStep("preview");
        } else if (res.session.status === "question") {
          setDocStep("review");
        }
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.data?.message || "Failed to refine plan.");
    }
  };

  const handleSendAnswer = async () => {
    if (!answerText.trim() || !session?._id) return;
    const txt = answerText.trim();
    setAnswerText("");
    try {
      const res = await answerQuestion({
        sessionId: session._id,
        answer: txt,
      }).unwrap();

      if (res.success && res.session) {
        setSession(res.session);
        if (res.session.status === "preview") {
          setDocStep("preview");
        } else if (res.session.status === "question") {
          setDocStep("review");
        }
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.data?.message || "Failed to submit answer.");
    }
  };

  const handleSkipQuestion = async () => {
    if (!session?._id) return;
    try {
      const res = await answerQuestion({
        sessionId: session._id,
        answer: "Skipped",
      }).unwrap();

      if (res.success && res.session) {
        setSession(res.session);
        if (res.session.status === "preview") {
          setDocStep("preview");
        } else if (res.session.status === "question") {
          setDocStep("review");
        }
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.data?.message || "Failed to skip question.");
    }
  };

  const handleSkipAllQuestions = async () => {
    if (!session?._id) return;
    try {
      const res = await answerQuestion({
        sessionId: session._id,
        skipAll: true,
      }).unwrap();

      if (res.success && res.session) {
        setSession(res.session);
        setDocStep("preview");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.data?.message || "Failed to skip all questions.");
    }
  };

  const handleAddTeamMember = async () => {
    if (!newMemberName.trim() || !session?._id) return;
    const updatedMembers = [
      ...(session.summary.teamMembers || []),
      { name: newMemberName.trim(), role: newMemberRole }
    ];
    try {
      const res = await addComment({
        sessionId: session._id,
        teamMembers: updatedMembers
      }).unwrap();
      if (res.success && res.session) {
        setSession(res.session);
        setNewMemberName("");
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to add team member.");
    }
  };

  const handleRemoveTeamMember = async (idxToRemove: number) => {
    if (!session?._id) return;
    const updatedMembers = (session.summary.teamMembers || []).filter((_: any, i: number) => i !== idxToRemove);
    try {
      const res = await addComment({
        sessionId: session._id,
        teamMembers: updatedMembers
      }).unwrap();
      if (res.success && res.session) {
        setSession(res.session);
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to remove team member.");
    }
  };

  const handleDownloadPRD = () => {
    if (!session?.prdMarkdown) return;
    const blob = new Blob([session.prdMarkdown], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${session.summary?.projectName || "PRD"}_Specification.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleConfirmDocPlan = async () => {
    if (!session?._id) return;
    setDocStep("confirming");
    try {
      const res = await confirmSession({ sessionId: session._id }).unwrap();
      if (res.success && res.board) {
        setDocStep("success");
        toast.success("Board and tasks generated successfully!");
        setTimeout(() => {
          onBoardCreated(res.board);
          handleClose();
        }, 1500);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.data?.message || "Failed to construct board assets.");
      setDocStep("preview");
    }
  };

  const filteredTemplates = BOARD_TEMPLATES.filter(
    (t) => categoryFilter === "All" || t.category === categoryFilter
  );

  const isQuestionActive = session?.status === "question";
  const activeQuestion = isQuestionActive && session?.questions ? session.questions[session.currentQuestionIndex] : null;

  return (
    <Dialog open={open} onOpenChange={(val) => !val && handleClose()}>
      <DialogContent className="sm:max-w-[900px] max-h-[85vh] overflow-y-auto p-6 rounded-2xl border-none shadow-2xl bg-card text-card-foreground text-foreground flex flex-col">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Layout className="h-6 w-6 text-primary" />
            Create Board
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Create manually, write an AI prompt, or upload a product specification document (PDF, DOCX, PRD, XLSX) to generate your tasks.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 text-xs bg-red-50 border border-red-200 text-red-650 rounded-xl my-2">
            {error}
          </div>
        )}

        {/* Pathway Tabs - Only show on upload step or manual/prompt mode */}
        {(creationMode !== "ai-doc" || docStep === "upload") && (
          <div className="grid grid-cols-3 gap-3 my-4 select-none">
            <button
              type="button"
              onClick={() => setCreationMode("manual")}
              className={`p-4 rounded-xl border text-left cursor-pointer transition-all flex flex-col gap-2 ${
                creationMode === "manual"
                  ? "border-primary bg-primary/5 shadow-xs"
                  : "border-border hover:bg-muted/50"
              }`}
            >
              <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 w-fit">
                <Layout className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">Create Manually</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Use blank template or layout</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setCreationMode("ai-prompt")}
              className={`p-4 rounded-xl border text-left cursor-pointer transition-all flex flex-col gap-2 ${
                creationMode === "ai-prompt"
                  ? "border-primary bg-primary/5 shadow-xs"
                  : "border-border hover:bg-muted/50"
              }`}
            >
              <div className="p-2 rounded-lg bg-violet-50 dark:bg-violet-950/40 text-violet-650 dark:text-violet-400 w-fit">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">Generate with AI</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Describe workflow in natural language</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setCreationMode("ai-doc")}
              className={`p-4 rounded-xl border text-left cursor-pointer transition-all flex flex-col gap-2 ${
                creationMode === "ai-doc"
                  ? "border-primary bg-primary/5 shadow-xs"
                  : "border-border hover:bg-muted/50"
              }`}
            >
              <div className="p-2 rounded-lg bg-fuchsia-50 dark:bg-fuchsia-950/40 text-fuchsia-650 dark:text-fuchsia-400 w-fit">
                <FileText className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">Import Document</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Upload PDF, DOCX, PRD, XLSX files</p>
              </div>
            </button>
          </div>
        )}

        {/* 1. MANUAL CREATION LAYOUT */}
        {creationMode === "manual" && (
          <form onSubmit={handleManualSubmit} className="space-y-6 py-2">
            <div className="space-y-2">
              <Label htmlFor="board-name" className="text-foreground/90 font-semibold text-sm">
                Board Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="board-name"
                type="text"
                placeholder="e.g. Sprint Planning, Content Pipeline..."
                value={boardName}
                onChange={(e) => setBoardName(e.target.value)}
                className="h-11 rounded-xl border-border focus-visible:ring-ring text-foreground"
                required
                autoFocus
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-foreground/90 font-semibold text-sm">
                  Choose a Template
                </Label>
                <div className="flex gap-1 bg-muted p-1 rounded-xl border border-border/50">
                  {(["All", "Personal", "Team", "Business"] as const).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategoryFilter(cat)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer
                        ${categoryFilter === cat 
                          ? "bg-card text-card-foreground text-foreground shadow-sm" 
                          : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[250px] overflow-y-auto pr-1">
                <div
                  onClick={() => {
                    setSelectedTemplate(null);
                    if (!boardName) setBoardName("Custom Board");
                  }}
                  className={`p-4 rounded-xl border cursor-pointer transition-all hover:bg-background flex items-start gap-3 text-left
                    ${selectedTemplate === null 
                      ? "border-indigo-650 bg-primary/10/20" 
                      : "border-border bg-card text-card-foreground"}`}
                >
                  <div className="w-9 h-9 rounded-lg bg-muted border border-border flex items-center justify-center text-muted-foreground shrink-0">
                    <Layout className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 justify-between">
                      <span className="font-semibold text-foreground text-sm truncate">Custom Board</span>
                      {selectedTemplate === null && <Check className="h-4 w-4 text-primary shrink-0" />}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      Start clean. Build columns and define card states as your work expands.
                    </p>
                  </div>
                </div>

                {filteredTemplates.map((template) => {
                  const IconComponent = iconMap[template.icon] || Layout;
                  const isSelected = selectedTemplate?.key === template.key;

                  return (
                    <div
                      key={template.key}
                      onClick={() => {
                        setSelectedTemplate(template);
                        setBoardName(template.name);
                      }}
                      className={`p-4 rounded-xl border cursor-pointer transition-all hover:bg-background flex items-start gap-3 text-left
                        ${isSelected ? "border-indigo-650 bg-primary/10/20" : "border-border bg-card text-card-foreground"}`}
                    >
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border
                        ${isSelected 
                          ? "bg-primary text-white border-indigo-650" 
                          : "bg-primary/10/50 text-primary border-primary/20"}`}
                      >
                        <IconComponent className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 justify-between">
                          <span className="font-semibold text-foreground text-sm truncate">
                            {template.name}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            <Badge variant="secondary" className="px-1.5 py-0.2 text-[10px] text-muted-foreground font-medium">
                              {template.category}
                            </Badge>
                            {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {template.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="rounded-xl h-11 px-5 cursor-pointer text-muted-foreground"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-primary hover:bg-primary/90 text-white rounded-xl h-11 px-6 font-semibold cursor-pointer"
              >
                {submitting ? "Creating..." : "Create Board"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </form>
        )}

        {/* 2. AI PROMPT LAYOUT */}
        {creationMode === "ai-prompt" && (
          <form onSubmit={handlePromptSubmit} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-foreground/90 font-semibold text-sm">
                Describe your project board requirements
              </Label>
              <textarea
                placeholder="e.g. Build an E-commerce Mobile App. Include columns for brainstorming, backlog, UI Design, Development, Testing, and Done. Add 10 initial tasks for auth, cart, payments, Stripe integration, and search API."
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                className="w-full min-h-[140px] p-3 text-sm rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground resize-none"
                disabled={isGeneratingAI}
              />
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-border">
              <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                <HelpCircle className="h-3.5 w-3.5" /> Powered by Groq / Grok
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isGeneratingAI}
                  className="rounded-xl h-11 px-5 cursor-pointer text-muted-foreground"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isGeneratingAI || !aiPrompt.trim()}
                  className="bg-[#4f46e5] hover:bg-[#4338ca] text-white rounded-xl h-11 px-6 font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  {isGeneratingAI ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Generating Board...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      <span>Generate</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        )}

        {/* 3. AI DOCUMENT LAYOUT */}
        {creationMode === "ai-doc" && (
          <div className="space-y-4 py-2">
            {/* Step: Upload File */}
            {docStep === "upload" && (
              <div className="flex flex-col items-center justify-center gap-4 py-4">
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`w-full p-8 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${
                    isDragOver
                      ? "border-primary bg-primary/5 scale-[1.01]"
                      : "border-border hover:border-muted-foreground/50 hover:bg-muted/30"
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => e.target.files && handleFileChange(e.target.files[0])}
                    className="hidden"
                    accept=".pdf,.docx,.xlsx,.xls,.txt,.csv,.md,.json"
                  />
                  <div className="p-3 bg-fuchsia-50 dark:bg-fuchsia-950/30 rounded-2xl text-fuchsia-600 dark:text-fuchsia-400">
                    <UploadCloud className="h-9 w-9 animate-bounce" />
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-bold text-foreground">
                      {docFile ? docFile.name : "Select or drag your product document requirements"}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Accepts PDF, DOCX, PRD, XLSX, XLS, TXT, CSV, MD (Max 50MB)
                    </p>
                  </div>
                  {docFile && (
                    <Badge variant="secondary" className="mt-1 text-[9px] font-mono">
                      {(docFile.size / (1024 * 1024)).toFixed(2)} MB
                    </Badge>
                  )}
                </div>

                <div className="flex gap-3 justify-end w-full mt-4 border-t border-border pt-4">
                  <Button
                    variant="outline"
                    onClick={handleClose}
                    className="rounded-xl h-11 px-5 cursor-pointer text-muted-foreground"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleDocUploadSubmit}
                    disabled={!docFile || isUploading}
                    className="bg-fuchsia-600 hover:bg-fuchsia-750 text-white rounded-xl h-11 px-6 font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    Import & Analyze
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step: Analyzing Loader */}
            {docStep === "analyzing" && (
              <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
                <div className="relative flex items-center justify-center">
                  <Loader2 className="h-14 w-14 text-fuchsia-600 dark:text-fuchsia-400 animate-spin" />
                  <Sparkles className="h-5 w-5 text-fuchsia-500 absolute animate-pulse" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">AI is reading your document...</h4>
                  <p className="text-xs text-muted-foreground max-w-sm mt-1">
                    Extracting requirements, mapping features, identifying assignees, and resolving dependencies.
                  </p>
                </div>
              </div>
            )}

            {/* Step: Interactive Review summary */}
            {docStep === "review" && session && (
              <div className="space-y-4">
                {/* Small brief summary display */}
                <div className="p-4 rounded-xl border border-border bg-muted/20 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-fuchsia-50 dark:bg-fuchsia-950/40 text-fuchsia-600 dark:text-fuchsia-400 rounded-xl">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-foreground">
                        {session.summary?.projectName || "Document Analysis"}
                      </h4>
                      <p className="text-[10px] text-muted-foreground mt-0.5 max-w-[280px] sm:max-w-[400px] truncate">
                        {session.summary?.description || "Successfully parsed document requirements."}
                      </p>
                    </div>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDetailedSummary(true)}
                    className="h-8 rounded-lg text-xs font-semibold cursor-pointer border-fuchsia-200 text-fuchsia-650 hover:bg-fuchsia-50/50 flex items-center gap-1 shrink-0 ml-2"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>View Details</span>
                  </Button>
                </div>

                {/* Question panel with progress and skip options */}
                {isQuestionActive && activeQuestion && (
                  <div className="p-4 rounded-xl border border-violet-100 dark:border-violet-950 bg-violet-50/20 dark:bg-violet-950/10 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <h5 className="text-[10px] font-bold text-violet-755 dark:text-violet-400 uppercase tracking-wide flex items-center gap-1">
                        <Sparkles className="h-3 w-3 animate-pulse" />
                        AI Question ({session.currentQuestionIndex + 1} of {session.questions.length})
                      </h5>
                      <span className="text-[9px] font-bold text-violet-650 bg-violet-100/60 dark:bg-violet-950/50 px-1.5 py-0.5 rounded">
                        {Math.round((session.currentQuestionIndex / session.questions.length) * 100)}% Answered
                      </span>
                    </div>

                    <div className="h-1.5 w-full bg-violet-100 dark:bg-violet-950 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-violet-500 rounded-full transition-all duration-300"
                        style={{ width: `${(session.currentQuestionIndex / session.questions.length) * 100}%` }}
                      />
                    </div>

                    <p className="text-xs font-semibold text-foreground leading-relaxed">{activeQuestion.questionText}</p>
                    
                    <div className="flex flex-col gap-2 mt-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Type answer..."
                          value={answerText}
                          onChange={(e) => setAnswerText(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleSendAnswer()}
                          className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary/20 text-foreground"
                          disabled={isAnswering}
                        />
                        <Button
                          onClick={handleSendAnswer}
                          disabled={!answerText.trim() || isAnswering}
                          className="bg-violet-600 hover:bg-violet-750 text-white rounded-xl h-8 px-3.5 text-xs cursor-pointer flex items-center gap-1"
                        >
                          {isAnswering ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                          Submit
                        </Button>
                      </div>

                      {/* Skip Actions */}
                      <div className="flex items-center justify-between pt-1 text-[10px]">
                        <Button
                          variant="outline"
                          onClick={handleSkipQuestion}
                          disabled={isAnswering}
                          className="border-violet-200 text-violet-600 hover:bg-violet-50/50 rounded-xl h-7 px-3 text-[10px] cursor-pointer font-bold"
                        >
                          Skip Question
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={handleSkipAllQuestions}
                          disabled={isAnswering}
                          className="text-violet-600 hover:text-violet-750 hover:bg-violet-50/30 rounded-xl h-7 px-2.5 text-[10px] cursor-pointer font-extrabold"
                        >
                          Skip All Questions
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Comments box */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" /> Add Comments & Instructions:
                  </span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. Set John as frontend and Sarah as backend. Create tasks for DevOps deployment."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSendComment()}
                      className="flex-1 px-3 py-2 text-xs rounded-xl border border-border bg-background focus:outline-none"
                      disabled={isRefining}
                    />
                    <Button
                      onClick={handleSendComment}
                      disabled={!commentText.trim() || isRefining}
                      className="bg-primary text-white rounded-xl h-8 px-3 text-xs cursor-pointer"
                    >
                      {isRefining ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                      Refine
                    </Button>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-border">
                  <span className="text-[9px] text-muted-foreground flex items-center gap-1 select-none">
                    <HelpCircle className="h-3.5 w-3.5" /> Answer AI questions or click View Preview.
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={handleClose}
                      className="rounded-xl h-10 px-4 text-xs"
                    >
                      Cancel
                    </Button>
                    {session.status === "preview" && (
                      <Button
                        onClick={() => setDocStep("preview")}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-10 px-4 text-xs font-semibold"
                      >
                        View Preview
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step: Preview Generated Assets */}
            {docStep === "preview" && session && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl border border-border bg-muted/10">
                  <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Board Configuration Preview</h4>
                  <p className="text-sm font-bold text-foreground mt-0.5">{session.preview?.boardName}</p>
                </div>

                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-muted-foreground">Generated Tasks Checklist:</span>
                  <ScrollArea className="h-[180px] w-full border border-border rounded-xl p-3 bg-muted/5">
                    <div className="space-y-2 pr-2">
                      {session.preview?.tasks?.map((t: any, i: number) => (
                        <div key={i} className="p-2.5 rounded-lg border border-border bg-card shadow-xs space-y-1 relative text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <h6 className="font-bold text-foreground">{t.title}</h6>
                            <div className="flex gap-1 shrink-0">
                              <Badge variant="outline" className="text-[8px] font-mono">{t.type}</Badge>
                              <Badge className="bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-400 border border-violet-100/30 text-[8px]">{t.columnId.toUpperCase()}</Badge>
                            </div>
                          </div>
                          {t.description && (
                            <p className="text-[10px] text-muted-foreground line-clamp-1">{t.description}</p>
                          )}
                          <div className="flex items-center justify-between text-[9px] text-muted-foreground border-t border-border/40 pt-1 mt-1">
                            <span>Source: {t.source || "Ingested Spec"}</span>
                            <span>Assignee: {t.assignee || "Unassigned"}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                {/* Adjust comment input inside preview */}
                <div className="space-y-1.5 border-t border-border pt-4">
                  <span className="text-[11px] font-bold text-muted-foreground">Need changes? Explain refinements:</span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. Set all auth task priorities to High. Set Mike as owner of the cart API."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSendComment()}
                      className="flex-1 px-3 py-2 text-xs rounded-xl border border-border bg-background focus:outline-none"
                      disabled={isRefining}
                    />
                    <Button
                      onClick={handleSendComment}
                      disabled={!commentText.trim() || isRefining}
                      className="bg-primary text-white rounded-xl h-8 px-3 text-xs cursor-pointer"
                    >
                      {isRefining ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                      Refine
                    </Button>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setDocStep("review")}
                    className="rounded-xl h-10 text-xs px-4"
                  >
                    Back
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={handleClose}
                      className="rounded-xl h-10 text-xs px-4"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleConfirmDocPlan}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-10 px-5 text-xs font-bold flex items-center gap-1"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Create Board & Tasks
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Step: Confirming creation loader */}
            {docStep === "confirming" && (
              <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
                <Loader2 className="h-14 w-14 text-emerald-600 dark:text-emerald-400 animate-spin" />
                <div>
                  <h4 className="text-sm font-bold text-foreground">Creating project database assets...</h4>
                  <p className="text-xs text-muted-foreground">
                    Saving board layouts, columns, mapping members, and constructing tasks.
                  </p>
                </div>
              </div>
            )}

            {/* Step: Success */}
            {docStep === "success" && (
              <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
                <div className="p-3 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-full animate-bounce">
                  <CheckCircle2 className="h-12 w-12" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-foreground">AI Board Generated Successfully!</h4>
                  <p className="text-xs text-muted-foreground">Redirecting you to your new board...</p>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>

      {/* Detailed PRD Organized Summary Dialog */}
      <Dialog open={showDetailedSummary} onOpenChange={setShowDetailedSummary}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto p-6 rounded-2xl border-none shadow-2xl bg-card text-card-foreground">
          <DialogHeader className="flex flex-row items-center justify-between border-b border-border pb-4 select-none">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-fuchsia-50 dark:bg-fuchsia-950/40 text-fuchsia-600 dark:text-fuchsia-400 rounded-2xl">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-foreground">PRD Summary & Specifications</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  AI grouped, organized, and parsed spec details.
                </DialogDescription>
              </div>
            </div>
            {session?.prdMarkdown && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadPRD}
                className="h-8 rounded-lg text-xs font-bold border-violet-200 text-violet-750 hover:bg-violet-50/50 flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download Spec (.md)</span>
              </Button>
            )}
          </DialogHeader>

          {/* Tabs header */}
          <div className="flex border-b border-border mb-4 text-xs select-none mt-2">
            <button
              onClick={() => setActiveTab("summary")}
              className={`pb-2.5 px-4 font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === "summary"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Organized Summary
            </button>
            <button
              onClick={() => setActiveTab("full-spec")}
              className={`pb-2.5 px-4 font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === "full-spec"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Full PRD Document
            </button>
          </div>

          {activeTab === "summary" ? (
            <div className="space-y-6 py-2 text-xs">
              {/* Visual Stats Row */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl border border-border bg-muted/5 flex flex-col justify-between">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wide">Tasks Extracted</span>
                  <span className="text-xl font-extrabold text-foreground mt-1">
                    {session?.summary?.potentialTasks?.length || 0}
                  </span>
                </div>
                <div className="p-3 rounded-xl border border-border bg-muted/5 flex flex-col justify-between">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wide">Epics Detected</span>
                  <span className="text-xl font-extrabold text-primary mt-1">
                    {session?.summary?.features?.length || 0}
                  </span>
                </div>
                <div className="p-3 rounded-xl border border-border bg-muted/5 flex flex-col justify-between">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wide">Team Resources</span>
                  <span className="text-xl font-extrabold text-emerald-500 mt-1">
                    {session?.summary?.teamMembers?.length || 0}
                  </span>
                </div>
              </div>

              {/* Project Overview */}
              <div className="space-y-1.5">
                <h5 className="font-bold text-foreground text-sm">Project Overview</h5>
                <div className="p-3.5 rounded-xl bg-muted/20 border border-border/60 leading-relaxed text-muted-foreground">
                  {session?.summary?.description || "No description provided."}
                </div>
              </div>

              {/* Groupings for New Board Creation */}
              <div className="space-y-5">
                {/* Features Grouping */}
                {session?.summary?.features?.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="font-bold text-foreground text-sm flex items-center gap-1.5">
                      <Layers className="h-4 w-4 text-primary" /> Key Feature Modules
                    </h5>
                    <div className="flex flex-wrap gap-1.5">
                      {session.summary.features.map((f: string, idx: number) => (
                        <Badge key={idx} variant="outline" className="bg-card text-foreground font-semibold px-2.5 py-1 text-xs rounded-xl border-border/80">
                          {f}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Team Mapping */}
                <div className="space-y-2">
                  <h5 className="font-bold text-foreground text-sm flex items-center gap-1.5">
                    <UserIcon className="h-4 w-4 text-emerald-500" /> Team Resource Allocations
                  </h5>
                  
                  {(!session?.summary?.teamMembers || session.summary.teamMembers.length === 0) ? (
                    <div className="p-4 rounded-xl border border-dashed border-border bg-muted/5 text-center space-y-1">
                      <p className="text-[11px] text-muted-foreground font-medium">No developers detected in the requirements document.</p>
                      <p className="text-[9px] text-muted-foreground/75">You can manually add developers below to assign tasks to them.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {session.summary.teamMembers.map((m: any, idx: number) => {
                        const name = typeof m === 'string' ? m : m?.name || '';
                        const role = typeof m === 'string' ? 'Developer' : m?.role || 'Developer';
                        return (
                          <div key={idx} className="p-2.5 rounded-xl border border-border bg-emerald-50/20 dark:bg-emerald-950/10 flex items-center justify-between">
                            <div>
                              <div className="font-semibold text-foreground">{name}</div>
                              <div className="text-[9px] text-emerald-600 dark:text-emerald-400 font-medium">{role}</div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveTeamMember(idx);
                              }}
                              className="h-6 w-6 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-50/40 cursor-pointer"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Inline member creation fields */}
                  <div className="flex gap-2 items-center bg-muted/10 p-2 rounded-xl border border-border/85 mt-2">
                    <input
                      type="text"
                      placeholder="Developer name..."
                      value={newMemberName}
                      onChange={(e) => setNewMemberName(e.target.value)}
                      className="flex-1 px-3 py-1.5 text-[11px] rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-emerald-500/20 text-foreground"
                    />
                    <select
                      value={newMemberRole}
                      onChange={(e) => setNewMemberRole(e.target.value)}
                      className="px-2 py-1.5 text-[11px] rounded-lg border border-border bg-background text-foreground"
                    >
                      <option value="Developer">Developer</option>
                      <option value="Frontend Developer">Frontend</option>
                      <option value="Backend Developer">Backend</option>
                      <option value="Fullstack Developer">Fullstack</option>
                      <option value="QA Engineer">QA Engineer</option>
                      <option value="Product Designer">Designer</option>
                      <option value="Scrum Master">Scrum Master</option>
                    </select>
                    <Button
                      onClick={handleAddTeamMember}
                      disabled={!newMemberName.trim()}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg h-7 px-3 text-[10px] font-bold cursor-pointer"
                    >
                      Add
                    </Button>
                  </div>
                </div>

                {/* Requirements Tasks (Collapsible List) */}
                {session?.summary?.potentialTasks?.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="font-bold text-foreground text-sm flex items-center gap-1.5">
                      <CheckSquare className="h-4 w-4 text-violet-500" /> Extracted Work Breakdown Structure
                    </h5>
                    <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-1">
                      {session.summary.potentialTasks.map((t: any, idx: number) => {
                        const isExpanded = expandedTaskId === idx;
                        const title = typeof t === 'string' ? t : t?.title || '';
                        const description = typeof t === 'string' ? null : t?.description;
                        const feature = typeof t === 'string' ? null : t?.feature;
                        return (
                          <div 
                            key={idx} 
                            onClick={() => setExpandedTaskId(isExpanded ? null : idx)}
                            className="p-3 rounded-xl border border-border bg-card hover:bg-muted/10 transition-all cursor-pointer space-y-2 select-none"
                          >
                            <div className="flex justify-between items-center gap-2">
                              <div className="flex items-center gap-2">
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4 text-violet-500 shrink-0" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                                )}
                                <span className="font-bold text-foreground text-xs">{title}</span>
                              </div>
                              {feature && <Badge variant="secondary" className="text-[9px]">{feature}</Badge>}
                            </div>
                            {isExpanded && (
                              <div className="text-[11px] text-muted-foreground pl-6 leading-relaxed border-t border-border/40 pt-2 transition-all">
                                {description || "No additional description details extracted."}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="py-2">
              <ScrollArea className="h-[450px] w-full border border-border rounded-xl p-4 bg-muted/5">
                <div className="prose prose-sm dark:prose-invert max-w-none text-foreground space-y-4 leading-relaxed">
                  {session?.prdMarkdown ? (
                    <ReactMarkdown>{session.prdMarkdown}</ReactMarkdown>
                  ) : (
                    <p className="text-muted-foreground italic text-center py-12">No detailed PRD document generated.</p>
                  )}
                </div>
              </ScrollArea>
            </div>
          )}

          <div className="flex justify-end pt-4 border-t border-border mt-4">
            <Button
              onClick={() => setShowDetailedSummary(false)}
              className="bg-primary text-white rounded-xl h-10 px-5 font-bold cursor-pointer"
            >
              Close Details
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}

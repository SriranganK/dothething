import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useUploadDocumentSessionMutation,
  useAddCommentToSessionMutation,
  useAnswerSessionQuestionMutation,
  useConfirmSessionMutation,
  useCancelSessionMutation,
} from "@/store/services/api";
import {
  UploadCloud,
  Loader2,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  User,
  CheckSquare,
  ArrowRight,
  Plus,
  Send,
  FileText,
  X,
  Link,
  HelpCircle,
  Clock,
  Layers,
  MessageSquare,
  ChevronRight,
  Eye,
  Trash2,
  Download,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";

interface AIDocumentToBoardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  boardId?: string | null; // Null if creating a new board, set if syncing an existing board
  onComplete: (boardId: string) => void;
}

type StepType = "upload" | "analyzing" | "review" | "preview" | "confirming" | "success";

export default function AIDocumentToBoardModal({
  open,
  onOpenChange,
  workspaceId,
  boardId = null,
  onComplete,
}: AIDocumentToBoardModalProps) {
  const [step, setStep] = useState<StepType>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Active session object from DB
  const [session, setSession] = useState<any>(null);

  // User input states
  const [commentText, setCommentText] = useState("");
  const [answerText, setAnswerText] = useState("");
  const [showDetailedSummary, setShowDetailedSummary] = useState(false);
  const [activeTab, setActiveTab] = useState<"summary" | "full-spec">("summary");

  // RTK Query hooks
  const [uploadDocument, { isLoading: isUploading }] = useUploadDocumentSessionMutation();
  const [addComment, { isLoading: isRefining }] = useAddCommentToSessionMutation();
  const [answerQuestion, { isLoading: isAnswering }] = useAnswerSessionQuestionMutation();
  const [confirmSession, { isLoading: isConfirming }] = useConfirmSessionMutation();
  const [cancelSession] = useCancelSessionMutation();

  const maxFileSize = 50 * 1024 * 1024; // 50MB

  // Reset state on open change
  useEffect(() => {
    if (!open) {
      // If closing in middle, cancel session in background
      if (session?._id && step !== "success") {
        cancelSession({ sessionId: session._id }).catch((e) => console.error(e));
      }
      setStep("upload");
      setFile(null);
      setSession(null);
      setCommentText("");
      setAnswerText("");
    }
  }, [open]);

  // Handle file drop/selection
  const handleFileChange = (selectedFile: File) => {
    if (selectedFile.size > maxFileSize) {
      toast.error("File size exceeds 50MB limit.");
      return;
    }
    setFile(selectedFile);
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

  // Step 1 -> Step 2: Upload to backend
  const handleUploadSubmit = async () => {
    if (!file) return;
    setStep("analyzing");
    try {
      const res = await uploadDocument({
        workspaceId,
        boardId,
        file,
      }).unwrap();

      if (res.success && res.session) {
        setSession(res.session);
        // Determine next step
        if (res.session.status === "preview") {
          setStep("preview");
        } else {
          setStep("review");
        }
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.data?.message || "Failed to parse document. Ensure it's not empty or password protected.");
      setStep("upload");
    }
  };

  // Step 2 & 3: Submit instructions/comments
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
          setStep("preview");
        } else if (res.session.status === "question") {
          setStep("review");
        }
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.data?.message || "Failed to refine plan.");
    }
  };

  // Step 3: Answer sequential questions
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
          setStep("preview");
        } else if (res.session.status === "question") {
          setStep("review");
        }
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.data?.message || "Failed to record answer.");
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
          setStep("preview");
        } else if (res.session.status === "question") {
          setStep("review");
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
        setStep("preview");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.data?.message || "Failed to skip all questions.");
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

  // Step 4: Confirm creation
  const handleConfirmPlan = async () => {
    if (!session?._id) return;
    setStep("confirming");
    try {
      const res = await confirmSession({ sessionId: session._id }).unwrap();
      if (res.success && res.board) {
        setStep("success");
        toast.success(boardId ? "Board updated successfully!" : "AI Board created successfully!");
        setTimeout(() => {
          onComplete(res.board._id);
          onOpenChange(false);
        }, 1500);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.data?.message || "Failed to create board and tasks.");
      setStep("preview");
    }
  };

  // Helper properties
  const isQuestionActive = session?.status === "question";
  const activeQuestion = isQuestionActive && session?.questions ? session.questions[session.currentQuestionIndex] : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl rounded-2xl p-0 border border-border bg-card text-card-foreground shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header bar */}
        <div className="p-6 border-b border-border flex items-center justify-between select-none">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-400">
              <Sparkles className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-foreground">
                {boardId ? "Sync Board with AI Document" : "Convert Document to Project Board"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Let AI build structured Kanban boards, tasks, assignees, and dependencies from your requirements.
              </DialogDescription>
            </div>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 min-h-[350px]">
          {/* UPLOAD STEP */}
          {step === "upload" && (
            <div className="flex flex-col items-center justify-center gap-4 py-6">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`w-full max-w-xl p-10 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${
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
                <div className="p-3 bg-violet-50 dark:bg-violet-900/30 rounded-2xl text-violet-600 dark:text-violet-400">
                  <UploadCloud className="h-10 w-10 animate-bounce" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-foreground">
                    {file ? file.name : "Click to upload or drag requirements file"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Supports PDF, Word, Excel, CSV, JSON, Markdown & Plain Text (Max 50MB)
                  </p>
                </div>
                {file && (
                  <Badge variant="secondary" className="mt-2 text-[10px] font-mono">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </Badge>
                )}
              </div>

              <div className="flex gap-3 justify-end w-full max-w-xl mt-4">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="rounded-xl h-10 cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUploadSubmit}
                  disabled={!file || isUploading}
                  className="bg-violet-600 hover:bg-violet-750 text-white rounded-xl h-10 font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  Analyze Document
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* PARSING / LOADER STEP */}
          {step === "analyzing" && (
            <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
              <div className="relative flex items-center justify-center">
                <Loader2 className="h-16 w-16 text-violet-600 dark:text-violet-400 animate-spin" />
                <Sparkles className="h-6 w-6 text-violet-500 absolute animate-pulse" />
              </div>
              <div>
                <h4 className="text-base font-bold text-foreground">AI is reading your document...</h4>
                <p className="text-xs text-muted-foreground max-w-sm mt-1">
                  Extracting product goals, team structure, features, dependencies, and generating follow-up checks.
                </p>
              </div>
            </div>
          )}

          {/* INTERACTIVE REVIEW STEP */}
          {step === "review" && session && (
            <div className="space-y-6">
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

              {/* COMMENTS AND REFINEMENTS BAR */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5" />
                  Add comments or instructions (correct assignees, technology choice, scope limits):
                </span>
                <div className="flex gap-2">
                  <textarea
                    placeholder="e.g. John should not work on backend, Sarah is our backend developer. Payment system must use Stripe instead of PayPal."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendComment();
                      }
                    }}
                    className="flex-1 p-3 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-violet-500/20 placeholder:text-muted-foreground resize-none min-h-[50px] max-h-[100px]"
                    disabled={isRefining}
                  />
                  <Button
                    onClick={handleSendComment}
                    disabled={!commentText.trim() || isRefining}
                    className="bg-[#4f46e5] hover:bg-[#4338ca] text-white rounded-xl h-10 px-4 font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0 mt-auto"
                  >
                    {isRefining ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                    Refine Plan
                  </Button>
                </div>
              </div>

              {/* Cancel & Preview actions */}
              <div className="flex justify-between items-center pt-2">
                <div className="text-[10px] text-muted-foreground flex items-center gap-1 select-none">
                  <HelpCircle className="h-3.5 w-3.5" />
                  You can answer questions or refine the plan until satisfied.
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    className="rounded-xl h-10 cursor-pointer"
                  >
                    Cancel
                  </Button>
                  {session.status === "preview" && (
                    <Button
                      onClick={() => setStep("preview")}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-10 font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      View Board Preview
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* FINAL PREVIEW STEP */}
          {step === "preview" && session && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl border border-border bg-muted/10">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Suggested Board Preview</h4>
                <p className="text-base font-bold text-foreground mt-0.5">{session.preview?.boardName}</p>
                {session.preview?.description && (
                  <p className="text-xs text-muted-foreground mt-0.5">{session.preview.description}</p>
                )}
              </div>

              {/* Tasks Preview List */}
              <div className="space-y-3">
                <h5 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Layers className="h-4 w-4 text-violet-500" />
                  Generated Board Tasks ({session.preview?.tasks?.length || 0} tasks)
                </h5>

                <ScrollArea className="h-[280px] w-full border border-border rounded-xl p-3 bg-muted/5">
                  <div className="space-y-3.5 pr-2">
                    {session.preview?.tasks?.map((t: any, i: number) => {
                      const inWorkspace = t.assignee ? true : false; 
                      return (
                        <div key={i} className="p-3.5 rounded-xl border border-border bg-card shadow-xs space-y-2 relative">
                          <div className="flex items-center justify-between gap-2">
                            <h6 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                              {t.isNew ? (
                                <Badge className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-100 rounded text-[9px] font-medium">NEW</Badge>
                              ) : (
                                <Badge className="bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-100 rounded text-[9px] font-medium">UPDATE</Badge>
                              )}
                              {t.title}
                            </h6>
                            <div className="flex items-center gap-1">
                              <Badge variant="outline" className="text-[9px] font-mono text-muted-foreground">{t.type}</Badge>
                              <Badge variant="outline" className="text-[9px] font-mono text-muted-foreground">{t.priority}</Badge>
                              <Badge className="bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-400 border border-violet-100/30 text-[9px] font-medium">{t.columnId.toUpperCase()}</Badge>
                            </div>
                          </div>

                          {t.description && (
                            <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">{t.description}</p>
                          )}

                          <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[10px]">
                            {/* Traceability */}
                            <span className="text-muted-foreground flex items-center gap-1">
                              <Link className="h-3 w-3 shrink-0" />
                              Source: <span className="font-semibold text-foreground/80">{t.source || "Document Requirements"}</span>
                            </span>

                            {/* Assignee mapping check */}
                            {t.assignee ? (
                              <div className="flex items-center gap-1">
                                <span className="text-muted-foreground">Assignee:</span>
                                <span className="font-semibold text-foreground">{t.assignee}</span>
                              </div>
                            ) : (
                              <Badge variant="secondary" className="text-[9px] font-medium text-amber-600 bg-amber-50 border-amber-150">
                                Unassigned
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>

              {/* Comment Refinement Area inside Preview */}
              <div className="space-y-2 border-t border-border/60 pt-4">
                <span className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5" />
                  Not happy with the preview? Add instructions to adjust tasks:
                </span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Change priority of payment screen design to Critical. Add task to build API unit tests."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendComment()}
                    className="flex-1 px-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-violet-500/20 placeholder:text-muted-foreground"
                    disabled={isRefining}
                  />
                  <Button
                    onClick={handleSendComment}
                    disabled={!commentText.trim() || isRefining}
                    className="bg-violet-600 hover:bg-violet-750 text-white rounded-xl h-9 px-4 font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    {isRefining ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                    Update plan
                  </Button>
                </div>
              </div>

              {/* Confirm / Cancel */}
              <div className="flex justify-between items-center pt-2">
                <div className="text-[10px] text-muted-foreground flex items-center gap-1 select-none">
                  <HelpCircle className="h-3.5 w-3.5" />
                  Confirming will automatically build/sync the board in the database.
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setStep("review")}
                    className="rounded-xl h-10 cursor-pointer"
                  >
                    Back to Summary
                  </Button>
                  <Button
                    onClick={handleConfirmPlan}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-10 font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="h-4.5 w-4.5" />
                    {boardId ? "Create & Sync Tasks" : "Create Project Board"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* CONFIRMATION LOADER STEP */}
          {step === "confirming" && (
            <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
              <Loader2 className="h-16 w-16 text-emerald-600 dark:text-emerald-400 animate-spin" />
              <div>
                <h4 className="text-base font-bold text-foreground">Creating project database assets...</h4>
                <p className="text-xs text-muted-foreground max-w-sm mt-1">
                  Saving board columns, generating items, linking traceability markers, mapping developers, and creating audit trails.
                </p>
              </div>
            </div>
          )}

          {/* SUCCESS STEP */}
          {step === "success" && (
            <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
              <div className="p-3 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-full animate-bounce">
                <CheckCircle2 className="h-14 w-14" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-foreground">Project Generated Successfully!</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  The board, columns, tasks, and assignments have been fully constructed. Redirecting you...
                </p>
              </div>
            </div>
          )}
        </div>
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
                  AI grouped, organized, and parsed requirements details.
                </DialogDescription>
              </div>
            </div>
            {session?.prdMarkdown && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadPRD}
                className="h-8 rounded-lg text-xs font-bold border-violet-200 text-violet-755 hover:bg-violet-50/50 flex items-center gap-1.5 cursor-pointer"
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
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wide">New Tasks</span>
                  <span className="text-xl font-extrabold text-foreground mt-1">
                    {session?.summary?.newTasks?.length || 0}
                  </span>
                </div>
                <div className="p-3 rounded-xl border border-border bg-muted/5 flex flex-col justify-between">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wide">Proposed Updates</span>
                  <span className="text-xl font-extrabold text-primary mt-1">
                    {session?.summary?.updates?.length || 0}
                  </span>
                </div>
                <div className="p-3 rounded-xl border border-border bg-muted/5 flex flex-col justify-between">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wide">Duplicates Blocked</span>
                  <span className="text-xl font-extrabold text-amber-500 mt-1">
                    {session?.summary?.duplicates?.length || 0}
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

              {/* Sync Specific Groupings */}
              <div className="space-y-4">
                {session?.summary?.newTasks?.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="font-bold text-emerald-650 dark:text-emerald-400 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      New Tasks to Add ({session.summary.newTasks.length})
                    </h5>
                    <div className="grid grid-cols-1 gap-2">
                      {session.summary.newTasks.map((t: any, idx: number) => (
                        <div key={idx} className="p-2.5 rounded-lg border border-border bg-card">
                          <p className="font-bold text-foreground">{typeof t === 'string' ? t : t.title || t}</p>
                          {t.description && <p className="text-[10px] text-muted-foreground mt-0.5">{t.description}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {session?.summary?.updates?.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="font-bold text-blue-650 dark:text-blue-400 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-blue-500" />
                      Proposed Updates to Existing Tasks ({session.summary.updates.length})
                    </h5>
                    <div className="grid grid-cols-1 gap-2">
                      {session.summary.updates.map((t: any, idx: number) => (
                        <div key={idx} className="p-2.5 rounded-lg border border-border bg-card space-y-1">
                          <p className="font-bold text-foreground">{typeof t === 'string' ? t : t.title || t}</p>
                          {t.updateReason && (
                            <p className="text-[10px] text-blue-650 bg-blue-50 dark:bg-blue-950/40 p-1.5 rounded border border-blue-100/50">
                              <strong>AI suggestion:</strong> {t.updateReason}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {session?.summary?.duplicates?.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="font-bold text-amber-650 dark:text-amber-400 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-amber-500" />
                      Duplicates / Ignored Tasks ({session.summary.duplicates.length})
                    </h5>
                    <div className="grid grid-cols-1 gap-2 opacity-75">
                      {session.summary.duplicates.map((t: any, idx: number) => (
                        <div key={idx} className="p-2.5 rounded-lg border border-border bg-card">
                          <p className="font-semibold text-foreground line-through decoration-muted-foreground/50">{typeof t === 'string' ? t : t.title || t}</p>
                          {t.matchedTitle && <p className="text-[9px] text-amber-600 mt-0.5">Matched: <strong>{t.matchedTitle}</strong></p>}
                        </div>
                      ))}
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

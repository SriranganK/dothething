// src/components/BoardCreateModal.tsx
import { useState } from "react";
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
  Check
} from "lucide-react";
import { BOARD_TEMPLATES, type TemplateDefinition } from "@/lib/BoardTemplates";

// Icon mapping helper
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

export function BoardCreateModal({
  open,
  onClose,
  workspaceId,
  token,
  onBoardCreated,
}: BoardCreateModalProps) {
  const [boardName, setBoardName] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateDefinition | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<"All" | "Personal" | "Team" | "Business">("All");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setError("");

  if (!boardName.trim()) {
    setError("Please specify a board name.");
    return;
  }

  // Check for duplicate board name in current workspace
  try {
    const dupRes = await fetch(`${API_BASE_URL}/api/boards?workspaceId=${workspaceId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (dupRes.ok) {
      const dupData = await dupRes.json();
      const exists = dupData.boards?.some((b: any) => b.name.toLowerCase() === boardName.trim().toLowerCase());
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

  const handleClose = () => {
    setBoardName("");
    setSelectedTemplate(null);
    setCategoryFilter("All");
    setError("");
    onClose();
  };

  const filteredTemplates = BOARD_TEMPLATES.filter(
    (t) => categoryFilter === "All" || t.category === categoryFilter
  );

  return (
    <Dialog open={open} onOpenChange={(val) => !val && handleClose()}>
      <DialogContent className="sm:max-w-[900px] max-h-[85vh] overflow-y-auto p-6 rounded-2xl border-none shadow-2xl bg-card text-card-foreground text-foreground">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Layout className="h-6 w-6 text-primary" />
            Create Board
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Design columns and templates to match your workflow. Pick a template to get started immediately, or design a custom one.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 text-xs bg-red-50 border border-red-200 text-red-600 rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 py-2">
          {/* Board Name Input */}
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

          {/* Templates Section */}
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

            {/* Template Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1">
              {/* Custom Card (First Card Option) */}
              <div
                onClick={() => {
                  setSelectedTemplate(null);
                  if (!boardName) setBoardName("Custom Board");
                }}
                className={`p-4 rounded-xl border cursor-pointer transition-all hover:bg-background flex items-start gap-3 text-left
                  ${selectedTemplate === null 
                    ? "border-indigo-600 bg-primary/10/20" 
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
                      ${isSelected ? "border-indigo-600 bg-primary/10/20" : "border-border bg-card text-card-foreground"}`}
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border
                      ${isSelected 
                        ? "bg-primary text-white border-indigo-600" 
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
                      {/* Show columns layout */}
                      <div className="flex flex-wrap gap-1 mt-2.5">
                        {template.columns.map((col, _idx) => (
                          <span
                            key={col}
                            className="text-[9px] font-semibold bg-muted border border-border/50 text-muted-foreground px-1.5 py-0.5 rounded-md"
                          >
                            {col}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
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
      </DialogContent>
    </Dialog>
  );
}

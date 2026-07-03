import { useState } from "react";
import { useConfirm } from "@/context/ConfirmContext";
import {
  useGetLabelsQuery,
  useCreateLabelMutation,
  useUpdateLabelMutation,
  useDeleteLabelMutation,
} from "@/store/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label as FormLabel } from "@/components/ui/label";
import {
  Plus,
  Search,
  Tags,
  Trash2,
  Edit2,
  X,
} from "lucide-react";
import type { WorkspaceType } from "@/types/workspace";

interface LabelsManagementProps {
  workspace: WorkspaceType | null;
}

export function LabelsManagement({ workspace }: LabelsManagementProps) {
  const confirm = useConfirm();
  const workspaceId = workspace?._id || "";

  // Queries
  const { data: labelsData, isLoading } = useGetLabelsQuery(workspaceId, {
    skip: !workspaceId,
  });
  const labels = labelsData?.labels || [];

  // Mutations
  const [createLabel] = useCreateLabelMutation();
  const [updateLabel] = useUpdateLabelMutation();
  const [deleteLabel] = useDeleteLabelMutation();

  // Local state
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLabel, setEditingLabel] = useState<any>(null);

  // Form State
  const [name, setName] = useState("");
  const [color, setColor] = useState("#3b82f6");
  const [description, setDescription] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const colors = [
    "#ef4444", // Red
    "#f97316", // Orange
    "#f59e0b", // Amber
    "#10b981", // Emerald
    "#06b6d4", // Cyan
    "#3b82f6", // Blue
    "#6366f1", // Indigo
    "#8b5cf6", // Purple
    "#d946ef", // Fuchsia
    "#ec4899", // Pink
    "#64748b", // Slate
  ];

  const handleOpenCreate = () => {
    setEditingLabel(null);
    setName("");
    setColor("#3b82f6");
    setDescription("");
    setErrorMsg("");
    setIsFormOpen(true);
  };

  const handleOpenEdit = (l: any) => {
    setEditingLabel(l);
    setName(l.name);
    setColor(l.color || "#3b82f6");
    setDescription(l.description || "");
    setErrorMsg("");
    setIsFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      if (editingLabel) {
        await updateLabel({
          id: editingLabel._id,
          body: {
            name: name.trim(),
            color,
            description,
          },
        }).unwrap();
      } else {
        await createLabel({
          workspaceId,
          name: name.trim(),
          color,
          description,
        }).unwrap();
      }
      setIsFormOpen(false);
    } catch (err: any) {
      setErrorMsg(err.data?.message || "Failed to save label");
    }
  };

  const handleDelete = async (labelId: string) => {
    const ok = await confirm({
      title: "Delete Label",
      description: "Are you sure you want to delete this label? It will be removed from all assigned tasks.",
      confirmText: "Delete Label",
      variant: "destructive",
    });
    if (!ok) return;
    try {
      await deleteLabel(labelId).unwrap();
    } catch (err) {
      console.error("Failed to delete label:", err);
    }
  };

  const filteredLabels = labels.filter((l) =>
    l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (l.description && l.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background overflow-y-auto">
      {/* Top Header */}
      <div className="bg-card text-card-foreground border-b border-border px-8 py-5 shrink-0 select-none">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Tags className="h-6 w-6 text-primary" />
              <span>Labels Management</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Organize workspace items with custom tags.
            </p>
          </div>

          {workspace?.role !== "GUEST" && !isFormOpen && (
            <Button
              onClick={handleOpenCreate}
              className="bg-primary hover:bg-primary/90 text-white rounded-xl shadow-sm px-4 py-2 text-xs font-semibold cursor-pointer"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Label
            </Button>
          )}
        </div>

        {/* Search */}
        {!isFormOpen && (
          <div className="relative max-w-md mt-6">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search labels..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-10 border-border focus-visible:ring-indigo-606 rounded-xl bg-background"
            />
          </div>
        )}
      </div>

      {/* Main Grid content or Form */}
      <div className="flex-1 p-8 min-h-0">
        {isFormOpen ? (
          /* Create / Edit Form Layout */
          <div className="max-w-xl bg-card text-card-foreground border border-border rounded-2xl p-6 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex justify-between items-center pb-4 border-b border-border mb-6">
              <h3 className="text-md font-bold text-foreground">
                {editingLabel ? "Edit Label Details" : "Create New Tag Label"}
              </h3>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-muted-foreground cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-5 text-xs select-none">
              {errorMsg && (
                <div className="p-3 bg-red-50 text-red-650 rounded-lg border border-red-100 font-semibold">
                  {errorMsg}
                </div>
              )}

              {/* Name */}
              <div className="space-y-1.5">
                <FormLabel className="text-foreground/90 font-bold">Label Name *</FormLabel>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Backend"
                  className="h-10 border-border focus-visible:ring-ring rounded-xl"
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <FormLabel className="text-foreground/90 font-bold">Description</FormLabel>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Details or purpose of this label..."
                  className="h-10 border-border focus-visible:ring-ring rounded-xl"
                />
              </div>

              {/* Color Grid Selector */}
              <div className="space-y-2">
                <FormLabel className="text-foreground/90 font-bold">Select Color</FormLabel>
                <div className="flex items-center gap-2.5 flex-wrap">
                  {colors.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-7 h-7 rounded-full transition-transform cursor-pointer border ${color === c ? "scale-115 border-zinc-650 ring-1 ring-zinc-200" : "border-transparent"
                        }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}

                  {/* Hex input */}
                  <div className="flex items-center gap-1.5 border border-border rounded-lg bg-background px-2 h-7.5 max-w-28 text-[11px] font-semibold text-foreground/90">
                    <span>#</span>
                    <input
                      type="text"
                      value={color.replace("#", "")}
                      onChange={(e) => setColor(`#${e.target.value}`)}
                      className="bg-transparent border-none outline-none focus:ring-0 text-[11px] w-full font-bold focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Label Preview */}
              <div className="pt-2">
                <FormLabel className="text-foreground/90 font-bold">Preview</FormLabel>
                <div className="mt-2.5">
                  <span
                    className="px-3.5 py-1.5 rounded-full text-xs font-bold text-white shadow-xs"
                    style={{ backgroundColor: color }}
                  >
                    {name || "Preview"}
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t border-border flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsFormOpen(false)}
                  className="rounded-xl h-10 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!name.trim()}
                  className="bg-primary hover:bg-primary/90 text-white rounded-xl h-10 text-xs font-semibold cursor-pointer"
                >
                  {editingLabel ? "Save Changes" : "Create Label"}
                </Button>
              </div>
            </form>
          </div>
        ) : (
          /* Labels Grid List */
          <div className="bg-card text-card-foreground border border-border rounded-2xl overflow-hidden shadow-xs">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center p-20">
                <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3" />
                <span className="text-muted-foreground text-sm font-semibold">Loading labels...</span>
              </div>
            ) : filteredLabels.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground italic text-xs">
                No labels created yet.
              </div>
            ) : (
              <div className="divide-y divide-zinc-100">
                {filteredLabels.map((l) => (
                  <div
                    key={l._id}
                    className="p-5 flex items-center justify-between hover:bg-background/45 transition-colors group select-none"
                  >
                    <div className="flex items-center gap-6 min-w-0 flex-1">
                      {/* Color Tag Preview */}
                      <span
                        className="px-3 py-1 rounded-full text-[11px] font-bold text-white shadow-xs shrink-0"
                        style={{ backgroundColor: l.color }}
                      >
                        {l.name}
                      </span>

                      {/* Description */}
                      <p className="text-xs text-zinc-550 truncate max-w-xl">
                        {l.description || <span className="text-muted-foreground italic">No description</span>}
                      </p>
                    </div>

                    {workspace?.role !== "GUEST" && (
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0 pl-4 bg-card text-card-foreground md:bg-transparent">
                        <button
                          onClick={() => handleOpenEdit(l)}
                          className="p-1.5 hover:bg-muted text-muted-foreground hover:text-primary rounded-lg cursor-pointer transition-colors"
                          title="Edit label"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(l._id)}
                          className="p-1.5 hover:bg-muted text-zinc-550 hover:text-red-600 rounded-lg cursor-pointer transition-colors"
                          title="Delete label"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// src/components/WorkspaceCreateModal.tsx
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
import { Check, LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import type { WorkspaceType } from "@/types/workspace";

interface WorkspaceCreateModalProps {
  open: boolean;
  onClose: () => void;
  workspaces: WorkspaceType[];
  onWorkspaceCreated: (ws: WorkspaceType) => void;
}

export function WorkspaceCreateModal({
  open,
  onClose,
  workspaces,
  onWorkspaceCreated,
}: WorkspaceCreateModalProps) {
  const { token, logout } = useAuth();

  // Wizard States
  const [step, setStep] = useState(1);
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceType, setWorkspaceType] = useState("");
  const [teamSize, setTeamSize] = useState("");
  const [industry, setIndustry] = useState("");
  const [inviteEmails, setInviteEmails] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState("");
  const [modalError, setModalError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleAddEmail = () => {
    const trimmed = emailInput.trim().toLowerCase();
    if (!trimmed) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      setModalError("Please enter a valid email address.");
      return;
    }
    if (inviteEmails.includes(trimmed)) {
      setModalError("This email has already been added.");
      return;
    }

    setInviteEmails([...inviteEmails, trimmed]);
    setEmailInput("");
    setModalError("");
  };

  const handleRemoveEmail = (emailToRemove: string) => {
    setInviteEmails(inviteEmails.filter((email) => email !== emailToRemove));
  };

  const handleLogout = () => {
    logout();
    onClose();
  };

  const handleSubmitWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError("");

    if (!workspaceName.trim() || !workspaceType || !teamSize || !industry.trim()) {
      setModalError("Please fill all required fields.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/workspaces`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: workspaceName,
          type: workspaceType,
          teamSize,
          industry,
          members: inviteEmails,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to create workspace");

      const newWorkspace: WorkspaceType = data.workspace;

      // Notify parent component
      onWorkspaceCreated(newWorkspace);

      // Close modal and reset
      onClose();
      setStep(1);
      setWorkspaceName("");
      setWorkspaceType("");
      setTeamSize("");
      setIndustry("");
      setInviteEmails([]);
      setEmailInput("");
    } catch (err: any) {
      setModalError(err.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open}>
      <DialogContent
        showCloseButton={workspaces.length > 0}
        onInteractOutside={(e) => {
          if (workspaces.length === 0) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (workspaces.length === 0) e.preventDefault();
        }}
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="sm:max-w-[480px] p-6 rounded-2xl border-none shadow-2xl bg-card text-card-foreground"
      >
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-2xl font-bold tracking-tight text-foreground">
            {step === 1 && (workspaces.length === 0 ? "Create your first workspace" : "Create a new workspace")}
            {step === 2 && "Choose workspace type"}
            {step === 3 && "Select team size"}
            {step === 4 && "What is your industry?"}
            {step === 5 && "Invite teammates"}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {step === 1 && "Start by naming your workspace. You can always change this later."}
            {step === 2 && "Help us customize your workspace based on who you work with."}
            {step === 3 && "Tell us the size of your team to tailor the tracker features."}
            {step === 4 && "Type your industry or pick one of the common examples."}
            {step === 5 && "Invite your colleagues by entering their email addresses below."}
          </DialogDescription>
        </DialogHeader>

        {/* Progress Bar */}
        <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden mb-4">
          <div
            className="bg-primary h-full transition-all duration-300"
            style={{ width: `${(step / 5) * 100}%` }}
          />
        </div>

        {modalError && (
          <div className="p-3 text-xs bg-red-50 border border-red-200 text-red-600 rounded-xl">
            {modalError}
          </div>
        )}

        {/* Step Contents */}
        <div className="py-2 space-y-4">
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ws-name" className="text-foreground/90 font-medium">
                  Workspace Name
                </Label>
                <Input
                  id="ws-name"
                  type="text"
                  placeholder="e.g. Acme Corp"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  className="h-11 rounded-xl border-border focus-visible:ring-ring"
                  autoFocus
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="grid grid-cols-1 gap-3">
              {[
                { id: "Personal", title: "Personal", desc: "For solo trackers, freelancers, and side projects." },
                { id: "Team", title: "Team", desc: "For small teams and collaborative projects." },
                { id: "Company", title: "Company", desc: "For organizations and multiple departments." },
              ].map((opt) => (
                <div
                  key={opt.id}
                  onClick={() => setWorkspaceType(opt.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all hover:bg-background flex items-start gap-3
                    ${workspaceType === opt.id ? "border-indigo-600 bg-primary/10/20" : "border-border bg-card text-card-foreground"}`}
                >
                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5
                      ${workspaceType === opt.id ? "border-indigo-600 bg-primary" : "border-border"}`}
                  >
                    {workspaceType === opt.id && <Check className="w-3.5 h-3.5 text-white" />}
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground text-sm">{opt.title}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {step === 3 && (
            <div className="grid grid-cols-1 gap-3">
              {[
                { id: "Just me", label: "Just me" },
                { id: "2–10", label: "2–10 people" },
                { id: "11–50", label: "11–50 people" },
                { id: "50+", label: "50+ people" },
              ].map((opt) => (
                <div
                  key={opt.id}
                  onClick={() => setTeamSize(opt.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all hover:bg-background flex items-center justify-between
                    ${teamSize === opt.id ? "border-indigo-600 bg-primary/10/20" : "border-border bg-card text-card-foreground"}`}
                >
                  <span className="font-medium text-foreground text-sm">{opt.label}</span>
                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center
                      ${teamSize === opt.id ? "border-indigo-600 bg-primary" : "border-border"}`}
                  >
                    {teamSize === opt.id && <Check className="w-3.5 h-3.5 text-white" />}
                  </div>
                </div>
              ))}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ws-industry" className="text-foreground/90 font-medium">
                  Industry
                </Label>
                <Input
                  id="ws-industry"
                  type="text"
                  placeholder="e.g. Software"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="h-11 rounded-xl border-border focus-visible:ring-ring"
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground block">Suggested Categories:</span>
                <div className="flex flex-wrap gap-2">
                  {["Software", "Marketing", "Design", "Education"].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setIndustry(cat)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer
                        ${industry === cat
                          ? "border-indigo-600 bg-primary text-white"
                          : "border-border bg-card text-card-foreground text-muted-foreground hover:border-border"
                        }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-foreground/90 font-medium">Add Teammates' Emails</Label>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="colleague@example.com"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddEmail();
                      }
                    }}
                    className="h-11 rounded-xl border-border focus-visible:ring-ring"
                  />
                  <Button
                    type="button"
                    onClick={handleAddEmail}
                    variant="secondary"
                    className="h-11 rounded-xl px-4 cursor-pointer"
                  >
                    Add
                  </Button>
                </div>
              </div>

              {inviteEmails.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-medium text-muted-foreground block">
                    Invited Teammates ({inviteEmails.length}):
                  </span>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 border border-border rounded-xl bg-background">
                    {inviteEmails.map((email) => (
                      <Badge
                        key={email}
                        variant="secondary"
                        className="px-2.5 py-1 rounded-full text-xs flex items-center gap-1 bg-card text-card-foreground border border-border text-foreground/90"
                      >
                        {email}
                        <button
                          type="button"
                          onClick={() => handleRemoveEmail(email)}
                          className="text-muted-foreground hover:text-muted-foreground font-bold ml-0.5 text-sm"
                        >
                          &times;
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-3 mt-6 pt-4 border-t border-border">
          {step > 1 ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep(step - 1)}
              disabled={submitting}
              className="rounded-xl h-11 px-6 cursor-pointer"
            >
              Back
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              onClick={workspaces.length > 0 ? onClose : handleLogout}
              className="text-muted-foreground hover:bg-background hover:text-foreground/90 rounded-xl h-11 px-4 cursor-pointer"
            >
              {workspaces.length > 0 ? (
                "Cancel"
              ) : (
                <>
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </>
              )}
            </Button>
          )}

          {step < 5 ? (
            <Button
              type="button"
              onClick={() => {
                setModalError("");
                if (step === 1 && !workspaceName.trim()) return setModalError("Please enter a workspace name");
                if (step === 2 && !workspaceType) return setModalError("Please select a workspace type");
                if (step === 3 && !teamSize) return setModalError("Please select your team size");
                if (step === 4 && !industry.trim()) return setModalError("Please enter your industry");
                setStep(step + 1);
              }}
              className="bg-primary hover:bg-primary/90 text-white rounded-xl h-11 px-6 font-medium cursor-pointer ml-auto"
            >
              Next
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmitWorkspace}
              disabled={submitting}
              className="bg-primary hover:bg-primary/90 text-white rounded-xl h-11 px-6 font-medium cursor-pointer ml-auto"
            >
              {submitting ? "Creating..." : "Create Workspace"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

import React, { useState } from 'react';
import {
  useGetScratchShareTokensQuery,
  useCreateScratchShareTokenMutation,
  useDeleteScratchShareTokenMutation,
  useUpdateScratchPageMutation,
  useGetScratchCollaboratorsQuery,
  useAddScratchCollaboratorMutation,
  useUpdateScratchCollaboratorRoleMutation,
  useRemoveScratchCollaboratorMutation,
  useSearchUsersQuery,
} from '@/store/services/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Share2,
  Lock,
  Globe,
  Copy,
  Check,
  Clock,
  Trash2,
  Plus,
  ShieldCheck,
  Edit3,
  Eye,
  UserPlus,
  Users,
  Search,
  MessageSquare,
} from 'lucide-react';
import { toast } from 'sonner';

interface ScratchShareDialogProps {
  pageId: string;
  visibility: 'private' | 'workspace' | 'shared' | 'public';
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EXPIRY_OPTIONS = [
  { label: '1 Hour', hours: 1 },
  { label: '24 Hours (1 Day)', hours: 24 },
  { label: '7 Days', hours: 168 },
  { label: '30 Days', hours: 720 },
  { label: 'Never Expires', hours: null },
];

export const ScratchShareDialog: React.FC<ScratchShareDialogProps> = ({
  pageId,
  visibility,
  open,
  onOpenChange,
}) => {
  const [updatePage] = useUpdateScratchPageMutation();

  // Share tokens RTK Query
  const { data: tokensData } = useGetScratchShareTokensQuery(pageId, { skip: !open });
  const [createShareToken] = useCreateScratchShareTokenMutation();
  const [deleteShareToken] = useDeleteScratchShareTokenMutation();

  // Collaborators RTK Query
  const { data: collabData } = useGetScratchCollaboratorsQuery(pageId, { skip: !open });
  const [addCollaborator, { isLoading: isAddingCollab }] = useAddScratchCollaboratorMutation();
  const [updateCollabRole] = useUpdateScratchCollaboratorRoleMutation();
  const [removeCollaborator] = useRemoveScratchCollaboratorMutation();

  const owner = collabData?.owner;
  const collaborators = collabData?.collaborators || [];
  const tokens = tokensData?.tokens || [];

  // Invite state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'commenter' | 'viewer'>('editor');
  const [showSuggestions, setShowSuggestions] = useState(false);

  // User search query for autocomplete
  const { data: searchData } = useSearchUsersQuery(inviteEmail, {
    skip: !inviteEmail || inviteEmail.length < 2,
  });
  const suggestedUsers = searchData?.users || [];

  // Public link state
  const [role, setRole] = useState<'viewer' | 'editor'>('viewer');
  const [expiresInHours, setExpiresInHours] = useState<number | null>(24);
  const [copiedTokenId, setCopiedTokenId] = useState<string | null>(null);

  const handleInviteUser = async (emailToInvite?: string) => {
    const targetEmail = (emailToInvite || inviteEmail).trim();
    if (!targetEmail) {
      toast.error('Please enter a user email to invite');
      return;
    }

    try {
      await addCollaborator({
        pageId,
        email: targetEmail,
        role: inviteRole,
      }).unwrap();
      toast.success(`Invited ${targetEmail} as ${inviteRole}`);
      setInviteEmail('');
      setShowSuggestions(false);
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to invite collaborator');
    }
  };

  const handleUpdateRole = async (userId: string, newRole: 'editor' | 'commenter' | 'viewer') => {
    try {
      await updateCollabRole({ pageId, userId, role: newRole }).unwrap();
      toast.success('Collaborator role updated');
    } catch (err) {
      toast.error('Failed to update collaborator role');
    }
  };

  const handleRemoveCollaborator = async (userId: string) => {
    try {
      await removeCollaborator({ pageId, userId }).unwrap();
      toast.success('Collaborator removed');
    } catch (err) {
      toast.error('Failed to remove collaborator');
    }
  };

  const handleCopyLink = (tokenStr: string, tokenId: string) => {
    const shareUrl = `${window.location.origin}/scratch/public/${tokenStr}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedTokenId(tokenId);
    toast.success('Public share link copied to clipboard!');
    setTimeout(() => setCopiedTokenId(null), 2000);
  };

  const handleGenerateToken = async () => {
    try {
      const res = await createShareToken({
        pageId,
        role,
        expiresInHours,
      }).unwrap();

      if (res.shareToken) {
        toast.success('Public share link created!');
        handleCopyLink(res.shareToken.token, res.shareToken._id);
      }
    } catch (err) {
      console.error('Failed to generate share token:', err);
      toast.error('Failed to create share link');
    }
  };

  const handleRevokeToken = async (tokenId: string) => {
    try {
      await deleteShareToken(tokenId).unwrap();
      toast.success('Share link revoked');
    } catch (err) {
      console.error('Failed to revoke share token:', err);
    }
  };

  const handleChangeVisibility = async (newVis: 'private' | 'workspace') => {
    try {
      await updatePage({ id: pageId, body: { visibility: newVis } }).unwrap();
      toast.success(`Page access changed to ${newVis}`);
    } catch (err) {
      console.error('Failed to update visibility:', err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border text-card-foreground max-w-lg select-none max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-primary" />
            Share & Invite Collaborators
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Notion-Style Invite Bar */}
          <div className="p-3 bg-muted/40 border border-border rounded-xl space-y-2 relative">
            <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <UserPlus className="h-4 w-4 text-primary" />
              Invite People to Page
            </p>
            <div className="flex items-center gap-2 relative">
              <div className="flex-1 relative">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => {
                    setInviteEmail(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleInviteUser()}
                  placeholder="Enter email or name to invite..."
                  className="w-full text-xs p-2 bg-card border border-border rounded-lg text-foreground focus:outline-none placeholder:text-muted-foreground/50"
                />

                {/* Autocomplete Dropdown */}
                {showSuggestions && suggestedUsers.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-xl z-50 overflow-hidden">
                    {suggestedUsers.map((u) => (
                      <button
                        key={u._id}
                        onClick={() => {
                          setInviteEmail(u.email);
                          handleInviteUser(u.email);
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-muted text-xs flex items-center justify-between cursor-pointer border-b border-border/50 last:border-none"
                      >
                        <span className="font-semibold text-foreground">{u.name}</span>
                        <span className="text-muted-foreground">{u.email}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as any)}
                className="text-xs p-2 bg-card border border-border rounded-lg text-foreground focus:outline-none cursor-pointer shrink-0"
              >
                <option value="editor">Can Edit</option>
                <option value="commenter">Can Comment</option>
                <option value="viewer">Can View</option>
              </select>

              <Button
                size="sm"
                onClick={() => handleInviteUser()}
                disabled={isAddingCollab}
                className="text-xs font-semibold cursor-pointer shrink-0"
              >
                Invite
              </Button>
            </div>
          </div>

          {/* People With Access List */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-primary" />
                People with Access
              </span>
              <span className="text-[10px] text-muted-foreground font-normal">
                {collaborators.length + (owner ? 1 : 0)} member(s)
              </span>
            </p>

            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {/* Owner Item */}
              {owner && (
                <div className="flex items-center justify-between p-2.5 bg-card border border-border/60 rounded-xl text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center text-xs shrink-0 uppercase">
                      {owner.name ? owner.name.charAt(0) : 'O'}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground truncate">
                        {owner.name || owner.email}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">{owner.email}</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold text-primary px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                    Owner
                  </span>
                </div>
              )}

              {/* Invited Collaborators */}
              {collaborators.map((c) => (
                <div
                  key={c.user._id}
                  className="flex items-center justify-between p-2.5 bg-card border border-border/60 rounded-xl text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-muted font-bold flex items-center justify-center text-xs shrink-0 uppercase text-muted-foreground">
                      {c.user.name ? c.user.name.charAt(0) : 'U'}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground truncate">
                        {c.user.name || c.user.email}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">{c.user.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      value={c.role}
                      onChange={(e) => handleUpdateRole(c.user._id, e.target.value as any)}
                      className="text-xs p-1 bg-muted border border-border rounded-md text-foreground focus:outline-none cursor-pointer"
                    >
                      <option value="editor">Can Edit</option>
                      <option value="commenter">Can Comment</option>
                      <option value="viewer">Can View</option>
                    </select>

                    <button
                      onClick={() => handleRemoveCollaborator(c.user._id)}
                      className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors cursor-pointer"
                      title="Remove access"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Workspace Access Settings */}
          <div className="border-t border-border pt-4">
            <p className="text-xs font-semibold text-muted-foreground mb-2">Workspace Visibility</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleChangeVisibility('private')}
                className={`flex items-center gap-3 p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                  visibility === 'private'
                    ? 'border-primary bg-primary/10 text-primary font-medium'
                    : 'border-border hover:bg-muted text-foreground'
                }`}
              >
                <Lock className="h-4 w-4 shrink-0" />
                <div>
                  <p className="text-xs font-semibold">Private Page</p>
                  <p className="text-[10px] text-muted-foreground">Only invited people access</p>
                </div>
              </button>

              <button
                onClick={() => handleChangeVisibility('workspace')}
                className={`flex items-center gap-3 p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                  visibility === 'workspace'
                    ? 'border-primary bg-primary/10 text-primary font-medium'
                    : 'border-border hover:bg-muted text-foreground'
                }`}
              >
                <Globe className="h-4 w-4 shrink-0 text-primary" />
                <div>
                  <p className="text-xs font-semibold">Workspace Page</p>
                  <p className="text-[10px] text-muted-foreground">All workspace members access</p>
                </div>
              </button>
            </div>
          </div>

          {/* Public Link Generator */}
          <div className="border-t border-border pt-4">
            <p className="text-xs font-semibold text-foreground mb-2 flex items-center justify-between">
              <span>Public Token-Embedded Web Share Links</span>
              <span className="text-[10px] text-muted-foreground font-normal">Allows web guests access</span>
            </p>

            <div className="p-3 bg-muted/40 border border-border rounded-xl space-y-3 mb-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">Permission Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as 'viewer' | 'editor')}
                    className="w-full text-xs p-1.5 bg-card border border-border rounded-lg text-foreground focus:outline-none cursor-pointer"
                  >
                    <option value="viewer">Viewer (Read Only)</option>
                    <option value="editor">Editor (Can Edit Page)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">Expiration Limit</label>
                  <select
                    value={expiresInHours === null ? 'never' : String(expiresInHours)}
                    onChange={(e) => setExpiresInHours(e.target.value === 'never' ? null : Number(e.target.value))}
                    className="w-full text-xs p-1.5 bg-card border border-border rounded-lg text-foreground focus:outline-none cursor-pointer"
                  >
                    {EXPIRY_OPTIONS.map((opt) => (
                      <option key={opt.label} value={opt.hours === null ? 'never' : String(opt.hours)}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <Button size="sm" onClick={handleGenerateToken} className="w-full text-xs cursor-pointer font-bold">
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Generate Public Web Link
              </Button>
            </div>

            {/* Active Share Links */}
            <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
              {tokens.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">No public web links created.</p>
              ) : (
                tokens.map((tok) => {
                  const isExpired = tok.expiresAt && new Date() > new Date(tok.expiresAt);
                  return (
                    <div
                      key={tok._id}
                      className="flex items-center justify-between p-2.5 bg-card border border-border rounded-xl text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {tok.role === 'editor' ? (
                          <div title="Editor access"><Edit3 className="h-4 w-4 text-amber-500 shrink-0" /></div>
                        ) : (
                          <div title="Viewer access"><Eye className="h-4 w-4 text-emerald-500 shrink-0" /></div>
                        )}
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground capitalize truncate">
                            {tok.role} Link
                          </p>
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {isExpired ? (
                              <span className="text-destructive font-semibold">Expired</span>
                            ) : tok.expiresAt ? (
                              `Expires ${new Date(tok.expiresAt).toLocaleDateString()}`
                            ) : (
                              'Never expires'
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCopyLink(tok.token, tok._id)}
                          className="h-7 text-xs px-2.5 cursor-pointer"
                        >
                          {copiedTokenId === tok._id ? (
                            <Check className="h-3 w-3 text-emerald-500 mr-1" />
                          ) : (
                            <Copy className="h-3 w-3 mr-1" />
                          )}
                          {copiedTokenId === tok._id ? 'Copied' : 'Copy'}
                        </Button>
                        <button
                          onClick={() => handleRevokeToken(tok._id)}
                          className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors cursor-pointer"
                          title="Revoke link"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

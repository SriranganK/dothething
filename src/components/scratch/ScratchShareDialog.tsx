import React, { useState } from 'react';
import {
  useGetScratchShareTokensQuery,
  useCreateScratchShareTokenMutation,
  useDeleteScratchShareTokenMutation,
  useUpdateScratchPageMutation,
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
  const { data: tokensData } = useGetScratchShareTokensQuery(pageId, { skip: !open });
  const [createShareToken] = useCreateScratchShareTokenMutation();
  const [deleteShareToken] = useDeleteScratchShareTokenMutation();

  const tokens = tokensData?.tokens || [];

  const [role, setRole] = useState<'viewer' | 'editor'>('viewer');
  const [expiresInHours, setExpiresInHours] = useState<number | null>(24);
  const [copiedTokenId, setCopiedTokenId] = useState<string | null>(null);

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
      <DialogContent className="bg-card border-border text-card-foreground max-w-lg select-none">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-primary" />
            Share Scratch Page
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Workspace Access Settings */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">Workspace Access</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleChangeVisibility('private')}
                className={`flex items-center gap-3 p-3 rounded-xl border text-left cursor-pointer transition-all ${
                  visibility === 'private'
                    ? 'border-primary bg-primary/10 text-primary font-medium'
                    : 'border-border hover:bg-muted text-foreground'
                }`}
              >
                <Lock className="h-4 w-4 shrink-0" />
                <div>
                  <p className="text-xs font-semibold">Private</p>
                  <p className="text-[10px] text-muted-foreground">Only you have access</p>
                </div>
              </button>

              <button
                onClick={() => handleChangeVisibility('workspace')}
                className={`flex items-center gap-3 p-3 rounded-xl border text-left cursor-pointer transition-all ${
                  visibility === 'workspace'
                    ? 'border-primary bg-primary/10 text-primary font-medium'
                    : 'border-border hover:bg-muted text-foreground'
                }`}
              >
                <Globe className="h-4 w-4 shrink-0 text-primary" />
                <div>
                  <p className="text-xs font-semibold">Workspace</p>
                  <p className="text-[10px] text-muted-foreground">All members can access</p>
                </div>
              </button>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <p className="text-xs font-semibold text-foreground mb-2 flex items-center justify-between">
              <span>Public Token-Embedded Share Links</span>
              <span className="text-[10px] text-muted-foreground font-normal">Allows non-account guests to view/edit</span>
            </p>

            {/* Token Generator Form */}
            <div className="p-3 bg-muted/40 border border-border rounded-xl space-y-3 mb-4">
              <div className="grid grid-cols-2 gap-3">
                {/* Role selection */}
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

                {/* Expiry selection */}
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
                Generate Public Share Link
              </Button>
            </div>

            {/* Active Share Links List */}
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {tokens.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-3">No active public share links created.</p>
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
                            {tok.role} Access
                          </p>
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {isExpired ? (
                              <span className="text-destructive font-semibold">Expired</span>
                            ) : tok.expiresAt ? (
                              `Expires ${new Date(tok.expiresAt).toLocaleDateString()} ${new Date(tok.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
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

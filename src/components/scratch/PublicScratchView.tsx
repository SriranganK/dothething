import React, { useState, useEffect } from 'react';
import {
  useGetPublicScratchPageQuery,
  useUpdatePublicScratchBlockMutation,
} from '@/store/services/api';
import type { ScratchBlock } from '@/types/scratch';
import { Button } from '@/components/ui/button';
import { Lock, Eye, Edit3, Clock, AlertTriangle, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

interface PublicScratchViewProps {
  token: string;
}

export const PublicScratchView: React.FC<PublicScratchViewProps> = ({ token }) => {
  const { data, isLoading, isError, error } = useGetPublicScratchPageQuery(token, { skip: !token });
  const [updatePublicBlock] = useUpdatePublicScratchBlockMutation();

  const page = data?.page;
  const serverBlocks = data?.blocks || [];
  const role = data?.role || 'viewer';
  const expiresAt = data?.expiresAt;

  const [blocks, setBlocks] = useState<ScratchBlock[]>([]);

  useEffect(() => {
    if (serverBlocks) {
      setBlocks(serverBlocks);
    }
  }, [serverBlocks]);

  const handleUpdateBlockContent = async (blockId: string, content: string) => {
    if (role !== 'editor') return;
    setBlocks((prev) =>
      prev.map((b) => (b._id === blockId ? { ...b, content } : b))
    );
    try {
      await updatePublicBlock({ token, blockId, body: { content } }).unwrap();
    } catch (err) {
      console.error('Failed to update public block:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-8">
        <p className="text-sm text-muted-foreground animate-pulse">Loading shared document...</p>
      </div>
    );
  }

  if (isError || !page) {
    const errMessage = (error as any)?.data?.message || 'Invalid or expired share link.';
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-8 select-none">
        <div className="w-16 h-16 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mb-4">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold mb-2">Access Denied</h2>
        <p className="text-sm text-muted-foreground max-w-sm text-center mb-6">{errMessage}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Banner for Guest Public View */}
      <div className="flex items-center justify-between px-8 py-3 border-b border-border bg-card/80 text-xs shrink-0 select-none sticky top-0 z-30 backdrop-blur-md">
        <div className="flex items-center gap-2 font-semibold">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <span>Shared Scratch Document</span>
          <span>/</span>
          <span className="text-muted-foreground truncate max-w-[200px]">{page.title || 'Untitled'}</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium">
            {role === 'editor' ? <Edit3 className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            <span className="capitalize">{role === 'editor' ? 'Can Edit' : 'Read Only'}</span>
          </div>

          {expiresAt && (
            <div className="flex items-center gap-1 text-muted-foreground font-mono">
              <Clock className="h-3.5 w-3.5" />
              <span>Expires {new Date(expiresAt).toLocaleDateString()}</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Document Content */}
      <div className="max-w-3xl w-full mx-auto px-8 py-10 flex-1">
        {page.icon && <div className="text-4xl mb-4 select-none">{page.icon}</div>}
        <h1 className="text-3xl font-extrabold text-foreground mb-8 tracking-tight">{page.title || 'Untitled'}</h1>

        <div className="space-y-3">
          {blocks.map((block) => (
            <div key={block._id} className="py-1">
              {role === 'editor' ? (
                <div
                  contentEditable
                  suppressContentEditableWarning
                  onInput={(e) => handleUpdateBlockContent(block._id, e.currentTarget.innerHTML)}
                  dangerouslySetInnerHTML={{ __html: block.content || '' }}
                  className="w-full bg-transparent text-foreground outline-none border-b border-transparent focus:border-border py-1 text-sm leading-relaxed"
                />
              ) : (
                <div
                  dangerouslySetInnerHTML={{ __html: block.content || '<br>' }}
                  className="text-sm text-foreground leading-relaxed py-1"
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

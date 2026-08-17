import React, { useState } from 'react';
import {
  useGetScratchCommentsQuery,
  useCreateScratchCommentMutation,
  useReplyScratchCommentMutation,
  useResolveScratchCommentMutation,
  useDeleteScratchCommentMutation,
} from '@/store/services/api';
import type { ScratchBlock } from '@/types/scratch';
import { Button } from '@/components/ui/button';
import {
  MessageSquare,
  CheckCircle2,
  Send,
  Trash2,
  X,
  CornerDownRight,
  User as UserIcon,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';

interface ScratchCommentsDrawerProps {
  pageId: string;
  blocks?: ScratchBlock[];
  activeBlockId?: string | null;
  onSelectBlockId?: (id: string | null) => void;
  onClose: () => void;
}

export const ScratchCommentsDrawer: React.FC<ScratchCommentsDrawerProps> = ({
  pageId,
  blocks = [],
  activeBlockId,
  onSelectBlockId,
  onClose,
}) => {
  const { data, isLoading } = useGetScratchCommentsQuery(pageId, { skip: !pageId });
  const [createComment] = useCreateScratchCommentMutation();
  const [replyComment] = useReplyScratchCommentMutation();
  const [resolveComment] = useResolveScratchCommentMutation();
  const [deleteComment] = useDeleteScratchCommentMutation();

  const comments = data?.comments || [];
  const [newCommentText, setNewCommentText] = useState('');
  const [replyTextMap, setReplyTextMap] = useState<Record<string, string>>({});
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('open');
  const [filterByLine, setFilterByLine] = useState(false);

  const activeBlock = blocks.find((b) => b._id === activeBlockId);
  const activeBlockText = activeBlock ? activeBlock.content.replace(/<[^>]*>/g, '') : '';

  const filteredComments = comments.filter((c) => {
    if (filterByLine && activeBlockId && c.blockId !== activeBlockId) {
      return false;
    }
    if (filter === 'open') return !c.resolved;
    if (filter === 'resolved') return c.resolved;
    return true;
  });

  const handleAddComment = async () => {
    if (!newCommentText.trim()) return;
    try {
      await createComment({
        pageId,
        blockId: activeBlockId || null,
        content: newCommentText.trim(),
      }).unwrap();
      setNewCommentText('');
      toast.success('Comment added to line');
    } catch (err) {
      console.error('Failed to add comment:', err);
      toast.error('Failed to add comment');
    }
  };

  const handleSendReply = async (commentId: string) => {
    const text = replyTextMap[commentId];
    if (!text || !text.trim()) return;
    try {
      await replyComment({ commentId, content: text.trim() }).unwrap();
      setReplyTextMap((prev) => ({ ...prev, [commentId]: '' }));
      setActiveReplyId(null);
      toast.success('Reply added');
    } catch (err) {
      console.error('Failed to send reply:', err);
      toast.error('Failed to add reply');
    }
  };

  const handleToggleResolve = async (commentId: string) => {
    try {
      await resolveComment(commentId).unwrap();
    } catch (err) {
      console.error('Failed to resolve comment:', err);
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      await deleteComment(commentId).unwrap();
      toast.success('Comment deleted');
    } catch (err) {
      console.error('Failed to delete comment:', err);
    }
  };

  const handleJumpToBlock = (blockId?: string | null) => {
    if (!blockId) return;
    onSelectBlockId?.(blockId);
    const el = document.getElementById(blockId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-primary');
      setTimeout(() => el.classList.remove('ring-2', 'ring-primary'), 2000);
    }
  };

  return (
    <div className="w-80 h-full border-l border-border bg-card text-card-foreground flex flex-col z-40 select-none shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2 font-semibold text-sm">
          <MessageSquare className="h-4 w-4 text-primary" />
          <span>Comments</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 p-2 border-b border-border text-xs bg-muted/30">
        <button
          onClick={() => setFilter('open')}
          className={`flex-1 py-1 rounded-md text-center font-medium transition-colors cursor-pointer ${
            filter === 'open' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Open ({comments.filter((c) => !c.resolved).length})
        </button>
        <button
          onClick={() => setFilter('resolved')}
          className={`flex-1 py-1 rounded-md text-center font-medium transition-colors cursor-pointer ${
            filter === 'resolved' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Resolved ({comments.filter((c) => c.resolved).length})
        </button>
        <button
          onClick={() => setFilter('all')}
          className={`flex-1 py-1 rounded-md text-center font-medium transition-colors cursor-pointer ${
            filter === 'all' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          All ({comments.length})
        </button>
      </div>

      {/* Comment Input Box */}
      <div className="p-3 border-b border-border bg-card">
        {activeBlockId && (
          <div className="flex items-center justify-between bg-primary/10 border border-primary/20 p-2 rounded-lg mb-2">
            <div className="truncate flex-1 mr-2">
              <span className="text-[10px] font-bold text-primary block uppercase tracking-wider">Line Selected</span>
              <span className="text-xs text-foreground truncate block font-medium">
                {activeBlockText ? `"${activeBlockText}"` : 'Selected Line'}
              </span>
            </div>
            <button
              onClick={() => onSelectBlockId?.(null)}
              className="text-[10px] font-semibold text-primary hover:underline shrink-0 cursor-pointer"
            >
              Clear Line
            </button>
          </div>
        )}

        {activeBlockId && (
          <div className="flex items-center justify-between mb-2 text-xs">
            <label className="flex items-center gap-1.5 text-muted-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                checked={filterByLine}
                onChange={(e) => setFilterByLine(e.target.checked)}
                className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5"
              />
              <span>Filter by selected line</span>
            </label>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <textarea
            value={newCommentText}
            onChange={(e) => setNewCommentText(e.target.value)}
            placeholder={activeBlockId ? "Comment on selected line..." : "Write a page comment..."}
            rows={2}
            className="w-full text-xs p-2 bg-muted border border-border rounded-lg text-foreground focus:outline-none resize-none placeholder:text-muted-foreground"
          />
          <div className="flex justify-end">
            <Button size="sm" onClick={handleAddComment} className="h-7 text-xs px-3 cursor-pointer">
              <Send className="h-3 w-3 mr-1" /> Comment
            </Button>
          </div>
        </div>
      </div>

      {/* Comment List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {isLoading ? (
          <p className="text-xs text-muted-foreground text-center py-4">Loading comments...</p>
        ) : filteredComments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-xs">No comments found</p>
          </div>
        ) : (
          filteredComments.map((comment) => {
            const targetBlock = blocks.find((b) => b._id === comment.blockId);
            const blockSnippet = targetBlock ? targetBlock.content.replace(/<[^>]*>/g, '') : null;

            return (
              <div
                key={comment._id}
                className={`p-3 rounded-xl border transition-all ${
                  comment.resolved ? 'border-border/60 bg-muted/20 opacity-70' : 'border-border bg-card shadow-sm'
                }`}
              >
                {/* Author Header */}
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                      {comment.author?.name ? comment.author.name.charAt(0).toUpperCase() : <UserIcon className="h-3 w-3" />}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground truncate max-w-[130px]">
                        {comment.author?.name || 'User'}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(comment.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleToggleResolve(comment._id)}
                      className={`p-1 rounded-md transition-colors cursor-pointer ${
                        comment.resolved ? 'text-emerald-500 hover:bg-emerald-500/10' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                      }`}
                      title={comment.resolved ? 'Reopen comment' : 'Resolve comment'}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(comment._id)}
                      className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors cursor-pointer"
                      title="Delete comment"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Line Context Badge */}
                {comment.blockId && (
                  <div
                    onClick={() => handleJumpToBlock(comment.blockId)}
                    className="mb-2 flex items-center gap-1.5 text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-md cursor-pointer hover:bg-amber-500/20 transition-colors"
                    title="Click to jump to this line"
                  >
                    <ExternalLink className="h-3 w-3 shrink-0" />
                    <span className="truncate">
                      {blockSnippet ? `Line: "${blockSnippet}"` : 'Linked to specific line'}
                    </span>
                  </div>
                )}

                {/* Content */}
                <p className="text-xs text-foreground leading-relaxed my-1.5 whitespace-pre-wrap">
                  {comment.content}
                </p>

                {/* Replies List */}
                {comment.replies && comment.replies.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-border space-y-2">
                    {comment.replies.map((reply: any, i: number) => (
                      <div key={i} className="flex items-start gap-2 pl-2">
                        <CornerDownRight className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-semibold text-foreground truncate">{reply.author?.name || 'User'}</span>
                            <span className="text-[9px] text-muted-foreground">{new Date(reply.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{reply.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Reply Button / Box */}
                <div className="mt-2 pt-1">
                  {activeReplyId === comment._id ? (
                    <div className="space-y-1.5 pt-1">
                      <input
                        type="text"
                        value={replyTextMap[comment._id] || ''}
                        onChange={(e) => setReplyTextMap({ ...replyTextMap, [comment._id]: e.target.value })}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendReply(comment._id)}
                        placeholder="Write a reply..."
                        className="w-full text-xs p-1.5 bg-muted border border-border rounded-md text-foreground focus:outline-none"
                      />
                      <div className="flex items-center justify-end gap-1.5">
                        <Button size="sm" variant="ghost" onClick={() => setActiveReplyId(null)} className="h-6 text-[10px] px-2">
                          Cancel
                        </Button>
                        <Button size="sm" onClick={() => handleSendReply(comment._id)} className="h-6 text-[10px] px-2">
                          Reply
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setActiveReplyId(comment._id)}
                      className="text-[11px] font-medium text-primary hover:underline cursor-pointer"
                    >
                      Reply
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

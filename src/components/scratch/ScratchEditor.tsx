import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  useGetScratchPageQuery,
  useGetScratchPagesQuery,
  useUpdateScratchPageMutation,
  useCreateScratchBlockMutation,
  useUpdateScratchBlockMutation,
  useDeleteScratchBlockMutation,
  useReorderScratchBlocksMutation,
  useGetScratchCommentsQuery,
} from '@/store/services/api';
import type { ScratchBlock, BlockType, ScratchBlockProperties, ScratchComment, ScratchPage } from '@/types/scratch';
import { BlockRenderer } from './BlockRenderer';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScratchCommentsDrawer } from './ScratchCommentsDrawer';
import { ScratchShareDialog } from './ScratchShareDialog';
import { ScratchLeftToolbar } from './ScratchLeftToolbar';
import { useNotifications } from '@/components/NotificationProvider';
import { useAuth } from '@/context/AuthContext';
import {
  Smile,
  Image,
  Star,
  Copy,
  Share2,
  Lock,
  Globe,
  Check,
  MessageSquare,
  FolderOutput,
  ChevronRight,
  FileUp,
  CheckSquare,
  Table as TableIcon,
  Code,
  Quote,
  Minus,
} from 'lucide-react';
import { toast } from 'sonner';

interface ScratchEditorProps {
  pageId: string;
}

const EMOJI_OPTIONS = ['📄', '🚀', '💡', '📝', '📅', '🎯', '⚙️', '🧪', '🎨', '📊', '⚡', '🔥', '📌', '🔍', '✨'];
const COVER_GRADIENTS = [
  'bg-gradient-to-r from-violet-500 to-purple-600',
  'bg-gradient-to-r from-blue-500 to-cyan-500',
  'bg-gradient-to-r from-emerald-400 to-teal-600',
  'bg-gradient-to-r from-amber-400 to-orange-500',
  'bg-gradient-to-r from-rose-400 to-red-500',
  'bg-gradient-to-r from-slate-800 to-zinc-900',
];

export const ScratchEditor: React.FC<ScratchEditorProps> = ({ pageId }) => {
  const { data, isLoading, isError } = useGetScratchPageQuery(pageId, { skip: !pageId });

  const [updatePage] = useUpdateScratchPageMutation();
  const [createBlock] = useCreateScratchBlockMutation();
  const [updateBlock] = useUpdateScratchBlockMutation();
  const [deleteBlock] = useDeleteScratchBlockMutation();
  const [reorderBlocks] = useReorderScratchBlocksMutation();

  const page = data?.page;
  const workspaceId = page?.workspace || '';
  const { data: workspacePagesData } = useGetScratchPagesQuery(workspaceId, { skip: !workspaceId });
  const workspacePages = workspacePagesData?.pages || [];

  const serverBlocks = data?.blocks || [];

  const [title, setTitle] = useState('');
  const [icon, setIcon] = useState('📄');
  const [cover, setCover] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [visibility, setVisibility] = useState<'private' | 'workspace' | 'shared' | 'public'>('private');
  const [blocks, setBlocks] = useState<ScratchBlock[]>([]);
  const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null);

  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const [moveBlockId, setMoveBlockId] = useState<string | null>(null);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);

  const [showCommentsDrawer, setShowCommentsDrawer] = useState(false);
  const [activeCommentBlockId, setActiveCommentBlockId] = useState<string | null>(null);

  const { data: commentsData } = useGetScratchCommentsQuery(pageId, { skip: !pageId });
  const comments = commentsData?.comments || [];
  const openCommentsCount = comments.filter((c) => !c.resolved).length;

  const commentsByBlockId = useMemo(() => {
    const map: Record<string, { total: number; open: number; comments: ScratchComment[] }> = {};
    comments.forEach((c) => {
      if (c.blockId) {
        if (!map[c.blockId]) {
          map[c.blockId] = { total: 0, open: 0, comments: [] };
        }
        map[c.blockId].total += 1;
        if (!c.resolved) map[c.blockId].open += 1;
        map[c.blockId].comments.push(c);
      }
    });
    return map;
  }, [comments]);

  // Sync state from server on page change or initial load
  const loadedPageIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (page && loadedPageIdRef.current !== pageId) {
      loadedPageIdRef.current = pageId;
      setTitle(page.title || '');
      setIcon(page.icon || '📄');
      setCover(page.cover || '');
      setIsFavorite(!!page.isFavorite);
      setVisibility(page.visibility || 'private');
    }
  }, [page, pageId]);

  const isInitializedRef = useRef(false);

  useEffect(() => {
    isInitializedRef.current = false;
  }, [pageId]);

  useEffect(() => {
    if (serverBlocks && serverBlocks.length > 0 && !isInitializedRef.current) {
      setBlocks(serverBlocks);
      isInitializedRef.current = true;
    }
  }, [serverBlocks]);

  const { socket } = useNotifications();
  const { user } = useAuth();

  // Socket room join & listen for real-time block & page updates
  useEffect(() => {
    if (socket && pageId) {
      socket.emit('scratch:join', pageId);

      const handleRemoteBlockTyping = (data: any) => {
        const currentUserId = user?.id || (user as any)?._id;
        if (data?.senderId && currentUserId && String(data.senderId) === String(currentUserId)) return;
        if (data?.block?._id) {
          setBlocks((prev) =>
            prev.map((b) => (b._id === data.block._id ? { ...b, content: data.block.content } : b))
          );
        }
      };

      const handleRemoteTitleTyping = (data: any) => {
        const currentUserId = user?.id || (user as any)?._id;
        if (data?.senderId && currentUserId && String(data.senderId) === String(currentUserId)) return;
        if (data?.title !== undefined) {
          setTitle(data.title);
        }
      };

      const handleRemoteBlockUpdate = (data: any) => {
        const currentUserId = user?.id || (user as any)?._id;
        if (data?.senderId && currentUserId && String(data.senderId) === String(currentUserId)) return;
        if (data?.block) {
          setBlocks((prev) =>
            prev.map((b) => (b._id === data.block._id ? data.block : b))
          );
        }
      };

      const handleRemoteBlockCreated = (data: any) => {
        const currentUserId = user?.id || (user as any)?._id;
        if (data?.senderId && currentUserId && String(data.senderId) === String(currentUserId)) return;
        if (data?.block) {
          setBlocks((prev) => {
            if (prev.some((b) => b._id === data.block._id)) return prev;
            return [...prev, data.block];
          });
        }
      };

      const handleRemoteBlockDeleted = (data: any) => {
        const currentUserId = user?.id || (user as any)?._id;
        if (data?.senderId && currentUserId && String(data.senderId) === String(currentUserId)) return;
        if (data?.blockId) {
          setBlocks((prev) => prev.filter((b) => b._id !== data.blockId));
        }
      };

      const handleRemoteBlocksReordered = (data: any) => {
        const currentUserId = user?.id || (user as any)?._id;
        if (data?.senderId && currentUserId && String(data.senderId) === String(currentUserId)) return;
        if (data?.blocks && Array.isArray(data.blocks)) {
          setBlocks((prev) => {
            const orderMap = new Map(data.blocks.map((b: any) => [b.id, b.order]));
            return [...prev].sort((a, b) => {
              const orderA = orderMap.has(a._id) ? (orderMap.get(a._id) as number) : a.order;
              const orderB = orderMap.has(b._id) ? (orderMap.get(b._id) as number) : b.order;
              return orderA - orderB;
            });
          });
        }
      };

      const handleRemotePageUpdated = (data: any) => {
        const currentUserId = user?.id || (user as any)?._id;
        if (data?.senderId && currentUserId && String(data.senderId) === String(currentUserId)) return;
        if (data?.page) {
          if (data.page.title !== undefined) setTitle(data.page.title);
          if (data.page.icon !== undefined) setIcon(data.page.icon);
          if (data.page.cover !== undefined) setCover(data.page.cover);
        }
      };

      socket.on('scratch:block-typing', handleRemoteBlockTyping);
      socket.on('scratch:title-typing', handleRemoteTitleTyping);
      socket.on('scratch:block-updated', handleRemoteBlockUpdate);
      socket.on('scratch:block-created', handleRemoteBlockCreated);
      socket.on('scratch:block-deleted', handleRemoteBlockDeleted);
      socket.on('scratch:blocks-reordered', handleRemoteBlocksReordered);
      socket.on('scratch:page-updated', handleRemotePageUpdated);

      return () => {
        socket.off('scratch:block-typing', handleRemoteBlockTyping);
        socket.off('scratch:title-typing', handleRemoteTitleTyping);
        socket.off('scratch:block-updated', handleRemoteBlockUpdate);
        socket.off('scratch:block-created', handleRemoteBlockCreated);
        socket.off('scratch:block-deleted', handleRemoteBlockDeleted);
        socket.off('scratch:blocks-reordered', handleRemoteBlocksReordered);
        socket.off('scratch:page-updated', handleRemotePageUpdated);
        socket.emit('scratch:leave', pageId);
      };
    }
  }, [socket, pageId, user]);

  // Debounced page title update
  const titleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleTitleChange = (val: string) => {
    setTitle(val);
    const currentUserId = user?.id || (user as any)?._id;
    if (socket && pageId && currentUserId) {
      socket.emit('scratch:title-typing', {
        pageId,
        title: val,
        senderId: currentUserId,
      });
    }
    if (titleTimeoutRef.current) clearTimeout(titleTimeoutRef.current);
    titleTimeoutRef.current = setTimeout(() => {
      if (pageId) {
        updatePage({ id: pageId, body: { title: val } });
      }
    }, 300);
  };

  // Icon change
  const handleIconSelect = (newIcon: string) => {
    setIcon(newIcon);
    if (pageId) {
      updatePage({ id: pageId, body: { icon: newIcon } });
    }
  };

  // Cover change
  const handleCoverSelect = (newCover: string) => {
    setCover(newCover);
    if (pageId) {
      updatePage({ id: pageId, body: { cover: newCover } });
    }
  };

  // Favorite toggle
  const handleToggleFavorite = async () => {
    const nextFav = !isFavorite;
    setIsFavorite(nextFav);
    try {
      await updatePage({ id: pageId, body: { isFavorite: nextFav } }).unwrap();
      toast.success(nextFav ? 'Added to favorites' : 'Removed from favorites');
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    }
  };

  // Copy page link
  const handleCopyLink = () => {
    const shareUrl = `${window.location.origin}/scratch/page/${pageId}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    toast.success('Page link copied to clipboard!');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Debounced block updates with instant socket typing emit
  const blockDebounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const handleUpdateBlockContent = useCallback(
    (blockId: string, content: string) => {
      setBlocks((prev) =>
        prev.map((b) => (b._id === blockId ? { ...b, content } : b))
      );

      const currentUserId = user?.id || (user as any)?._id;
      if (socket && pageId && currentUserId) {
        socket.emit('scratch:block-typing', {
          pageId,
          block: { _id: blockId, content },
          senderId: currentUserId,
        });
      }

      if (blockDebounceTimers.current[blockId]) {
        clearTimeout(blockDebounceTimers.current[blockId]);
      }

      blockDebounceTimers.current[blockId] = setTimeout(() => {
        updateBlock({ blockId, body: { content } });
      }, 300);
    },
    [updateBlock, socket, pageId, user]
  );

  const handleUpdateBlockProperties = useCallback(
    (blockId: string, properties: ScratchBlockProperties) => {
      setBlocks((prev) =>
        prev.map((b) => (b._id === blockId ? { ...b, properties } : b))
      );
      updateBlock({ blockId, body: { properties } });
    },
    [updateBlock]
  );

  const handleChangeBlockType = useCallback(
    (blockId: string, type: BlockType) => {
      setBlocks((prev) =>
        prev.map((b) => (b._id === blockId ? { ...b, type } : b))
      );
      updateBlock({ blockId, body: { type } });
    },
    [updateBlock]
  );

  const handleDeleteBlock = useCallback(
    async (blockId: string) => {
      if (blocks.length <= 1) {
        toast.info("A page must have at least one block.");
        return;
      }
      setBlocks((prev) => prev.filter((b) => b._id !== blockId));
      await deleteBlock(blockId).unwrap();
    },
    [blocks.length, deleteBlock]
  );

  const handleCreateBlockBelow = useCallback(
    async (afterBlockId: string, type: BlockType = 'paragraph') => {
      try {
        const res = await createBlock({
          pageId,
          body: { type, afterBlockId },
        }).unwrap();

        if (res.block) {
          const newBlock = res.block;
          setBlocks((prev) => {
            const idx = prev.findIndex((b) => b._id === afterBlockId);
            if (idx === -1) return [...prev, newBlock];
            const updated = [...prev];
            updated.splice(idx + 1, 0, newBlock);
            return updated;
          });
          setFocusedBlockId(newBlock._id);
        }
      } catch (err) {
        console.error('Failed to create block:', err);
      }
    },
    [createBlock, pageId]
  );

  const handleDuplicateBlock = useCallback(
    async (targetBlock: ScratchBlock) => {
      try {
        const res = await createBlock({
          pageId,
          body: {
            type: targetBlock.type,
            content: targetBlock.content,
            properties: targetBlock.properties,
            afterBlockId: targetBlock._id,
          },
        }).unwrap();
        if (res.block) {
          setBlocks((prev) => {
            const idx = prev.findIndex((b) => b._id === targetBlock._id);
            const updated = [...prev];
            updated.splice(idx + 1, 0, res.block);
            return updated;
          });
        }
      } catch (err) {
        console.error('Failed to duplicate block:', err);
      }
    },
    [createBlock, pageId]
  );

  const handleMoveBlock = useCallback(
    async (draggedId: string, targetId: string) => {
      setBlocks((prev) => {
        const draggedIdx = prev.findIndex((b) => b._id === draggedId);
        const targetIdx = prev.findIndex((b) => b._id === targetId);
        if (draggedIdx === -1 || targetIdx === -1) return prev;

        const updated = [...prev];
        const [removed] = updated.splice(draggedIdx, 1);
        updated.splice(targetIdx, 0, removed);

        // Sync reorder with backend API
        const payload = updated.map((b, idx) => ({ id: b._id, order: idx }));
        reorderBlocks({ pageId, blocks: payload }).catch((err) => {
          console.error('Failed to reorder blocks:', err);
        });

        return updated;
      });
    },
    [pageId, reorderBlocks]
  );

  const handleOpenMoveBlockDialog = useCallback((blockId: string) => {
    setMoveBlockId(blockId);
    setMoveDialogOpen(true);
  }, []);

  const handleConfirmMoveBlockToPage = async (targetPageId: string) => {
    if (!moveBlockId) return;
    try {
      // Re-assign pageId of target block
      await updateBlock({ blockId: moveBlockId, body: { pageId: targetPageId } }).unwrap();
      setBlocks((prev) => prev.filter((b) => b._id !== moveBlockId));
      setMoveDialogOpen(false);
      setMoveBlockId(null);
      toast.success('Block moved to target page');
    } catch (err) {
      console.error('Failed to move block to page:', err);
      toast.error('Failed to move block');
    }
  };

  const handleInsertFromLeftToolbar = useCallback(
    (type: BlockType) => {
      const targetId = focusedBlockId || (blocks.length > 0 ? blocks[blocks.length - 1]._id : undefined);
      if (targetId) {
        handleCreateBlockBelow(targetId, type);
      }
    },
    [focusedBlockId, blocks, handleCreateBlockBelow]
  );

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-background">
        <p className="text-sm text-muted-foreground animate-pulse">Loading document...</p>
      </div>
    );
  }

  if (isError || !page) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-background">
        <p className="text-sm text-destructive">Failed to load Scratch Page.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden relative text-foreground">
      {/* Notion Top Header Navigation Bar */}
      <div className="flex items-center justify-between px-8 py-2.5 border-b border-border bg-card/60 text-xs shrink-0 select-none sticky top-0 z-30 backdrop-blur-md">
        <div className="flex items-center gap-2 text-muted-foreground truncate">
          <span className="flex items-center gap-1 font-medium">
            {visibility === 'workspace' ? (
              <Globe className="h-3.5 w-3.5 text-primary" />
            ) : (
              <Lock className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            <span className="capitalize">{visibility}</span>
          </span>
          <span>/</span>
          <span className="font-semibold text-foreground truncate max-w-[220px]">
            {title || 'Untitled'}
          </span>
        </div>

        {/* Top Header Actions (Comments, Add Favs, Copy Link, Share) */}
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setActiveCommentBlockId(null);
              setShowCommentsDrawer(!showCommentsDrawer);
            }}
            className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer relative"
          >
            <MessageSquare className="h-3.5 w-3.5 mr-1.5 text-primary" />
            Comments
            {openCommentsCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.2 bg-primary text-primary-foreground text-[10px] font-bold rounded-full">
                {openCommentsCount}
              </span>
            )}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggleFavorite}
            className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <Star className={`h-3.5 w-3.5 mr-1.5 ${isFavorite ? 'fill-amber-400 text-amber-400' : ''}`} />
            {isFavorite ? 'Favorited' : 'Add Favs'}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopyLink}
            className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
          >
            {copiedLink ? <Check className="h-3.5 w-3.5 mr-1.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
            {copiedLink ? 'Copied!' : 'Copy Link'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShareDialogOpen(true)}
            className="h-8 px-3 text-xs font-semibold cursor-pointer border-border hover:bg-muted"
          >
            <Share2 className="h-3.5 w-3.5 mr-1.5 text-primary" />
            Share
          </Button>
        </div>
      </div>

      {/* Main Container + Side Comments Drawer */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Canva / Draw.io Style Fixed Left Toolbar */}
        <ScratchLeftToolbar onInsertBlock={handleInsertFromLeftToolbar} />

        <div className="flex-1 overflow-y-auto flex flex-col">
          {/* Cover Image / Gradient */}
          {cover && (
            <div className={`w-full h-36 relative ${cover} shrink-0 group/cover`}>
              <button
                onClick={() => handleCoverSelect('')}
                className="absolute top-3 right-3 bg-black/40 hover:bg-black/60 text-white text-xs px-2.5 py-1 rounded-md opacity-0 group-hover/cover:opacity-100 transition-opacity cursor-pointer"
              >
                Remove cover
              </button>
            </div>
          )}

          {/* Main Canvas */}
          <div className="max-w-3xl w-full mx-auto px-8 py-8 flex-1 flex flex-col">
            {/* Page Top Actions (Icon & Cover Controls) */}
            <div className="flex items-center gap-2 mb-4 group/header opacity-90 hover:opacity-100 transition-opacity">
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className="text-4xl hover:bg-muted p-1.5 rounded-xl transition-all cursor-pointer select-none border border-transparent hover:border-border"
                    title="Change Icon"
                  >
                    {icon}
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-64 p-3 bg-popover border-border">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Select Page Icon</p>
                  <div className="grid grid-cols-5 gap-2">
                    {EMOJI_OPTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => handleIconSelect(emoji)}
                        className="text-2xl p-2 rounded-lg hover:bg-muted transition-colors cursor-pointer text-center"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              {!cover && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground opacity-0 group-hover/header:opacity-100 transition-opacity">
                      <Image className="h-3.5 w-3.5 mr-1" />
                      Add Cover
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-72 p-3 bg-popover border-border">
                    <p className="text-xs font-semibold text-muted-foreground mb-2">Choose Gradient Cover</p>
                    <div className="grid grid-cols-2 gap-2">
                      {COVER_GRADIENTS.map((grad, i) => (
                        <button
                          key={i}
                          onClick={() => handleCoverSelect(grad)}
                          className={`h-12 rounded-lg ${grad} border border-white/20 hover:scale-105 transition-transform cursor-pointer`}
                        />
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </div>

            {/* Page Title Input */}
            <input
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Untitled"
              className="w-full text-3xl font-extrabold text-foreground placeholder:text-muted-foreground/40 bg-transparent border-none outline-none mb-6 tracking-tight"
            />

            {/* Block Stack */}
            <div className="space-y-0.5 flex-1 pb-24">
              {blocks.map((block, index) => (
                <BlockRenderer
                  key={block._id}
                  block={block}
                  blockIndex={index}
                  onUpdateContent={handleUpdateBlockContent}
                  onUpdateProperties={handleUpdateBlockProperties}
                  onChangeType={handleChangeBlockType}
                  onDeleteBlock={handleDeleteBlock}
                  onCreateBlockBelow={handleCreateBlockBelow}
                  onDuplicateBlock={handleDuplicateBlock}
                  onMoveBlock={handleMoveBlock}
                  onMoveToPage={handleOpenMoveBlockDialog}
                  onAddComment={(blockId) => {
                    setActiveCommentBlockId(blockId);
                    setShowCommentsDrawer(true);
                  }}
                  isFocused={focusedBlockId === block._id}
                  hasAnyFocusedBlock={Boolean(focusedBlockId)}
                  onFocus={() => setFocusedBlockId(block._id)}
                  commentCount={commentsByBlockId[block._id]}
                  isActiveCommentTarget={activeCommentBlockId === block._id}
                />
              ))}

              {/* Bottom Click Target to Add Block */}
              <div
                onClick={() => {
                  if (blocks.length > 0) {
                    handleCreateBlockBelow(blocks[blocks.length - 1]._id);
                  }
                }}
                className="h-24 w-full cursor-text hover:bg-muted/20 rounded-lg transition-colors flex items-center px-4 text-xs text-muted-foreground/40"
              >
                Click to add a block...
              </div>
            </div>
          </div>
        </div>

        {/* Comments Drawer Sidebar */}
        {showCommentsDrawer && (
          <ScratchCommentsDrawer
            pageId={pageId}
            blocks={blocks}
            activeBlockId={activeCommentBlockId}
            onSelectBlockId={(id) => setActiveCommentBlockId(id)}
            onClose={() => setShowCommentsDrawer(false)}
          />
        )}
      </div>

      {/* Share Page Dialog */}
      <ScratchShareDialog
        pageId={pageId}
        visibility={visibility}
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
      />

      {/* Move Block to Page Dialog */}
      <Dialog open={moveDialogOpen} onOpenChange={setMoveDialogOpen}>
        <DialogContent className="bg-card border-border text-card-foreground max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm font-bold">
              <FolderOutput className="h-4 w-4 text-primary" /> Move Block to Page
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground mb-2">
            Select a Scratch page in this workspace to move this block:
          </p>
          <div className="max-h-60 overflow-y-auto space-y-1 py-1">
            {workspacePages
              .filter((p) => p._id !== pageId)
              .map((p) => (
                <button
                  key={p._id}
                  onClick={() => handleConfirmMoveBlockToPage(p._id)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-xs font-medium hover:bg-muted transition-colors cursor-pointer"
                >
                  <span className="text-base">{p.icon || '📄'}</span>
                  <span className="truncate flex-1 font-semibold">{p.title || 'Untitled'}</span>
                  <span className="text-[10px] text-muted-foreground uppercase">{p.visibility || 'private'}</span>
                </button>
              ))}
            {workspacePages.filter((p) => p._id !== pageId).length === 0 && (
              <p className="text-xs text-muted-foreground italic px-2 py-3 text-center">
                No other pages in this workspace. Create another page first.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

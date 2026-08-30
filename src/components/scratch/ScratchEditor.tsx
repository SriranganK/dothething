import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  useGetScratchPageQuery,
  useGetScratchPagesQuery,
  useUpdateScratchPageMutation,
  useCreateScratchBlockMutation,
  useCreateScratchBlocksBatchMutation,
  useUpdateScratchBlockMutation,
  useDeleteScratchBlockMutation,
  useDeleteScratchBlocksBatchMutation,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScratchCommentsDrawer } from './ScratchCommentsDrawer';
import { ScratchShareDialog } from './ScratchShareDialog';
import { ScratchLeftToolbar } from './ScratchLeftToolbar';
import { useNotifications } from '@/components/NotificationProvider';
import { useAuth } from '@/context/AuthContext';
import { parseClipboardData, type ParsedScratchBlock } from './utils/pasteParser';
import { API_BASE_URL } from '@/config';
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
  Trash2,
  X,
  RefreshCw,
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
  const [createBlocksBatch] = useCreateScratchBlocksBatchMutation();
  const [updateBlock] = useUpdateScratchBlockMutation();
  const [deleteBlock] = useDeleteScratchBlockMutation();
  const [deleteBlocksBatch] = useDeleteScratchBlocksBatchMutation();
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
  const [selectedBlockIds, setSelectedBlockIds] = useState<Set<string>>(new Set());
  const [marqueeBox, setMarqueeBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const dragStateRef = useRef<{
    isDown: boolean;
    startX: number;
    startY: number;
    startBlockId: string | null;
    isDraggingBlocks: boolean;
  }>({
    isDown: false,
    startX: 0,
    startY: 0,
    startBlockId: null,
    isDraggingBlocks: false,
  });

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

      const handleRemoteBlocksBatchCreated = (data: any) => {
        const currentUserId = user?.id || (user as any)?._id;
        if (data?.senderId && currentUserId && String(data.senderId) === String(currentUserId)) return;
        if (data?.blocks && Array.isArray(data.blocks)) {
          setBlocks((prev) => {
            const next = [...prev];
            if (data.replacedBlockId) {
              const replaceIdx = next.findIndex((b) => b._id === data.replacedBlockId);
              if (replaceIdx !== -1) {
                next[replaceIdx] = data.blocks[0];
                const remaining = data.blocks.slice(1);
                next.splice(replaceIdx + 1, 0, ...remaining);
                return next;
              }
            }
            const existingIds = new Set(next.map((b) => b._id));
            const newItems = data.blocks.filter((b: any) => !existingIds.has(b._id));
            return [...next, ...newItems].sort((a, b) => a.order - b.order);
          });
        }
      };

      const handleRemoteBlocksBatchDeleted = (data: any) => {
        const currentUserId = user?.id || (user as any)?._id;
        if (data?.senderId && currentUserId && String(data.senderId) === String(currentUserId)) return;
        if (data?.blockIds && Array.isArray(data.blockIds)) {
          const deletedSet = new Set(data.blockIds);
          setBlocks((prev) => {
            const remaining = prev.filter((b) => !deletedSet.has(b._id));
            if (remaining.length === 0 && data.fallbackBlock) {
              return [data.fallbackBlock];
            }
            return remaining;
          });
        }
      };

      socket.on('scratch:block-typing', handleRemoteBlockTyping);
      socket.on('scratch:title-typing', handleRemoteTitleTyping);
      socket.on('scratch:block-updated', handleRemoteBlockUpdate);
      socket.on('scratch:block-created', handleRemoteBlockCreated);
      socket.on('scratch:blocks-batch-created', handleRemoteBlocksBatchCreated);
      socket.on('scratch:block-deleted', handleRemoteBlockDeleted);
      socket.on('scratch:blocks-batch-deleted', handleRemoteBlocksBatchDeleted);
      socket.on('scratch:blocks-reordered', handleRemoteBlocksReordered);
      socket.on('scratch:page-updated', handleRemotePageUpdated);

      return () => {
        socket.off('scratch:block-typing', handleRemoteBlockTyping);
        socket.off('scratch:title-typing', handleRemoteTitleTyping);
        socket.off('scratch:block-updated', handleRemoteBlockUpdate);
        socket.off('scratch:block-created', handleRemoteBlockCreated);
        socket.off('scratch:blocks-batch-created', handleRemoteBlocksBatchCreated);
        socket.off('scratch:block-deleted', handleRemoteBlockDeleted);
        socket.off('scratch:blocks-batch-deleted', handleRemoteBlocksBatchDeleted);
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
        workspaceId,
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
        setBlocks((prev) => prev.map((b) => ({ ...b, content: '', type: 'paragraph' })));
        updateBlock({ blockId, body: { content: '', type: 'paragraph' } });
        return;
      }
      setBlocks((prev) => prev.filter((b) => b._id !== blockId));
      await deleteBlock(blockId).unwrap();
    },
    [blocks.length, deleteBlock, updateBlock]
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

  const isPastingRef = useRef(false);
  const lastPasteTimeRef = useRef(0);

  const handlePasteBlocks = useCallback(
    async (parsedBlocks: ParsedScratchBlock[], targetBlockId?: string) => {
      if (!parsedBlocks || parsedBlocks.length === 0 || !pageId) return;

      // Prevent duplicate triggers if fired simultaneously
      if (isPastingRef.current || Date.now() - lastPasteTimeRef.current < 500) {
        return;
      }
      isPastingRef.current = true;
      lastPasteTimeRef.current = Date.now();

      const targetId = targetBlockId || focusedBlockId;
      const targetBlock = blocks.find((b) => b._id === targetId);

      const isTargetEmpty =
        targetBlock &&
        (!targetBlock.content ||
          targetBlock.content === '<br>' ||
          targetBlock.content === '<p></p>' ||
          targetBlock.content === '<p><br></p>');

      const replaceBlockId = isTargetEmpty ? targetBlock?._id : undefined;
      const afterBlockId = !isTargetEmpty && targetBlock
        ? targetBlock._id
        : !targetBlock && blocks.length > 0
        ? blocks[blocks.length - 1]._id
        : undefined;

      try {
        const res = await createBlocksBatch({
          pageId,
          body: {
            blocks: parsedBlocks,
            afterBlockId,
            replaceBlockId,
          },
        }).unwrap();

        if (res.blocks && res.blocks.length > 0) {
          setBlocks((prev) => {
            const next = [...prev];
            if (replaceBlockId) {
              const targetIdx = next.findIndex((b) => b._id === replaceBlockId);
              if (targetIdx !== -1) {
                next.splice(targetIdx, 1, ...res.blocks);
                return next;
              }
            } else if (afterBlockId) {
              const afterIdx = next.findIndex((b) => b._id === afterBlockId);
              if (afterIdx !== -1) {
                next.splice(afterIdx + 1, 0, ...res.blocks);
                return next;
              }
            }
            return [...next, ...res.blocks];
          });

          setFocusedBlockId(res.blocks[0]._id);
        }
      } catch (err) {
        console.error('Failed to batch create pasted blocks:', err);
      } finally {
        setTimeout(() => {
          isPastingRef.current = false;
        }, 400);
      }
    },
    [blocks, focusedBlockId, pageId, createBlocksBatch]
  );

  const handleContainerPaste = async (e: React.ClipboardEvent) => {
    if ((e as any)._handledPaste || (e.nativeEvent as any)._handledPaste) return;
    const activeEl = document.activeElement;
    if (
      activeEl &&
      (activeEl.tagName === 'INPUT' ||
        activeEl.tagName === 'TEXTAREA' ||
        activeEl.getAttribute('contenteditable') === 'true')
    ) {
      return;
    }
    (e as any)._handledPaste = true;
    (e.nativeEvent as any)._handledPaste = true;
    const parsed = await parseClipboardData(e.clipboardData, API_BASE_URL);
    if (parsed && parsed.length > 0) {
      e.preventDefault();
      e.stopPropagation();
      handlePasteBlocks(parsed, focusedBlockId || undefined);
    }
  };

  // Notion-style Drag / Marquee Selection across blocks
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        !target ||
        target.closest('button') ||
        target.closest('.fixed.bottom-8') ||
        target.closest('[role="dialog"]') ||
        target.closest('[role="menu"]') ||
        target.closest('input[type="text"]')
      ) {
        return;
      }

      const blockEl = target.closest('[data-block-id]');
      const blockId = blockEl?.getAttribute('data-block-id') || null;

      // If user clicks on canvas outside any block without modifier keys, clear selection
      if (!blockEl && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        setSelectedBlockIds((prev) => (prev.size > 0 ? new Set() : prev));
      }

      dragStateRef.current = {
        isDown: true,
        startX: e.clientX,
        startY: e.clientY,
        startBlockId: blockId,
        isDraggingBlocks: false,
      };
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStateRef.current.isDown) return;

      const dx = e.clientX - dragStateRef.current.startX;
      const dy = e.clientY - dragStateRef.current.startY;
      const dist = Math.hypot(dx, dy);

      if (dist < 8) return;

      const elUnder = document.elementFromPoint(e.clientX, e.clientY);
      const currentBlockEl = elUnder?.closest('[data-block-id]');
      const currentBlockId = currentBlockEl?.getAttribute('data-block-id') || null;

      const { startBlockId, startX, startY } = dragStateRef.current;

      const isCrossBlock = Boolean(startBlockId && currentBlockId && startBlockId !== currentBlockId);
      const isGutterDrag = !startBlockId && dist > 12;

      if (isCrossBlock || isGutterDrag || dragStateRef.current.isDraggingBlocks) {
        dragStateRef.current.isDraggingBlocks = true;

        // Release the trapped contenteditable browser text selection
        window.getSelection()?.removeAllRanges();
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }

        // Calculate and render Notion marquee selection box
        const minX = Math.min(startX, e.clientX);
        const minY = Math.min(startY, e.clientY);
        const w = Math.abs(dx);
        const h = Math.abs(dy);
        setMarqueeBox({ x: minX, y: minY, w, h });

        if (startBlockId && currentBlockId) {
          const idx1 = blocks.findIndex((b) => b._id === startBlockId);
          const idx2 = blocks.findIndex((b) => b._id === currentBlockId);
          if (idx1 !== -1 && idx2 !== -1) {
            const min = Math.min(idx1, idx2);
            const max = Math.max(idx1, idx2);
            const ids = new Set(blocks.slice(min, max + 1).map((b) => b._id));
            setSelectedBlockIds(ids);
          }
        } else {
          // Gutter/margin marquee rectangle intersection
          const marqueeRect = { left: minX, top: minY, right: minX + w, bottom: minY + h };
          const ids = new Set<string>();
          blocks.forEach((b) => {
            const el = document.getElementById(b._id) || document.querySelector(`[data-block-id="${b._id}"]`);
            if (el) {
              const rect = el.getBoundingClientRect();
              const intersects = !(
                rect.right < marqueeRect.left ||
                rect.left > marqueeRect.right ||
                rect.bottom < marqueeRect.top ||
                rect.top > marqueeRect.bottom
              );
              if (intersects) {
                ids.add(b._id);
              }
            }
          });
          if (ids.size > 0) {
            setSelectedBlockIds(ids);
          }
        }
      }
    };

    const handleMouseUp = () => {
      if (dragStateRef.current.isDraggingBlocks) {
        setMarqueeBox(null);
      }
      dragStateRef.current.isDown = false;
      dragStateRef.current.isDraggingBlocks = false;
    };

    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [blocks]);

  // Click on block drag handle / Shift+Click / Ctrl+Click
  const handleSelectBlock = useCallback(
    (blockId: string, e: React.MouseEvent) => {
      if (e.shiftKey && focusedBlockId && focusedBlockId !== blockId) {
        const idx1 = blocks.findIndex((b) => b._id === focusedBlockId);
        const idx2 = blocks.findIndex((b) => b._id === blockId);
        if (idx1 !== -1 && idx2 !== -1) {
          const start = Math.min(idx1, idx2);
          const end = Math.max(idx1, idx2);
          const ids = new Set<string>();
          for (let i = start; i <= end; i++) {
            ids.add(blocks[i]._id);
          }
          setSelectedBlockIds(ids);
          return;
        }
      }

      if (e.ctrlKey || e.metaKey) {
        setSelectedBlockIds((prev) => {
          const next = new Set(prev);
          if (next.has(blockId)) next.delete(blockId);
          else next.add(blockId);
          return next;
        });
        return;
      }

      setSelectedBlockIds((prev) => {
        if (prev.has(blockId) && prev.size === 1) {
          return new Set();
        }
        return new Set([blockId]);
      });
      setFocusedBlockId(blockId);
    },
    [blocks, focusedBlockId]
  );

  // Batch delete selected blocks
  const handleDeleteSelectedBlocks = useCallback(async () => {
    if (selectedBlockIds.size === 0) return;
    const idsToDelete = Array.from(selectedBlockIds);
    const count = idsToDelete.length;

    // Optimistic UI update
    setBlocks((prev) => {
      const remaining = prev.filter((b) => !selectedBlockIds.has(b._id));
      if (remaining.length === 0) {
        return [
          {
            _id: `temp-${Date.now()}`,
            pageId,
            workspace: workspaceId,
            type: 'paragraph',
            content: '',
            properties: {},
            order: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ];
      }
      return remaining;
    });

    setSelectedBlockIds(new Set());
    window.getSelection()?.removeAllRanges();

    try {
      await deleteBlocksBatch({ pageId, blockIds: idsToDelete }).unwrap();
    } catch (err) {
      console.error('Failed to delete selected blocks:', err);
    }
  }, [selectedBlockIds, pageId, workspaceId, deleteBlocksBatch]);

  // Batch duplicate selected blocks
  const handleDuplicateSelectedBlocks = useCallback(async () => {
    if (selectedBlockIds.size === 0) return;
    const selected = blocks.filter((b) => selectedBlockIds.has(b._id));
    if (selected.length === 0) return;

    const lastSelected = selected[selected.length - 1];
    const parsed = selected.map((b) => ({
      type: b.type,
      content: b.content,
      properties: b.properties,
    }));

    setSelectedBlockIds(new Set());
    await handlePasteBlocks(parsed, lastSelected._id);
  }, [selectedBlockIds, blocks, handlePasteBlocks]);

  // Batch change type of selected blocks
  const handleBatchChangeType = useCallback(
    async (newType: BlockType) => {
      if (selectedBlockIds.size === 0) return;
      const ids = Array.from(selectedBlockIds);

      setBlocks((prev) =>
        prev.map((b) => (selectedBlockIds.has(b._id) ? { ...b, type: newType } : b))
      );

      for (const id of ids) {
        updateBlock({ blockId: id, body: { type: newType } });
      }
    },
    [selectedBlockIds, updateBlock]
  );

  // Keyboard shortcut listener for Delete / Backspace / Escape / Character replace
  // Keyboard shortcut listener for Delete / Backspace / Escape / Shift+Arrows / Character replace
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Shift + ArrowDown: expand block selection downward (Notion keyboard multi-select)
      if (e.shiftKey && e.key === 'ArrowDown') {
        const currentTargetId = focusedBlockId || (selectedBlockIds.size > 0 ? Array.from(selectedBlockIds)[selectedBlockIds.size - 1] : blocks[0]?._id);
        const idx = blocks.findIndex((b) => b._id === currentTargetId);
        if (idx !== -1 && idx < blocks.length - 1) {
          e.preventDefault();
          const nextBlock = blocks[idx + 1];
          setSelectedBlockIds((prev) => {
            const next = new Set(prev);
            if (currentTargetId) next.add(currentTargetId);
            next.add(nextBlock._id);
            return next;
          });
          setFocusedBlockId(nextBlock._id);
          window.getSelection()?.removeAllRanges();
          if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
        }
        return;
      }

      // Shift + ArrowUp: expand block selection upward (Notion keyboard multi-select)
      if (e.shiftKey && e.key === 'ArrowUp') {
        const currentTargetId = focusedBlockId || (selectedBlockIds.size > 0 ? Array.from(selectedBlockIds)[0] : blocks[blocks.length - 1]?._id);
        const idx = blocks.findIndex((b) => b._id === currentTargetId);
        if (idx > 0) {
          e.preventDefault();
          const prevBlock = blocks[idx - 1];
          setSelectedBlockIds((prev) => {
            const next = new Set(prev);
            if (currentTargetId) next.add(currentTargetId);
            next.add(prevBlock._id);
            return next;
          });
          setFocusedBlockId(prevBlock._id);
          window.getSelection()?.removeAllRanges();
          if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
        }
        return;
      }

      if (selectedBlockIds.size === 0) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        setSelectedBlockIds(new Set());
        window.getSelection()?.removeAllRanges();
        return;
      }

      if (selectedBlockIds.size > 1 && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && !e.shiftKey) {
        setSelectedBlockIds(new Set());
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        const activeEl = document.activeElement;
        const isTyping =
          activeEl &&
          (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');

        if (!isTyping || selectedBlockIds.size > 1) {
          e.preventDefault();
          handleDeleteSelectedBlocks();
        }
        return;
      }

      // Typing a printable character over multiple selected blocks replaces them (Notion behavior)
      if (
        selectedBlockIds.size > 1 &&
        e.key.length === 1 &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey
      ) {
        e.preventDefault();
        const firstSelectedIdx = blocks.findIndex((b) => selectedBlockIds.has(b._id));
        const afterId = firstSelectedIdx > 0 ? blocks[firstSelectedIdx - 1]._id : undefined;
        handleDeleteSelectedBlocks();
        handlePasteBlocks([{ type: 'paragraph', content: e.key }], afterId);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedBlockIds, focusedBlockId, blocks, handleDeleteSelectedBlocks, handlePasteBlocks]);

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

        <div
          className="flex-1 overflow-y-auto flex flex-col"
          onPaste={handleContainerPaste}
        >
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
                  onPasteBlocks={handlePasteBlocks}
                  isSelected={selectedBlockIds.has(block._id)}
                  onSelectBlock={handleSelectBlock}
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
                  setSelectedBlockIds(new Set());
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

      {/* Notion Marquee Selection Rectangle */}
      {marqueeBox && (
        <div
          className="fixed pointer-events-none z-[200] bg-primary/15 border border-primary/40 rounded-sm"
          style={{
            left: `${marqueeBox.x}px`,
            top: `${marqueeBox.y}px`,
            width: `${marqueeBox.w}px`,
            height: `${marqueeBox.h}px`,
          }}
        />
      )}

      {/* Floating Multi-Block Selection Action Bar */}
      {selectedBlockIds.size > 1 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 bg-card/95 dark:bg-zinc-900/95 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-2xl shadow-2xl shadow-black/20 px-4 py-2 text-xs animate-in slide-in-from-bottom-5 duration-200">
          <div className="flex items-center gap-2 font-semibold text-foreground border-r border-border pr-3">
            <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold">
              {selectedBlockIds.size}
            </span>
            <span>blocks selected</span>
          </div>

          <button
            onClick={handleDeleteSelectedBlocks}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground font-medium transition-colors cursor-pointer"
            title="Delete selected blocks (Del or Backspace)"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Delete</span>
            <kbd className="ml-1 text-[10px] opacity-70 bg-black/10 dark:bg-white/10 px-1 py-0.5 rounded">Del</kbd>
          </button>

          <button
            onClick={handleDuplicateSelectedBlocks}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-muted text-foreground transition-colors cursor-pointer"
            title="Duplicate selected blocks"
          >
            <Copy className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Duplicate</span>
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-muted text-foreground transition-colors cursor-pointer">
                <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Turn into...</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-44 bg-popover border-border">
              <DropdownMenuItem onClick={() => handleBatchChangeType('paragraph')}>Text</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleBatchChangeType('bulletList')}>Bulleted List</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleBatchChangeType('numberedList')}>Numbered List</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleBatchChangeType('todo')}>Todo List</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleBatchChangeType('quote')}>Quote</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleBatchChangeType('code')}>Code Block</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <button
            onClick={() => {
              setSelectedBlockIds(new Set());
              window.getSelection()?.removeAllRanges();
            }}
            className="p-1 text-muted-foreground hover:text-foreground rounded-lg transition-colors cursor-pointer ml-1"
            title="Deselect (Esc)"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

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

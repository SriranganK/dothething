import React, { useState, useMemo } from 'react';
import {
  useGetScratchPagesQuery,
  useCreateScratchPageMutation,
  useUpdateScratchPageMutation,
  useDeleteScratchPageMutation,
  useDuplicateScratchPageMutation,
} from '@/store/services/api';
import type { ScratchPage } from '@/types/scratch';
import type { WorkspaceType } from '@/types/workspace';
import { useAuth } from '@/context/AuthContext';
import {
  Plus,
  Search,
  ChevronRight,
  ChevronDown,
  MoreVertical,
  Star,
  Trash2,
  Copy,
  Edit3,
  FilePlus,
  FileText,
  Lock,
  Globe,
  Users,
  Folder,
  Check,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface ScratchPageSidebarProps {
  workspaceId: string;
  currentWorkspace?: WorkspaceType | null;
  workspaces?: WorkspaceType[];
  activePageId?: string;
  onSelectPage: (pageId: string) => void;
  onSwitchWorkspace?: (ws: WorkspaceType) => void;
  onCreateWorkspace?: () => void;
}

export const ScratchPageSidebar: React.FC<ScratchPageSidebarProps> = ({
  workspaceId,
  currentWorkspace,
  workspaces = [],
  activePageId,
  onSelectPage,
  onSwitchWorkspace,
  onCreateWorkspace,
}) => {
  const { user } = useAuth();
  const { data, isLoading } = useGetScratchPagesQuery(workspaceId, { skip: !workspaceId });
  const [createPage] = useCreateScratchPageMutation();
  const [updatePage] = useUpdateScratchPageMutation();
  const [deletePage] = useDeleteScratchPageMutation();
  const [duplicatePage] = useDuplicateScratchPageMutation();

  const pages = data?.pages || [];

  const [search, setSearch] = useState('');
  const [expandedPageIds, setExpandedPageIds] = useState<Record<string, boolean>>({});
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [targetPageToRename, setTargetPageToRename] = useState<ScratchPage | null>(null);
  const [newTitle, setNewTitle] = useState('');

  // Group pages by visibility & parentPageId
  const { favoritePages, privateRootPages, workspaceRootPages, sharedRootPages, childPagesMap } = useMemo(() => {
    const favs: ScratchPage[] = [];
    const privates: ScratchPage[] = [];
    const workspaces: ScratchPage[] = [];
    const shared: ScratchPage[] = [];
    const childMap: Record<string, ScratchPage[]> = {};

    const currentUserId = user?.id || (user as any)?._id;

    pages.forEach((p) => {
      if (p.isFavorite) favs.push(p);

      if (p.parentPageId) {
        if (!childMap[p.parentPageId]) childMap[p.parentPageId] = [];
        childMap[p.parentPageId].push(p);
      } else {
        const vis = p.visibility || 'private';
        const pageCreatorId = typeof p.createdBy === 'object' ? (p.createdBy as any)?._id : p.createdBy;
        const isCreatedByMe = currentUserId && String(pageCreatorId) === String(currentUserId);

        if (vis === 'workspace' || vis === 'public') {
          workspaces.push(p);
        } else if (!isCreatedByMe || vis === 'shared') {
          shared.push(p);
        } else {
          privates.push(p);
        }
      }
    });

    return {
      favoritePages: favs,
      privateRootPages: privates,
      workspaceRootPages: workspaces,
      sharedRootPages: shared,
      childPagesMap: childMap,
    };
  }, [pages, user]);


  const filteredPages = useMemo(() => {
    if (!search.trim()) return null;
    return pages.filter((p) => p.title.toLowerCase().includes(search.toLowerCase()));
  }, [pages, search]);

  const toggleExpand = (pageId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedPageIds((prev) => ({ ...prev, [pageId]: !prev[pageId] }));
  };

  const handleCreateNewPage = async (parentPageId?: string | null, visibility: 'private' | 'workspace' = 'private') => {
    try {
      const res = await createPage({
        workspaceId,
        title: 'Untitled',
        parentPageId: parentPageId || null,
        visibility,
      }).unwrap();

      if (res.page) {
        if (parentPageId) {
          setExpandedPageIds((prev) => ({ ...prev, [parentPageId]: true }));
        }
        onSelectPage(res.page._id);
        toast.success('Page created');
      }
    } catch (err) {
      console.error('Failed to create page:', err);
      toast.error('Failed to create page');
    }
  };

  const handleToggleFavorite = async (page: ScratchPage, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await updatePage({ id: page._id, body: { isFavorite: !page.isFavorite } }).unwrap();
      toast.success(page.isFavorite ? 'Removed from favorites' : 'Added to favorites');
    } catch (err) {
      console.error('Failed to update favorite:', err);
    }
  };

  const handleChangeVisibility = async (page: ScratchPage, visibility: 'private' | 'workspace' | 'shared') => {
    try {
      await updatePage({ id: page._id, body: { visibility } }).unwrap();
      toast.success(`Moved to ${visibility}`);
    } catch (err) {
      console.error('Failed to update visibility:', err);
    }
  };

  const handleOpenRename = (page: ScratchPage) => {
    setTargetPageToRename(page);
    setNewTitle(page.title);
    setRenameDialogOpen(true);
  };

  const handleSaveRename = async () => {
    if (!targetPageToRename) return;
    try {
      await updatePage({ id: targetPageToRename._id, body: { title: newTitle } }).unwrap();
      setRenameDialogOpen(false);
      setTargetPageToRename(null);
    } catch (err) {
      console.error('Failed to rename page:', err);
    }
  };

  const handleDelete = async (pageId: string) => {
    try {
      const res = await deletePage(pageId).unwrap();
      if (res.deletedPageIds?.includes(activePageId || '')) {
        const remaining = pages.filter((p) => !res.deletedPageIds.includes(p._id));
        if (remaining.length > 0) {
          onSelectPage(remaining[0]._id);
        }
      }
      toast.success('Page deleted');
    } catch (err) {
      console.error('Failed to delete page:', err);
      toast.error('Failed to delete page');
    }
  };

  const handleDuplicate = async (pageId: string) => {
    try {
      const res = await duplicatePage(pageId).unwrap();
      if (res.page) {
        onSelectPage(res.page._id);
        toast.success('Page duplicated');
      }
    } catch (err) {
      console.error('Failed to duplicate page:', err);
    }
  };

  const handleMovePageParent = async (pageId: string, newParentPageId: string | null) => {
    try {
      await updatePage({ id: pageId, body: { parentPageId: newParentPageId } }).unwrap();
      if (newParentPageId) {
        setExpandedPageIds((prev) => ({ ...prev, [newParentPageId]: true }));
      }
      toast.success('Page moved');
    } catch (err) {
      console.error('Failed to move page:', err);
      toast.error('Failed to move page');
    }
  };

  const renderPageItem = (page: ScratchPage, level = 0) => {
    const hasChildren = childPagesMap[page._id] && childPagesMap[page._id].length > 0;
    const isExpanded = expandedPageIds[page._id];
    const isActive = activePageId === page._id;

    return (
      <div key={page._id} className="space-y-0.5">
        <div
          onClick={() => onSelectPage(page._id)}
          style={{ paddingLeft: `${10 + level * 14}px` }}
          className={`group flex items-center justify-between py-1.5 pr-2 rounded-lg text-xs font-medium transition-all cursor-pointer select-none ${
            isActive
              ? 'bg-primary/10 text-primary font-semibold'
              : 'text-foreground/90 hover:bg-muted hover:text-foreground'
          }`}
        >
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            {hasChildren ? (
              <button
                onClick={(e) => toggleExpand(page._id, e)}
                className="p-0.5 hover:bg-muted-foreground/20 rounded text-muted-foreground transition-colors shrink-0"
              >
                {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              </button>
            ) : (
              <span className="w-3.5 shrink-0" />
            )}

            <span className="text-sm shrink-0">{page.icon || '📄'}</span>
            <span className="truncate">{page.title || 'Untitled'}</span>
          </div>

          {/* Context Actions Dropdown */}
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCreateNewPage(page._id, page.visibility as any);
              }}
              className="p-1 hover:bg-muted-foreground/20 rounded text-muted-foreground hover:text-foreground shrink-0"
              title="Add subpage"
            >
              <Plus className="h-3 w-3" />
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  onClick={(e) => e.stopPropagation()}
                  className="p-1 hover:bg-muted-foreground/20 rounded text-muted-foreground hover:text-foreground shrink-0"
                >
                  <MoreVertical className="h-3 w-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-popover border-border">
                <DropdownMenuItem onClick={() => handleOpenRename(page)} className="cursor-pointer">
                  <Edit3 className="h-3.5 w-3.5 mr-2" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDuplicate(page._id)} className="cursor-pointer">
                  <Copy className="h-3.5 w-3.5 mr-2" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => handleToggleFavorite(page, e)} className="cursor-pointer">
                  <Star className={`h-3.5 w-3.5 mr-2 ${page.isFavorite ? 'fill-amber-400 text-amber-400' : ''}`} />
                  {page.isFavorite ? 'Unfavorite' : 'Favorite'}
                </DropdownMenuItem>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="cursor-pointer">
                    <Folder className="h-3.5 w-3.5 mr-2 text-primary" />
                    Move to...
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="w-48 bg-popover border-border max-h-56 overflow-y-auto">
                    <DropdownMenuItem
                      onClick={() => handleMovePageParent(page._id, null)}
                      className="cursor-pointer font-medium"
                    >
                      Top Level (Root)
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {pages
                      .filter((p) => p._id !== page._id && p.parentPageId !== page._id)
                      .map((p) => (
                        <DropdownMenuItem
                          key={p._id}
                          onClick={() => handleMovePageParent(page._id, p._id)}
                          className="cursor-pointer"
                        >
                          <span className="mr-1.5">{p.icon || '📄'}</span>
                          <span className="truncate">{p.title || 'Untitled'}</span>
                        </DropdownMenuItem>
                      ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="cursor-pointer">
                    {page.visibility === 'workspace' ? (
                      <Globe className="h-3.5 w-3.5 mr-2 text-primary" />
                    ) : (
                      <Lock className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                    )}
                    Visibility
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="w-40 bg-popover border-border">
                    <DropdownMenuItem onClick={() => handleChangeVisibility(page, 'private')} className="cursor-pointer">
                      <Lock className="h-3.5 w-3.5 mr-2" />
                      Private
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleChangeVisibility(page, 'workspace')} className="cursor-pointer">
                      <Globe className="h-3.5 w-3.5 mr-2" />
                      Workspace
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuItem onClick={() => handleCreateNewPage(page._id, page.visibility as any)} className="cursor-pointer">
                  <FilePlus className="h-3.5 w-3.5 mr-2" />
                  Add Subpage
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleDelete(page._id)} className="text-destructive hover:bg-destructive/10 cursor-pointer">
                  <Trash2 className="h-3.5 w-3.5 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Render Children Recursively */}
        {hasChildren && isExpanded && (
          <div className="space-y-0.5">
            {childPagesMap[page._id].map((child) => renderPageItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-64 bg-card border-r border-border flex flex-col h-full shrink-0 select-none text-foreground">
      {/* Sidebar Top Header: Jira-style Workspace Selector Dropdown */}
      <div className="p-3 border-b border-border flex items-center justify-between gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 flex-1 min-w-0 p-1.5 hover:bg-muted/80 rounded-xl transition-all cursor-pointer text-left border border-transparent hover:border-border group focus:outline-none">
              <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center text-xs font-bold text-white uppercase shrink-0 shadow-xs">
                {currentWorkspace?.name
                  ? currentWorkspace.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
                  : "WS"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <h2 className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
                    {currentWorkspace?.name || "Workspace"}
                  </h2>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground shrink-0 transition-transform duration-200" />
                </div>
                <p className="text-[10px] text-muted-foreground truncate">
                  Scratch Board
                </p>
              </div>
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="start" className="w-60 bg-popover border-border text-popover-foreground shadow-xl p-1 z-50">
            <DropdownMenuLabel className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-2 py-1.5">
              Workspaces
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-border" />

            <div className="max-h-60 overflow-y-auto space-y-0.5 py-1">
              {workspaces && workspaces.length > 0 ? (
                workspaces.map((ws) => {
                  const isSelected = ws._id === (currentWorkspace?._id || workspaceId);
                  const wsInitials = ws.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
                  return (
                    <DropdownMenuItem
                      key={ws._id}
                      onClick={() => onSwitchWorkspace && onSwitchWorkspace(ws)}
                      className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-primary/10 text-primary font-medium"
                          : "hover:bg-muted text-foreground"
                      }`}
                    >
                      <div className="w-6 h-6 bg-primary/20 text-primary rounded-md flex items-center justify-center text-[10px] font-extrabold uppercase shrink-0">
                        {wsInitials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs truncate font-medium">{ws.name}</p>
                        {ws.type && <p className="text-[10px] text-muted-foreground truncate">{ws.type}</p>}
                      </div>
                      {isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0 ml-auto" />}
                    </DropdownMenuItem>
                  );
                })
              ) : (
                <div className="px-3 py-2 text-xs text-muted-foreground italic">No workspaces available</div>
              )}
            </div>

            {onCreateWorkspace && (
              <>
                <DropdownMenuSeparator className="bg-border" />
                <DropdownMenuItem
                  onClick={onCreateWorkspace}
                  className="flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer hover:bg-primary/10 text-primary font-medium text-xs transition-colors"
                >
                  <div className="w-6 h-6 rounded-md border border-dashed border-primary flex items-center justify-center shrink-0">
                    <Plus className="h-3.5 w-3.5" />
                  </div>
                  <span>Create Workspace</span>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <button
          onClick={() => handleCreateNewPage(null, 'private')}
          className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors cursor-pointer shrink-0 border border-transparent hover:border-border"
          title="Create New Page"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Filter / Search Input */}
      <div className="p-2.5">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search pages..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-2.5 py-1 text-xs border border-border rounded-lg bg-muted/30 focus:outline-none focus:border-primary focus:bg-background transition-colors text-foreground"
          />
        </div>
      </div>

      {/* Pages List Container */}
      <div className="flex-1 overflow-y-auto p-2 space-y-4">
        {isLoading ? (
          <p className="text-xs text-muted-foreground italic px-3 py-2 animate-pulse">Loading pages...</p>
        ) : filteredPages ? (
          <div className="space-y-0.5">
            <p className="text-[10px] font-bold uppercase text-muted-foreground px-3 mb-1">Search Results</p>
            {filteredPages.length === 0 ? (
              <p className="text-xs text-muted-foreground italic px-3 py-1">No matching pages</p>
            ) : (
              filteredPages.map((p) => renderPageItem(p, 0))
            )}
          </div>
        ) : (
          <>
            {/* Favorites Section */}
            {favoritePages.length > 0 && (
              <div className="space-y-0.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-3 mb-1 flex items-center gap-1">
                  <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                  Favorites
                </p>
                {favoritePages.map((p) => renderPageItem(p, 0))}
              </div>
            )}

            {/* Private Section */}
            <div className="space-y-0.5">
              <div className="flex items-center justify-between px-3 mb-1 group/sec">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Lock className="h-3 w-3 text-muted-foreground" />
                  Private
                </p>
                <button
                  onClick={() => handleCreateNewPage(null, 'private')}
                  className="text-muted-foreground hover:text-foreground opacity-0 group-hover/sec:opacity-100 transition-opacity p-0.5"
                  title="Add private page"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
              {privateRootPages.length === 0 ? (
                <div className="text-xs text-muted-foreground italic px-3 py-1">
                  No private pages
                </div>
              ) : (
                privateRootPages.map((p) => renderPageItem(p, 0))
              )}
            </div>

            {/* Workspace Shared Section */}
            <div className="space-y-0.5">
              <div className="flex items-center justify-between px-3 mb-1 group/sec">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Globe className="h-3 w-3 text-primary" />
                  Workspace Shared
                </p>
                <button
                  onClick={() => handleCreateNewPage(null, 'workspace')}
                  className="text-muted-foreground hover:text-foreground opacity-0 group-hover/sec:opacity-100 transition-opacity p-0.5"
                  title="Add workspace page"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
              {workspaceRootPages.length === 0 ? (
                <div className="text-xs text-muted-foreground italic px-3 py-1">
                  No workspace pages
                </div>
              ) : (
                workspaceRootPages.map((p) => renderPageItem(p, 0))
              )}
            </div>

            {/* Shared With Me Section */}
            {sharedRootPages.length > 0 && (
              <div className="space-y-0.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-3 mb-1 flex items-center gap-1">
                  <Users className="h-3 w-3 text-blue-400" />
                  Shared With Me
                </p>
                {sharedRootPages.map((p) => renderPageItem(p, 0))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent className="bg-card border-border text-card-foreground">
          <DialogHeader>
            <DialogTitle>Rename Page</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Page title..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveRename();
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveRename}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

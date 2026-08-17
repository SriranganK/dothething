import React, { useState, useEffect } from 'react';
import { ScratchPageSidebar } from './ScratchPageSidebar';
import { ScratchEditor } from './ScratchEditor';
import { useGetScratchPagesQuery, useCreateScratchPageMutation, useCreateScratchBlockMutation } from '@/store/services/api';
import type { WorkspaceType } from '@/types/workspace';
import { Button } from '@/components/ui/button';
import { Plus, StickyNote, CheckSquare, ListTodo, Kanban, Users, Lightbulb } from 'lucide-react';
import { toast } from 'sonner';

interface ScratchBoardViewProps {
  workspace: WorkspaceType | null;
  initialPageId?: string;
}

export const ScratchBoardView: React.FC<ScratchBoardViewProps> = ({
  workspace,
  initialPageId,
}) => {
  const workspaceId = workspace?._id || '';

  const { data } = useGetScratchPagesQuery(workspaceId, { skip: !workspaceId });
  const [createPage] = useCreateScratchPageMutation();
  const [createBlock] = useCreateScratchBlockMutation();

  const pages = data?.pages || [];

  const [activePageId, setActivePageId] = useState<string | undefined>(initialPageId);

  // Sync active page ID if current selection is invalid or empty
  useEffect(() => {
    if (initialPageId) {
      setActivePageId(initialPageId);
    } else if (pages.length > 0 && !activePageId) {
      setActivePageId(pages[0]._id);
    }
  }, [initialPageId, pages, activePageId]);

  const handleCreatePageWithTemplate = async (title: string, icon: string, starterBlocks: { type: string; content: string; properties?: any }[]) => {
    if (!workspaceId) return;
    try {
      const res = await createPage({
        workspaceId,
        title,
        icon,
      }).unwrap();

      if (res.page) {
        // Populate template blocks
        for (let i = 0; i < starterBlocks.length; i++) {
          await createBlock({
            pageId: res.page._id,
            body: starterBlocks[i],
          });
        }
        setActivePageId(res.page._id);
        toast.success(`Created "${title}" from template`);
      }
    } catch (err) {
      console.error('Failed to create template page:', err);
      toast.error('Failed to create template page');
    }
  };

  const handleCreateBlankPage = async () => {
    if (!workspaceId) return;
    try {
      const res = await createPage({
        workspaceId,
        title: 'Untitled',
        icon: '📄',
      }).unwrap();
      if (res.page) {
        setActivePageId(res.page._id);
        toast.success('New Scratch page created');
      }
    } catch (err) {
      console.error('Failed to create page:', err);
    }
  };

  const templates = [
    {
      title: 'Todo List',
      icon: '☑️',
      lucideIcon: CheckSquare,
      description: 'Quick checklist for immediate tasks and launch items.',
      blocks: [
        { type: 'heading1', content: 'Launch Preparation' },
        { type: 'paragraph', content: 'Capture todos below before turning them into official board tasks.' },
        { type: 'todo', content: 'Finalize product design' },
        { type: 'todo', content: 'Create landing page' },
        { type: 'todo', content: 'Configure custom domain' },
        { type: 'todo', content: 'Setup analytics' },
      ],
    },
    {
      title: 'Project Plan',
      icon: '📋',
      lucideIcon: ListTodo,
      description: 'Outline goals, roadmap milestones, and technical architecture.',
      blocks: [
        { type: 'heading1', content: 'Project Blueprint' },
        { type: 'quote', content: 'Clear goals lead to executed results.' },
        { type: 'heading2', content: '1. Executive Summary' },
        { type: 'paragraph', content: 'Write down high level context and objectives here...' },
        { type: 'heading2', content: '2. Key Deliverables' },
        { type: 'bulletList', content: 'Frontend User Interface' },
        { type: 'bulletList', content: 'Backend API & Database Schema' },
        { type: 'bulletList', content: 'Automated CI/CD Pipeline' },
      ],
    },
    {
      title: 'Meeting Notes',
      icon: '📝',
      lucideIcon: Users,
      description: 'Record discussion points, attendees, and action items.',
      blocks: [
        { type: 'heading1', content: 'Team Sync Notes' },
        { type: 'paragraph', content: 'Date: ' + new Date().toLocaleDateString() },
        { type: 'heading2', content: 'Attendees' },
        { type: 'bulletList', content: 'Srirangan' },
        { type: 'bulletList', content: 'Alex' },
        { type: 'heading2', content: 'Action Items' },
        { type: 'todo', content: 'Review pull request' },
        { type: 'todo', content: 'Schedule follow-up demo' },
      ],
    },
    {
      title: 'Brainstorm',
      icon: '💡',
      lucideIcon: Lightbulb,
      description: 'Unstructured workspace for early feature ideas.',
      blocks: [
        { type: 'heading1', content: 'Product Feature Ideas' },
        { type: 'paragraph', content: 'Feel free to dump raw thoughts, reference links, and code snippets.' },
        { type: 'heading2', content: 'Ideas' },
        { type: 'bulletList', content: 'Dark mode customizable accent colors' },
        { type: 'bulletList', content: 'Real-time collaborative cursors' },
      ],
    },
  ];

  if (!workspace) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-muted-foreground">
        Please select a workspace to access Scratch Board.
      </div>
    );
  }

  return (
    <div className="flex-1 flex h-full overflow-hidden bg-background">
      {/* Secondary Notion Sidebar */}
      <ScratchPageSidebar
        workspaceId={workspaceId}
        activePageId={activePageId}
        onSelectPage={(pageId) => setActivePageId(pageId)}
      />

      {/* Editor Canvas or Empty State */}
      {activePageId ? (
        <ScratchEditor pageId={activePageId} key={activePageId} />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-background overflow-y-auto">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-4 shadow-sm">
            <StickyNote className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight mb-2">Scratch Board</h1>
          <p className="text-sm text-muted-foreground max-w-md mb-6 leading-relaxed">
            Capture ideas before they become tasks. Create notes, todos, plans and lightweight documents,
            then turn them into real DoTheThing work whenever you're ready.
          </p>

          <Button onClick={handleCreateBlankPage} size="lg" className="mb-10 font-bold px-6 shadow-md cursor-pointer">
            <Plus className="h-4 w-4 mr-2" />
            New Scratch Page
          </Button>

          {/* Templates Section */}
          <div className="max-w-2xl w-full text-left border-t border-border pt-8">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
              Start from a template
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {templates.map((tpl) => {
                const Icon = tpl.lucideIcon;
                return (
                  <button
                    key={tpl.title}
                    onClick={() => handleCreatePageWithTemplate(tpl.title, tpl.icon, tpl.blocks)}
                    className="flex items-start gap-3 p-4 rounded-xl border border-border bg-card hover:border-primary/50 hover:bg-muted/40 transition-all text-left group cursor-pointer"
                  >
                    <div className="p-2.5 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                        {tpl.title}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                        {tpl.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

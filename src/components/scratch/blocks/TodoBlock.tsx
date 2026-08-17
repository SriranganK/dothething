import React, { useRef, useEffect } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { ExternalLink } from 'lucide-react';
import type { ScratchBlockProperties } from '@/types/scratch';

interface TodoBlockProps {
  content: string;
  properties: ScratchBlockProperties;
  onChangeContent: (content: string) => void;
  onChangeProperties: (props: ScratchBlockProperties) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  autoFocus?: boolean;
}

export const TodoBlock: React.FC<TodoBlockProps> = ({
  content,
  properties,
  onChangeContent,
  onChangeProperties,
  onKeyDown,
  autoFocus = false,
}) => {
  const divRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (divRef.current && divRef.current.innerHTML !== content) {
      divRef.current.innerHTML = content || '';
    }
  }, [content]);

  useEffect(() => {
    if (autoFocus && divRef.current) {
      divRef.current.focus();
      const range = document.createRange();
      const sel = window.getSelection();
      range.selectNodeContents(divRef.current);
      range.collapse(false);
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }, [autoFocus]);

  const isChecked = !!properties.checked;
  const isLinkedToTask = properties.linkedEntityType === 'task' && properties.linkedEntityId;

  const toggleChecked = () => {
    onChangeProperties({ ...properties, checked: !isChecked });
  };

  return (
    <div className="flex items-start gap-2.5 py-0.5 group/todo">
      <div className="pt-1 shrink-0">
        <Checkbox
          checked={isChecked}
          onCheckedChange={toggleChecked}
          className="h-4 w-4 rounded border-muted-foreground/40 data-[state=checked]:bg-primary data-[state=checked]:border-primary transition-colors cursor-pointer"
        />
      </div>
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <div
          ref={divRef}
          contentEditable
          suppressContentEditableWarning
          onInput={(e) => onChangeContent(e.currentTarget.innerHTML)}
          onKeyDown={onKeyDown}
          data-placeholder="To-do..."
          className={`w-full bg-transparent text-foreground outline-none border-none py-0.5 text-sm leading-relaxed min-h-[26px] empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground/50 cursor-text ${
            isChecked ? 'line-through text-muted-foreground/70' : ''
          }`}
        />
        {isLinkedToTask && (
          <div
            className="inline-flex items-center gap-1 text-[11px] font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full shrink-0 border border-primary/20 cursor-pointer hover:bg-primary/20 transition-colors"
            title={`Linked to Task ID: ${properties.linkedEntityId}`}
          >
            <span>Task</span>
            <ExternalLink className="h-3 w-3" />
          </div>
        )}
      </div>
    </div>
  );
};

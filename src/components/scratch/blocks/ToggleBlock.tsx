import React from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { SlateBlockInput } from './SlateBlockInput';
import type { ScratchBlockProperties } from '@/types/scratch';

interface ToggleBlockProps {
  content: string;
  properties?: ScratchBlockProperties;
  onChangeContent: (value: string) => void;
  onChangeProperties: (properties: ScratchBlockProperties) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  autoFocus?: boolean;
  onEditorReady?: (editor: any) => void;
  onPaste?: (e: React.ClipboardEvent<HTMLDivElement>) => void;
}

export const ToggleBlock: React.FC<ToggleBlockProps> = ({
  content,
  properties = {},
  onChangeContent,
  onChangeProperties,
  onKeyDown,
  autoFocus = false,
  onEditorReady,
  onPaste,
}) => {
  const isOpen = properties.isOpen ?? true;

  const toggleOpen = () => {
    onChangeProperties({
      ...properties,
      isOpen: !isOpen,
    });
  };

  const handleSubContentChange = (subVal: string) => {
    onChangeProperties({
      ...properties,
      subContent: subVal,
    });
  };

  return (
    <div className="w-full space-y-1 my-0.5">
      <div className="flex items-start gap-1">
        <button
          onClick={toggleOpen}
          className="p-1 mt-0.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors cursor-pointer shrink-0 select-none"
          title={isOpen ? 'Collapse toggle' : 'Expand toggle'}
        >
          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>

        <div className="flex-1 min-w-0 font-medium">
          <SlateBlockInput
            content={content}
            onChange={onChangeContent}
            onKeyDown={onKeyDown}
            placeholder="Toggle header..."
            autoFocus={autoFocus}
            onEditorReady={onEditorReady}
            onPaste={onPaste}
            className="w-full bg-transparent text-foreground outline-none border-none py-1 text-sm font-semibold cursor-text"
          />
        </div>
      </div>

      {/* Collapsible Children / Subcontent area */}
      {isOpen && (
        <div className="pl-6 border-l-2 border-border/50 ml-3 space-y-1 py-1 transition-all animate-in fade-in-50 duration-150">
          <SlateBlockInput
            content={properties.subContent || ''}
            onChange={handleSubContentChange}
            placeholder="Empty toggle. Write sub-content or details here..."
            className="w-full bg-transparent text-foreground/90 outline-none border-none py-1 text-sm leading-relaxed cursor-text"
          />
        </div>
      )}
    </div>
  );
};

import React from 'react';
import { SlateBlockInput } from './SlateBlockInput';

interface ListBlockProps {
  type: 'bulletList' | 'numberedList';
  content: string;
  index?: number;
  onChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  autoFocus?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
}

export const ListBlock: React.FC<ListBlockProps> = ({
  type,
  content,
  index = 1,
  onChange,
  onKeyDown,
  autoFocus = false,
  onFocus,
  onBlur,
}) => {
  return (
    <div className="flex items-start gap-2 py-0.5">
      <div className="pt-1 w-5 text-center text-muted-foreground font-medium text-xs shrink-0 select-none">
        {type === 'bulletList' ? '•' : `${index}.`}
      </div>
      <SlateBlockInput
        content={content}
        onChange={onChange}
        onKeyDown={onKeyDown}
        placeholder="List item..."
        autoFocus={autoFocus}
        onFocus={onFocus}
        onBlur={onBlur}
        className="w-full bg-transparent text-foreground outline-none border-none py-0.5 text-sm leading-relaxed min-h-[26px] cursor-text"
      />
    </div>
  );
};


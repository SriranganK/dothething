import React, { useRef, useEffect } from 'react';

interface ListBlockProps {
  type: 'bulletList' | 'numberedList';
  content: string;
  index?: number;
  onChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  autoFocus?: boolean;
}

export const ListBlock: React.FC<ListBlockProps> = ({
  type,
  content,
  index = 1,
  onChange,
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

  return (
    <div className="flex items-start gap-2 py-0.5">
      <div className="pt-1 w-5 text-center text-muted-foreground font-medium text-xs shrink-0 select-none">
        {type === 'bulletList' ? '•' : `${index}.`}
      </div>
      <div
        ref={divRef}
        contentEditable
        suppressContentEditableWarning
        onInput={(e) => onChange(e.currentTarget.innerHTML)}
        onKeyDown={onKeyDown}
        data-placeholder="List item..."
        className="w-full bg-transparent text-foreground outline-none border-none py-0.5 text-sm leading-relaxed min-h-[26px] empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground/50 cursor-text"
      />
    </div>
  );
};

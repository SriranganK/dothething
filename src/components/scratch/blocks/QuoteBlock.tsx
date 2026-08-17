import React, { useRef, useEffect } from 'react';

interface QuoteBlockProps {
  content: string;
  onChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  autoFocus?: boolean;
}

export const QuoteBlock: React.FC<QuoteBlockProps> = ({
  content,
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
    <div className="border-l-3 border-primary/70 pl-3 my-1">
      <div
        ref={divRef}
        contentEditable
        suppressContentEditableWarning
        onInput={(e) => onChange(e.currentTarget.innerHTML)}
        onKeyDown={onKeyDown}
        data-placeholder="Empty quote..."
        className="w-full bg-transparent text-foreground italic outline-none border-none py-1 text-sm leading-relaxed min-h-[28px] empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground/40 cursor-text"
      />
    </div>
  );
};

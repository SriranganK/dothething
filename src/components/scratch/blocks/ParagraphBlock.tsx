import React, { useRef, useEffect } from 'react';

interface ParagraphBlockProps {
  content: string;
  onChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export const ParagraphBlock: React.FC<ParagraphBlockProps> = ({
  content,
  onChange,
  onKeyDown,
  placeholder = "Type '/' for commands or start writing...",
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
      // Move cursor to end
      const range = document.createRange();
      const sel = window.getSelection();
      range.selectNodeContents(divRef.current);
      range.collapse(false);
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }, [autoFocus]);

  return (
    <div
      ref={divRef}
      contentEditable
      suppressContentEditableWarning
      onInput={(e) => onChange(e.currentTarget.innerHTML)}
      onKeyDown={onKeyDown}
      data-placeholder={placeholder}
      className="w-full bg-transparent text-foreground outline-none border-none py-1 text-sm leading-relaxed font-normal min-h-[28px] empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground/50 cursor-text"
    />
  );
};

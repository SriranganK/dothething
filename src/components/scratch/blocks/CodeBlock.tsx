import React, { useRef, useEffect, useState } from 'react';
import type { ScratchBlockProperties } from '@/types/scratch';

interface CodeBlockProps {
  content: string;
  properties?: ScratchBlockProperties;
  onChangeContent: (value: string) => void;
  onChangeProperties: (props: ScratchBlockProperties) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  autoFocus?: boolean;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({
  content,
  properties = {},
  onChangeContent,
  onChangeProperties,
  onKeyDown,
  autoFocus = false,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [localValue, setLocalValue] = useState(content);

  useEffect(() => {
    setLocalValue(content);
  }, [content]);

  const language = properties?.language || 'typescript';

  const adjustHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  useEffect(() => {
    adjustHeight();
  }, [localValue]);

  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(localValue.length, localValue.length);
    }
  }, [autoFocus]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setLocalValue(val);
    onChangeContent(val);
  };

  return (
    <div className="my-2 rounded-lg bg-zinc-900 text-zinc-100 p-3 font-mono text-xs border border-zinc-800 relative group/code">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-800 text-[10px] text-zinc-400 uppercase tracking-wider select-none">
        <select
          value={language}
          onChange={(e) => onChangeProperties({ ...properties, language: e.target.value })}
          className="bg-transparent text-zinc-400 font-mono focus:outline-none cursor-pointer hover:text-zinc-200"
        >
          <option value="typescript" className="bg-zinc-900 text-zinc-200">TypeScript</option>
          <option value="javascript" className="bg-zinc-900 text-zinc-200">JavaScript</option>
          <option value="python" className="bg-zinc-900 text-zinc-200">Python</option>
          <option value="html" className="bg-zinc-900 text-zinc-200">HTML</option>
          <option value="css" className="bg-zinc-900 text-zinc-200">CSS</option>
          <option value="json" className="bg-zinc-900 text-zinc-200">JSON</option>
          <option value="sql" className="bg-zinc-900 text-zinc-200">SQL</option>
          <option value="text" className="bg-zinc-900 text-zinc-200">Plain Text</option>
        </select>
      </div>
      <textarea
        ref={textareaRef}
        value={localValue}
        onChange={handleChange}
        onKeyDown={onKeyDown}
        placeholder="// Code..."
        rows={2}
        className="w-full bg-transparent text-zinc-100 placeholder:text-zinc-600 resize-none outline-none border-none leading-relaxed font-mono text-xs"
      />
    </div>
  );
};

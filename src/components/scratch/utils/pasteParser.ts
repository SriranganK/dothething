import type { BlockType, ScratchBlockProperties } from '@/types/scratch';

export interface ParsedScratchBlock {
  type: BlockType;
  content: string;
  properties?: ScratchBlockProperties;
}

/**
 * Upload a pasted image file to the server and return its public URL and metadata
 */
export async function uploadPastedImage(
  file: File,
  apiBaseUrl: string
): Promise<{ url: string; originalName: string; size: number; mimeType: string }> {
  const cleanName = file.name ? file.name.replace(/[^a-zA-Z0-9.-]/g, '_') : 'pasted_image.png';
  const storageKey = `temp/scratch/${Date.now()}-${cleanName}`;
  const uploadUrl = `${apiBaseUrl}/api/attachments/upload-local?key=${encodeURIComponent(storageKey)}`;
  const publicUrl = `${apiBaseUrl}/uploads/${storageKey}`;

  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type || 'image/png',
    },
    body: file,
  });

  if (!res.ok) {
    throw new Error(`Failed to upload pasted image (Status: ${res.status})`);
  }

  return {
    url: publicUrl,
    originalName: file.name || 'Pasted Image',
    size: file.size,
    mimeType: file.type || 'image/png',
  };
}

/**
 * Parses markdown table lines into headers and rows
 */
function parseMarkdownTable(text: string): { headers: string[]; rows: string[][] } | null {
  const lines = text
    .trim()
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) return null;

  // Must contain pipe characters
  const pipeLines = lines.filter((l) => l.includes('|'));
  if (pipeLines.length < 2) return null;

  const parseRow = (line: string) => {
    let clean = line;
    if (clean.startsWith('|')) clean = clean.slice(1);
    if (clean.endsWith('|')) clean = clean.slice(0, -1);
    return clean.split('|').map((cell) => cell.trim());
  };

  const firstRow = parseRow(pipeLines[0]);
  const secondRow = parseRow(pipeLines[1]);

  // Check if second row is a markdown delimiter like | --- | :---: |
  const isDelimiter = secondRow.every((c) => /^:?-+:?$/.test(c.replace(/\s+/g, '')));

  if (isDelimiter && pipeLines.length >= 2) {
    const headers = firstRow;
    const rows = pipeLines.slice(2).map(parseRow);
    return {
      headers: headers.length > 0 ? headers : ['Column 1', 'Column 2'],
      rows: rows.length > 0 ? rows : [new Array(headers.length).fill('')],
    };
  }

  return null;
}

/**
 * Parses TSV (e.g. copied from Google Sheets, Excel, or Calc)
 */
function parseTSV(text: string): { headers: string[]; rows: string[][] } | null {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return null;

  const tabLines = lines.filter((l) => l.includes('\t'));
  if (tabLines.length < 2) return null;

  const parsed = lines.map((l) => l.split('\t').map((c) => c.trim()));
  const colCount = Math.max(...parsed.map((r) => r.length));

  if (colCount < 2) return null;

  const headers = parsed[0].concat(new Array(Math.max(0, colCount - parsed[0].length)).fill(''));
  const rows = parsed.slice(1).map((r) => r.concat(new Array(Math.max(0, colCount - r.length)).fill('')));

  return { headers, rows };
}

/**
 * Parses HTML table elements
 */
function parseHtmlTable(tableEl: HTMLTableElement): { headers: string[]; rows: string[][] } {
  const trs = Array.from(tableEl.querySelectorAll('tr'));
  if (trs.length === 0) {
    return { headers: ['Col 1', 'Col 2'], rows: [['', '']] };
  }

  // Look for thead or first row
  const theadTr = tableEl.querySelector('thead tr') || trs[0];
  const headerCells = theadTr ? Array.from(theadTr.querySelectorAll('th, td')) : [];
  let headers = headerCells.map((c) => (c.textContent || '').trim());

  let dataTrs = trs;
  if (theadTr && trs.includes(theadTr)) {
    dataTrs = trs.filter((r) => r !== theadTr);
  }

  const rows: string[][] = [];
  dataTrs.forEach((tr) => {
    const cells = Array.from(tr.querySelectorAll('td, th')).map((c) => (c.textContent || '').trim());
    if (cells.length > 0) {
      rows.push(cells);
    }
  });

  const maxCols = Math.max(headers.length, ...rows.map((r) => r.length), 1);
  while (headers.length < maxCols) {
    headers.push(`Column ${headers.length + 1}`);
  }

  // Normalize row lengths
  const normalizedRows = rows.map((r) => {
    const copy = [...r];
    while (copy.length < maxCols) copy.push('');
    return copy;
  });

  return {
    headers,
    rows: normalizedRows.length > 0 ? normalizedRows : [new Array(maxCols).fill('')],
  };
}

/**
 * Primary Clipboard Parser: detects images, tables, checklists, bullet lists, numbered lists,
 * headings, quotes, code, and multi-line text.
 */
export async function parseClipboardData(
  clipboardData: DataTransfer,
  apiBaseUrl: string
): Promise<ParsedScratchBlock[] | null> {
  // 1. Check for image files in clipboardData (e.g. screenshot or copied image file)
  if (clipboardData.files && clipboardData.files.length > 0) {
    const imageFiles: File[] = [];
    for (let i = 0; i < clipboardData.files.length; i++) {
      const f = clipboardData.files[i];
      if (f.type.startsWith('image/')) {
        imageFiles.push(f);
      }
    }

    if (imageFiles.length > 0) {
      const results: ParsedScratchBlock[] = [];
      for (const imgFile of imageFiles) {
        try {
          const uploaded = await uploadPastedImage(imgFile, apiBaseUrl);
          results.push({
            type: 'image',
            content: '',
            properties: {
              url: uploaded.url,
              originalName: uploaded.originalName,
              size: uploaded.size,
              mimeType: uploaded.mimeType,
            },
          });
        } catch (err) {
          console.error('Failed to upload clipboard image:', err);
        }
      }
      if (results.length > 0) return results;
    }
  }

  const html = clipboardData.getData('text/html');
  const text = clipboardData.getData('text/plain');

  // 2. Check for HTML Table or lists in text/html
  if (html && html.trim()) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      // Check for <table>
      const tableEl = doc.querySelector('table');
      if (tableEl) {
        const tableData = parseHtmlTable(tableEl);
        return [
          {
            type: 'table',
            content: '',
            properties: { tableData },
          },
        ];
      }

      // Check for <ul> or <ol> lists
      const listEls = Array.from(doc.body.querySelectorAll('ul, ol'));
      if (listEls.length > 0 && doc.body.textContent && doc.body.textContent.trim().length > 0) {
        const blocks: ParsedScratchBlock[] = [];
        const lis = Array.from(doc.querySelectorAll('li'));
        if (lis.length > 0) {
          lis.forEach((li) => {
            const checkbox = li.querySelector('input[type="checkbox"]') as HTMLInputElement | null;
            const isTaskList = Boolean(checkbox) || li.classList.contains('task-list-item');
            const clone = li.cloneNode(true) as HTMLElement;
            clone.querySelectorAll('input[type="checkbox"]').forEach((el) => el.remove());
            const content = (clone.innerHTML || clone.textContent || '').trim();

            if (isTaskList) {
              blocks.push({
                type: 'todo',
                content,
                properties: { checked: checkbox ? checkbox.checked : false },
              });
            } else if (li.closest('ol')) {
              blocks.push({
                type: 'numberedList',
                content,
              });
            } else {
              blocks.push({
                type: 'bulletList',
                content,
              });
            }
          });
          if (blocks.length > 0) return blocks;
        }
      }

      // Check for <img> tag in HTML
      const imgEl = doc.querySelector('img');
      if (imgEl && imgEl.src && !doc.body.textContent?.trim()) {
        return [
          {
            type: 'image',
            content: '',
            properties: {
              url: imgEl.src,
              originalName: imgEl.alt || 'Pasted Image',
            },
          },
        ];
      }
    } catch (e) {
      // Fall through to plain text parsing
    }
  }

  // 3. Plain text parsing
  if (text && text.trim()) {
    const trimmed = text.trim();

    // 3a. Markdown Table
    const mdTable = parseMarkdownTable(trimmed);
    if (mdTable) {
      return [
        {
          type: 'table',
          content: '',
          properties: { tableData: mdTable },
        },
      ];
    }

    // 3b. TSV Table (from Excel or Google Sheets)
    const tsvTable = parseTSV(trimmed);
    if (tsvTable) {
      return [
        {
          type: 'table',
          content: '',
          properties: { tableData: tsvTable },
        },
      ];
    }

    // 3c. Direct Image URL
    if (/^https?:\/\/[^\s]+\.(png|jpe?g|gif|webp|svg)(\?[^\s]*)?$/i.test(trimmed)) {
      return [
        {
          type: 'image',
          content: '',
          properties: {
            url: trimmed,
            originalName: 'Image from URL',
          },
        },
      ];
    }

    // 3d. Check multi-line patterns (lists, todos, headings, etc.)
    const rawLines = text.split(/\r?\n/);
    // If it's just 1 line and doesn't match bullet/todo/heading/code, let normal Slate paste handle it
    if (rawLines.length === 1) {
      const singleLine = rawLines[0].trim();

      // Check single todo
      const todoMatch = singleLine.match(/^[-*+]?\s*\[([ xX])\]\s*(.*)$/);
      if (todoMatch) {
        return [
          {
            type: 'todo',
            content: todoMatch[2],
            properties: { checked: todoMatch[1].toLowerCase() === 'x' },
          },
        ];
      }

      // Check single bullet
      const bulletMatch = singleLine.match(/^[-*+•⁃]\s+(.*)$/);
      if (bulletMatch) {
        return [
          {
            type: 'bulletList',
            content: bulletMatch[1],
          },
        ];
      }

      // Check single numbered list
      const numMatch = singleLine.match(/^\d+[\.\)]\s+(.*)$/);
      if (numMatch) {
        return [
          {
            type: 'numberedList',
            content: numMatch[1],
          },
        ];
      }

      // Check single heading
      if (singleLine.startsWith('### ')) {
        return [{ type: 'heading3', content: singleLine.slice(4) }];
      }
      if (singleLine.startsWith('## ')) {
        return [{ type: 'heading2', content: singleLine.slice(3) }];
      }
      if (singleLine.startsWith('# ')) {
        return [{ type: 'heading1', content: singleLine.slice(2) }];
      }

      // Check quote
      if (singleLine.startsWith('> ')) {
        return [{ type: 'quote', content: singleLine.slice(2) }];
      }

      // Check divider
      if (/^(---|\*\*\*|___)$/.test(singleLine)) {
        return [{ type: 'divider', content: '' }];
      }

      // Normal single line: let Slate paste handle it inline
      return null;
    }

    // Multi-line paste processing
    const blocks: ParsedScratchBlock[] = [];
    let insideCodeBlock = false;
    let codeBlockLang = '';
    let codeBlockLines: string[] = [];

    for (let i = 0; i < rawLines.length; i++) {
      const line = rawLines[i];
      const trimmedLine = line.trim();

      // Code block delimiters: ```ts ... ```
      if (trimmedLine.startsWith('```')) {
        if (insideCodeBlock) {
          blocks.push({
            type: 'code',
            content: codeBlockLines.join('\n'),
            properties: { language: codeBlockLang || 'javascript' },
          });
          insideCodeBlock = false;
          codeBlockLines = [];
          codeBlockLang = '';
        } else {
          insideCodeBlock = true;
          codeBlockLang = trimmedLine.slice(3).trim();
          codeBlockLines = [];
        }
        continue;
      }

      if (insideCodeBlock) {
        codeBlockLines.push(line);
        continue;
      }

      // Skip blank lines or push empty paragraph if consecutive
      if (!trimmedLine) {
        continue;
      }

      // Checklist / Todo
      const todoMatch = trimmedLine.match(/^[-*+]?\s*\[([ xX])\]\s*(.*)$/);
      if (todoMatch) {
        blocks.push({
          type: 'todo',
          content: todoMatch[2],
          properties: { checked: todoMatch[1].toLowerCase() === 'x' },
        });
        continue;
      }

      // Bullet List
      const bulletMatch = trimmedLine.match(/^[-*+•⁃]\s+(.*)$/);
      if (bulletMatch) {
        blocks.push({
          type: 'bulletList',
          content: bulletMatch[1],
        });
        continue;
      }

      // Numbered List
      const numMatch = trimmedLine.match(/^\d+[\.\)]\s+(.*)$/);
      if (numMatch) {
        blocks.push({
          type: 'numberedList',
          content: numMatch[1],
        });
        continue;
      }

      // Headings
      if (trimmedLine.startsWith('### ')) {
        blocks.push({ type: 'heading3', content: trimmedLine.slice(4) });
        continue;
      }
      if (trimmedLine.startsWith('## ')) {
        blocks.push({ type: 'heading2', content: trimmedLine.slice(3) });
        continue;
      }
      if (trimmedLine.startsWith('# ')) {
        blocks.push({ type: 'heading1', content: trimmedLine.slice(2) });
        continue;
      }

      // Quote
      if (trimmedLine.startsWith('> ')) {
        blocks.push({ type: 'quote', content: trimmedLine.slice(2) });
        continue;
      }

      // Divider
      if (/^(---|\*\*\*|___)$/.test(trimmedLine)) {
        blocks.push({ type: 'divider', content: '' });
        continue;
      }

      // Regular paragraph
      blocks.push({
        type: 'paragraph',
        content: line,
      });
    }

    if (insideCodeBlock && codeBlockLines.length > 0) {
      blocks.push({
        type: 'code',
        content: codeBlockLines.join('\n'),
        properties: { language: codeBlockLang || 'javascript' },
      });
    }

    if (blocks.length > 0) {
      return blocks;
    }
  }

  return null;
}

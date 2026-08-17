export const formatSelectedText = (
  text: string,
  selectionStart: number,
  selectionEnd: number,
  format: 'bold' | 'italic' | 'strike' | 'code' | 'link'
): { updatedText: string; newCursorPos: number } => {
  const selected = text.slice(selectionStart, selectionEnd) || 'text';
  let formatted = '';

  switch (format) {
    case 'bold':
      formatted = `**${selected}**`;
      break;
    case 'italic':
      formatted = `*${selected}*`;
      break;
    case 'strike':
      formatted = `~~${selected}~~`;
      break;
    case 'code':
      formatted = `\`${selected}\``;
      break;
    case 'link':
      formatted = `[${selected}](https://)`;
      break;
  }

  const updatedText = text.slice(0, selectionStart) + formatted + text.slice(selectionEnd);
  const newCursorPos = selectionStart + formatted.length;

  return { updatedText, newCursorPos };
};

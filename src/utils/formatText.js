/**
 * Converts markdown-style formatting to HTML
 * Supports:
 * - **bold** -> <strong>bold</strong>
 * - *italic* -> <em>italic</em>
 * - __underline__ -> <u>underline</u>
 * - Multi-line support with <br> tags
 */
export const renderFormattedText = (text) => {
  if (!text) return '';

  // Split by newlines first
  const lines = text.split('\n');

  // Process each line for formatting
  const processedLines = lines.map(line => {
    let processed = line;

    // Handle **bold**
    processed = processed.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // Handle *italic* (but not ** which was already processed)
    processed = processed.replace(/(?<!\*)\*(?!\*)(.+?)\*(?!\*)/g, '<em>$1</em>');

    // Handle __underline__
    processed = processed.replace(/__(.+?)__/g, '<u>$1</u>');

    return processed;
  });

  // Join lines with <br> tags
  return processedLines.join('<br>');
};

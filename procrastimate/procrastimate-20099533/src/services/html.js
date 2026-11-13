const REPLACEMENTS = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
};

// Escapes text that will be placed in an HTML document. All five characters are
// replaced in a single pass.
export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => REPLACEMENTS[character]);
}

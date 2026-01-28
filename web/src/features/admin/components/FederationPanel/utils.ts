/**
 * Format a number with K/M/G suffixes for display
 */
export const formatSize = (bytes: number): string => {
  if (bytes === 0) return '0';
  const k = 1024;
  const sizes = ['', 'K', 'M', 'G'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + sizes[i];
};

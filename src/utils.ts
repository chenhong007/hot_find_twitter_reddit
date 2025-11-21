
/**
 * Parses a string representation of a number (e.g. "1.2K", "1M", "1.2万") into a number.
 */
export const parseNumber = (text: string): number => {
  if (!text) return 0;
  const cleanText = text.trim().toUpperCase().replace(/,/g, '');
  
  if (cleanText.includes('K')) {
    return parseFloat(cleanText.replace('K', '')) * 1000;
  }
  if (cleanText.includes('M')) {
    return parseFloat(cleanText.replace('M', '')) * 1000000;
  }
  if (cleanText.includes('B')) {
    return parseFloat(cleanText.replace('B', '')) * 1000000000;
  }
  if (cleanText.includes('万')) {
    return parseFloat(cleanText.replace('万', '')) * 10000;
  }
  if (cleanText.includes('亿')) {
    return parseFloat(cleanText.replace('亿', '')) * 100000000;
  }
  
  const num = parseFloat(cleanText);
  return isNaN(num) ? 0 : num;
};

/**
 * Parses various date formats into an ISO string.
 * Handles Chinese date formats like "10月6日".
 */
export const parseDate = (dateText: string): string => {
  const timestamp = new Date().toISOString();
  if (!dateText) return timestamp;

  try {
    let dateStr = dateText.trim();
    // Handle Chinese date format: "10月6日" -> "2024-10-06"
    if (dateStr.includes('月') && !dateStr.includes('年')) {
        dateStr = `${new Date().getFullYear()}年${dateStr}`;
    }
    // Replace Chinese separators
    dateStr = dateStr.replace(/年|月/g, '-').replace(/日/g, '');
    
    const parsedDate = new Date(dateStr);
    if (!isNaN(parsedDate.getTime())) {
        return parsedDate.toISOString();
    }
  } catch (e) {
    // Fallback to current time or original string if strict parsing needed
  }
  return timestamp;
};


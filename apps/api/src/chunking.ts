const WORDS_PER_CHUNK = 500;
const WORD_OVERLAP = 100;

export interface Chunk {
  index: number;
  content: string;
  pageRange: string;
}

export const chunkPageText = (pageText: string, pageNumber: number): Chunk[] => {
  const words = pageText.split(/\s+/).filter(Boolean);
  const chunks: Chunk[] = [];
  let start = 0;
  let index = 0;

  while (start < words.length) {
    const end = Math.min(start + WORDS_PER_CHUNK, words.length);
    const slice = words.slice(start, end).join(" ");
    chunks.push({
      index,
      content: slice,
      pageRange: `${pageNumber}`,
    });
    index += 1;
    if (end === words.length) break;
    start = end - WORD_OVERLAP;
  }

  return chunks;
};

export const chunkMultiPageText = (
  pages: { pageNumber: number; text: string }[]
): Chunk[] => {
  const all: Chunk[] = [];
  pages.forEach((p) => {
    const pageChunks = chunkPageText(p.text, p.pageNumber);
    pageChunks.forEach((c) => all.push(c));
  });
  return all;
};

interface ChapterLike {
  chapterNumber: number;
}

export function sortByChapter<T extends ChapterLike>(items: T[]): T[] {
  return [...items].sort((a, b) => a.chapterNumber - b.chapterNumber);
}

import type { CollectionEntry } from 'astro:content';

export type ContentItem = CollectionEntry<'blog'> | CollectionEntry<'notes'> | CollectionEntry<'bookmarks'>;

export function sortContentByDate(content: ContentItem[]): ContentItem[] {
    return content.sort((a, b) => {
        const dateA = 'publishedAt' in a.data ? a.data.publishedAt : new Date();
        const dateB = 'publishedAt' in b.data ? b.data.publishedAt : new Date();
        return dateB.getTime() - dateA.getTime();
    });
}

export function filterDrafts(content: ContentItem[]): ContentItem[] {
    return content.filter((item) => {
        if ('draft' in item.data) {
            return !item.data.draft;
        }
        return true;
    });
}

export function extractFirstImageFromMarkdown(markdown: string): string | null {
    // 匹配 markdown 图片语法: ![alt](url) 或 ![alt](url "title")
    const imageRegex = /!\[.*?\]\(([^)]+)\)/;
    const match = markdown.match(imageRegex);
    
    if (match && match[1]) {
        // 移除可能的标题部分 (如 "url title" 中的 title)
        const url = match[1].split(' ')[0].replace(/["']/g, '');
        return url;
    }
    
    return null;
} 
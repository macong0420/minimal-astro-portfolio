import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { SITE } from '../constants/site.ts';

export async function GET(context) {
  const blog = await getCollection('blog', ({ data }) => {
    // 在生产环境过滤掉草稿文章
    return import.meta.env.PROD ? !data.draft : true;
  });

  // 按发布日期倒序排序
  const sortedPosts = blog.sort(
    (a, b) => b.data.publishedAt.getTime() - a.data.publishedAt.getTime()
  );

  return rss({
    title: SITE.title,
    description: SITE.description,
    site: context.site || SITE.url,
    items: await Promise.all(sortedPosts.map(async (post) => {
      const { Content } = await post.render();
      return {
        title: post.data.title,
        pubDate: post.data.publishedAt,
        description: post.data.description,
        content: `<![CDATA[${post.body.replace(/```mermaid\n([\s\S]*?)\n```/g, '<div class="mermaid">$1</div>')}]]>`,
        link: `/blog/${post.slug}/`,
        categories: post.data.tags || [],
        author: `${SITE.name} <noreply@blog.yc0501.online>`,
      };
    })),
    customData: `<language>zh-cn</language>`,
  });
}
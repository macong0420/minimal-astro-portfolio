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
    xmlns: {
      content: "http://purl.org/rss/1.0/modules/content/"
    },
    items: sortedPosts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.publishedAt,
      description: post.data.description,
      link: `/blog/${post.id}/`,
      categories: post.data.tags || [],
      author: `${SITE.name} <noreply@blog.yc0501.online>`,
      customData: `<content:encoded><![CDATA[${
        post.body
          // 转换 Mermaid 图表
          .replace(/```mermaid\n([\s\S]*?)\n```/g, '<div class="mermaid">$1</div>')
          // 转换相对路径图片为绝对路径
          .replace(/!\[([^\]]*)\]\((?!https?:\/\/)([^)]+)\)/g, `![$$1](${context.site || SITE.url}$$2)`)
          // 转换相对链接为绝对链接
          .replace(/\[([^\]]+)\]\((?!https?:\/\/|mailto:|#)([^)]+)\)/g, `[$$1](${context.site || SITE.url}$$2)`)
      }]]></content:encoded>`,
    })),
    customData: `<language>zh-cn</language>`,
  });
}
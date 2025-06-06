import { getCollection, render } from "astro:content";
import type { APIRoute } from "astro";

export const GET: APIRoute = async ({ params }) => {
  const { slug } = params;
  
  if (!slug) {
    return new Response(JSON.stringify({ error: "Slug is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    // 获取所有博客文章
    const posts = await getCollection("blog", ({ data }) => {
      return import.meta.env.PROD ? !data.draft : true;
    });

    // 找到对应的文章
    const post = posts.find(p => p.id === slug);
    
    if (!post) {
      return new Response(JSON.stringify({ error: "Post not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 渲染文章内容
    const { Content } = await render(post);
    
    // 格式化日期
    const formatDate = (date: Date) => {
      return date.toLocaleDateString("zh-CN", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    };

    // 计算阅读时间
    const calculateReadingTime = (content: string) => {
      const wordsPerMinute = 200;
      const words = content.length / 2;
      const minutes = Math.ceil(words / wordsPerMinute);
      return minutes;
    };

    // 返回文章数据
    const postData = {
      id: post.id,
      title: post.data.title,
      description: post.data.description,
      publishedAt: post.data.publishedAt.toISOString(),
      formattedDate: formatDate(post.data.publishedAt),
      tags: post.data.tags || [],
      readingTime: calculateReadingTime(post.body),
      body: post.body
    };

    return new Response(JSON.stringify(postData), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Error fetching post:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};

export async function getStaticPaths() {
  const posts = await getCollection("blog");
  return posts.map((post) => ({
    params: { slug: post.id },
  }));
}

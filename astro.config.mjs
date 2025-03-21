import { defineConfig } from 'astro/config';

export default defineConfig({
  // 其他配置...
  markdown: {
    syntaxHighlight: 'prism',
    // 或者使用 shiki (VSCode风格)
    // syntaxHighlight: 'shiki',
    // shikiConfig: {
    //   theme: 'dark-plus',
    //   wrap: true
    // }
  },
}); 
// 导入 MermaidRenderer 自定义元素
import { MermaidRenderer } from '../components/custom/MermaidRenderer.js';

// 页面加载完成后初始化
document.addEventListener('astro:page-load', () => {
  // 如果已经注册，不需要重复注册
  if (!customElements.get('astro-mermaid')) {
    customElements.define('astro-mermaid', MermaidRenderer);
  }
}); 
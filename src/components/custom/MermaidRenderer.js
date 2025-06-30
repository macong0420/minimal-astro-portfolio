// 创建自定义元素来渲染 Mermaid 图表
export class MermaidRenderer extends HTMLElement {
  constructor() {
    super();
    this.chart = decodeURIComponent(this.getAttribute('data-chart') || '');
    this.id = `mermaid-${Math.random().toString(36).substring(2, 11)}`;
  }

  async connectedCallback() {
    if (!this.chart) return;

    // 创建容器
    const wrapper = document.createElement('div');
    wrapper.className = 'mermaid-wrapper';

    const container = document.createElement('div');
    container.className = 'mermaid';
    container.id = this.id;
    container.textContent = this.chart;

    wrapper.appendChild(container);
    this.appendChild(wrapper);

    // 动态加载 mermaid
    const mermaidModule = await import('mermaid');
    const mermaid = mermaidModule.default;

    // 初始化
    mermaid.initialize({
      startOnLoad: false,
      theme: document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'default',
      securityLevel: 'loose',
      fontFamily: 'Inter, sans-serif',
    });

    // 渲染图表
    try {
      await mermaid.run();
    } catch (e) {
      console.error('Mermaid 渲染错误:', e);
      container.innerHTML = `<pre class="error">Mermaid 语法错误: ${e.message}</pre>`;
    }
  }
}

// 注册自定义元素将在 mermaid-init.js 中进行
// 避免在这里重复注册 
import { visit } from 'unist-util-visit';

export function remarkMermaid() {
  return (tree) => {
    visit(tree, 'code', (node) => {
      if (node.lang === 'mermaid') {
        try {
          node.type = 'html';
          const chart = node.value.trim();
          // 直接使用 div.mermaid 类，这样 mermaid.js 可以直接渲染
          node.value = `<div class="mermaid-wrapper"><div class="mermaid">${chart}</div></div>`;
        } catch (error) {
          console.error('Error processing Mermaid code block:', error);
          // 保持原始代码块不变
          node.value = node.value;
        }
      }
    });
  };
} 
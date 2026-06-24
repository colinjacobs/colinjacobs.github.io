(function () {
  const manifest = {
    id: 'file-browser',
    title: 'File Browser',
    defaultSize: { w: 460, h: 360 },
  };

  // Static tree for now. Phase 6 swaps this for a live call to the
  // SQL portfolio API; the render logic below doesn't need to change.
  const TREE = {
    name: 'PORTFOLIO',
    children: [
      { name: '100-days-of-code', children: [
        { name: 'day-01-...' }, { name: 'day-02-...' }, { name: '...' },
      ]},
      { name: 'scary-salad', children: [
        { name: 'halcyon-lab' },
      ]},
      { name: 'sql-playground', children: [
        { name: 'dataset.sqlite' },
      ]},
    ],
  };

  function renderNode(node, depth) {
    const indent = depth * 14;
    const hasChildren = !!node.children;
    let html = `<div class="fb-row" style="padding-left:${indent}px">
        <span class="fb-icon">${hasChildren ? '▸' : '·'}</span>
        <span class="fb-name">${node.name}</span>
      </div>`;
    if (hasChildren) {
      html += node.children.map(c => renderNode(c, depth + 1)).join('');
    }
    return html;
  }

  function mount(contentEl) {
    contentEl.innerHTML = `
      <style>
        .fb-wrap { font-family: 'Share Tech Mono', monospace; font-size: 11px; padding: 10px 0; }
        .fb-row { padding: 4px 10px; color: var(--text-mid); cursor: pointer; }
        .fb-row:hover { background: var(--surface2); color: var(--text-bright); }
        .fb-icon { color: var(--amber-dim); margin-right: 6px; }
      </style>
      <div class="fb-wrap">${renderNode(TREE, 0)}</div>
    `;
  }

  window.ShellApps = window.ShellApps || {};
  window.ShellApps['file-browser'] = { manifest, mount };
})();

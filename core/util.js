/* Small helpers every game reuses. Attaches to the global AG namespace. */
window.AG = window.AG || {};

AG.util = {
  /** Build an element: el('div', {class:'x', text:'hi'}, [child, ...]) */
  el(tag, props = {}, children = []) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(props)) {
      if (key === 'class') node.className = value;
      else if (key === 'text') node.textContent = value;
      else if (key === 'html') node.innerHTML = value;
      else if (key === 'style') {
        // setProperty is needed for CSS custom properties — Object.assign drops them.
        for (const [prop, val] of Object.entries(value)) {
          if (prop.startsWith('--')) node.style.setProperty(prop, val);
          else node.style[prop] = val;
        }
      }
      else if (key.startsWith('on')) node.addEventListener(key.slice(2).toLowerCase(), value);
      else if (value !== null && value !== undefined) node.setAttribute(key, value);
    }
    for (const child of [].concat(children)) {
      if (child) node.append(child);
    }
    return node;
  },

  /** Fisher-Yates. Returns a new array. */
  shuffle(items) {
    const out = items.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  },

  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  },

  randomBetween(min, max) {
    return min + Math.random() * (max - min);
  },

  pick(items) {
    return items[Math.floor(Math.random() * items.length)];
  },
};

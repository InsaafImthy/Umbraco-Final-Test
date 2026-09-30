function replace(target, node) {
  if (!(target instanceof Element)) return null;
  target.replaceChildren(node);
  return node;
}

function createStatus(message, modifier = '') {
  const element = document.createElement('p');
  element.className = `status${modifier ? ` status--${modifier}` : ''}`;
  element.textContent = message;
  return element;
}

export function renderLoading(target, message = 'Loading content…') {
  const status = createStatus(message, 'loading');
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  return replace(target, status);
}

export function renderError(target, error, message = 'This content is temporarily unavailable.') {
  console.error('Content rendering failed.', error);
  const status = createStatus(message, 'error');
  status.setAttribute('role', 'alert');
  return replace(target, status);
}

export function renderEmpty(target, message = 'No content is available yet.') {
  return replace(target, createStatus(message, 'empty'));
}

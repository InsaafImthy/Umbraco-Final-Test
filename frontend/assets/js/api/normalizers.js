function first(value) {
  return Array.isArray(value) ? value[0] : value;
}

export function normalizeMedia(value) {
  const media = first(value);
  if (!media) return null;
  if (typeof media === 'string') return { url: media, name: '', width: null, height: null };

  return {
    url: media.url || media.src || '',
    name: media.name || '',
    width: media.width ?? null,
    height: media.height ?? null,
    focalPoint: media.focalPoint ?? null,
    crops: Array.isArray(media.crops) ? media.crops : [],
  };
}

export function normalizeLink(value) {
  const link = first(value);
  if (!link) return null;
  if (typeof link === 'string') return { href: link, label: '', target: null };

  return {
    href: link.url || link.href || link.route?.path || '',
    label: link.title || link.name || '',
    target: link.target || null,
  };
}

export function normalizeNavigation(value) {
  return normalizeBlockList(value).map((item) => {
    const link = normalizeLink(item.properties?.link);

    return {
      id: item.id,
      label: item.properties?.label || link?.label || '',
      href: link?.href || '',
      target: link?.target || null,
    };
  }).filter((item) => item.label && item.href);
}

export function normalizeSocialLinks(value) {
  return normalizeBlockList(value).map((item) => ({
    id: item.id,
    label: item.properties?.platformName || '',
    href: item.properties?.url || '',
  })).filter((item) => item.label && item.href);
}

export function normalizeBlockList(value) {
  const items = Array.isArray(value) ? value : value?.items;
  if (!Array.isArray(items)) return [];

  return items.map((item) => {
    const content = item?.content || item;
    return {
      id: content?.id || item?.key || null,
      type: content?.contentType || content?.contentTypeAlias || '',
      properties: content?.properties || {},
      settings: item?.settings?.properties || item?.settings || null,
    };
  });
}

export function normalizeRichText(value) {
  if (!value) return { markup: '', blocks: [] };
  if (typeof value === 'string') return { markup: value, blocks: [] };

  return {
    markup: value.markup || value.html || '',
    blocks: normalizeBlockList(value.blocks),
  };
}

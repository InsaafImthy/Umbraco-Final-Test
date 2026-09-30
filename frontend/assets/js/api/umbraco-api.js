import { CMS_URL } from '../config.js';
import { getCurrentCulture } from '../localization.js';

const DELIVERY_API_PATH = '/umbraco/delivery/api/v2/content';
const DEFAULT_TIMEOUT_MS = 10000;

export class UmbracoApiError extends Error {
  constructor(message, { code = 'UMBRACO_API_ERROR', status = null, url = null, cause } = {}) {
    super(message, { cause });
    this.name = 'UmbracoApiError';
    this.code = code;
    this.status = status;
    this.url = url;
  }
}

export function buildUrl(path, query = {}) {
  const baseUrl = new URL(CMS_URL);
  const basePath = baseUrl.pathname.replace(/\/$/, '');
  const requestPath = String(path).replace(/^\//, '');
  const url = new URL(`${basePath}/${requestPath}`, baseUrl);

  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;

    const values = Array.isArray(value) ? value : [value];
    values.forEach((entry) => url.searchParams.append(key, String(entry)));
  });

  return url;
}

async function parseResponse(response, url) {
  if (response.status === 204) return null;

  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch (cause) {
    throw new UmbracoApiError(`Umbraco returned invalid JSON for ${url.pathname}.`, {
      code: 'INVALID_JSON',
      status: response.status,
      url: url.toString(),
      cause,
    });
  }
}

function readableErrorBody(body) {
  if (!body || typeof body !== 'object') return '';
  return body.detail || body.title || body.message || '';
}

export async function request(path, { query, timeout = DEFAULT_TIMEOUT_MS, signal, ...options } = {}) {
  const url = buildUrl(path, query);
  const timeoutSignal = AbortSignal.timeout(timeout);
  const requestSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;

  let response;

  try {
    response = await fetch(url, {
      ...options,
      headers: {
        Accept: 'application/json',
        ...options.headers,
      },
      signal: requestSignal,
    });
  } catch (cause) {
    const timedOut = timeoutSignal.aborted && !signal?.aborted;
    throw new UmbracoApiError(
      timedOut ? `Umbraco did not respond within ${timeout} ms.` : 'Unable to reach Umbraco.',
      {
        code: timedOut ? 'TIMEOUT' : 'NETWORK_ERROR',
        url: url.toString(),
        cause,
      },
    );
  }

  const body = await parseResponse(response, url);

  if (!response.ok) {
    const detail = readableErrorBody(body);
    throw new UmbracoApiError(
      `Umbraco request failed with HTTP ${response.status}${detail ? `: ${detail}` : '.'}`,
      {
        code: 'HTTP_ERROR',
        status: response.status,
        url: url.toString(),
      },
    );
  }

  return body;
}

function itemSelectorPath(selector) {
  if (typeof selector !== 'string' || selector.trim() === '') {
    throw new TypeError('A content item ID or route is required.');
  }

  const value = selector.trim();
  if (value === '/') return '';
  return value.replace(/^\/+|\/+$/g, '').split('/').map(encodeURIComponent).join('/');
}

export function getContentItem(selector, options = {}) {
  const { expand, fields, preview, culture = getCurrentCulture(), ...requestOptions } = options;
  const itemPath = itemSelectorPath(selector);

  return request(`${DELIVERY_API_PATH}/item/${itemPath}`, {
    ...requestOptions,
    query: { expand, fields, preview, culture },
  });
}

export function getContentCollection(options = {}) {
  const {
    fetch: fetchSelector,
    filter,
    sort,
    skip,
    take,
    expand,
    fields,
    preview,
    culture = getCurrentCulture(),
    ...requestOptions
  } = options;

  return request(DELIVERY_API_PATH, {
    ...requestOptions,
    query: {
      fetch: fetchSelector,
      filter,
      sort,
      skip,
      take,
      expand,
      fields,
      preview,
      culture,
    },
  });
}

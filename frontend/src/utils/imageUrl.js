export const getImageUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:')) {
    return url;
  }
  const base = import.meta.env.VITE_MEDIA_BASE_URL || '';
  return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
};

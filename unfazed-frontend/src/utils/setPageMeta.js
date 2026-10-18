function upsert(attribute, key, content) {
  if (!content) return;
  let tag = document.head.querySelector(`meta[${attribute}="${key}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attribute, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
}

export default function setPageMeta({ title, description, image, url }) {
  if (title) document.title = title;
  upsert('name', 'description', description);
  upsert('property', 'og:title', title);
  upsert('property', 'og:description', description);
  upsert('property', 'og:image', image);
  upsert('property', 'og:url', url);
  upsert('name', 'twitter:card', 'summary');
}

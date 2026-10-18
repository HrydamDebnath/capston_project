import { assetUrl, initials } from '../../utils/format.js';

const shapes = ['38% 62% 55% 45% / 45% 40% 60% 55%', '50%', '42% 58% 40% 60% / 55% 45% 55% 45%'];

export default function Avatar({ name, src, size = 48, shape = 0, className = '' }) {
  const radius = shapes[shape % shapes.length];
  const style = { width: size, height: size, borderRadius: radius, fontSize: size * 0.36 };
  if (src) return <img src={assetUrl(src)} alt={name} style={style} className={`shrink-0 object-cover ${className}`} />;
  return (
    <span style={style} className={`inline-flex shrink-0 items-center justify-center bg-brand-soft font-bold text-brand-dark ${className}`} aria-hidden="true">
      {initials(name)}
    </span>
  );
}

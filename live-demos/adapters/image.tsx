export default function Image({
  src,
  alt,
  fill,
  priority,
  quality,
  loader,
  placeholder,
  blurDataURL,
  unoptimized,
  ...props
}) {
  return (
    <img
      {...props}
      alt={alt || ''}
      src={typeof src === 'string' ? src : src?.src}
      style={{
        ...props.style,
        ...(fill
          ? { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }
          : {}),
      }}
    />
  );
}

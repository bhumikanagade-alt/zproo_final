import { useState } from "react";
import type { Post } from "./posts";

/**
 * Shows the HD photo at /assets/blog/<slug>.jpg (1600×1000 recommended) when it exists,
 * otherwise falls back to the smaller image set in posts.ts.
 */
export function BlogImage({ post, className, loading = "lazy" }: { post: Post; className?: string; loading?: "lazy" | "eager" }) {
  const [src, setSrc] = useState(`/assets/blog/${post.slug}.jpg`);
  return (
    <img
      src={src}
      alt={post.imageAlt}
      loading={loading}
      decoding="async"
      onError={() => src !== post.image && setSrc(post.image)}
      className={className}
    />
  );
}

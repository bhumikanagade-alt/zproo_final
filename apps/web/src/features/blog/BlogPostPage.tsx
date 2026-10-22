import { Link, useParams } from "react-router";
import { Seo } from "@/components/seo/Seo";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { BlogImage } from "./BlogImage";
import { POSTS, type Block } from "./posts";

const Body = ({ b }: { b: Block }) => {
  switch (b.t) {
    case "h":
      return (
        <h2 className="mt-10 flex items-center gap-3 text-2xl font-black tracking-tight">
          <span className="h-7 w-1.5 rounded-full bg-[#d91e2a]" />
          {b.text}
        </h2>
      );
    case "p":
      return <p className="mt-4 text-[17px] leading-8 text-gray-700">{b.text}</p>;
    case "list":
      return (
        <ul className="mt-5 grid gap-3">
          {b.items.map((t) => (
            <li key={t} className="flex items-start gap-3 rounded-2xl border border-red-100 bg-white p-4">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-50 text-sm font-black text-[#d91e2a]">✓</span>
              <span className="leading-7 text-gray-700">{t}</span>
            </li>
          ))}
        </ul>
      );
    case "tip":
      return (
        <div className="relative mt-8 overflow-hidden rounded-[1.35rem] border border-red-100 bg-gradient-to-br from-red-50 via-white to-white p-6">
          <div className="flex gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#d91e2a] text-lg font-black text-white">💡</span>
            <p className="pt-1 leading-7 text-gray-700"><strong className="text-[#171717]">Pro tip: </strong>{b.text}</p>
          </div>
        </div>
      );
  }
};

export default function BlogPostPage() {
  const { post: slug } = useParams();
  const post = POSTS.find((p) => p.slug === slug);
  if (!post) return <NotFoundPage />;
  const related = POSTS.filter((p) => p.slug !== post.slug && p.category === post.category)
    .concat(POSTS.filter((p) => p.slug !== post.slug && p.category !== post.category))
    .slice(0, 3);

  return (
    <main key={post.slug} className="bg-white text-[#171717]">
      <Seo title={post.title} description={post.excerpt} image={post.image} />
      <section className="relative isolate overflow-hidden border-b border-red-100 px-[7.8%] pb-10 pt-8">
        <div className="absolute -right-28 -top-28 -z-10 h-80 w-80 rounded-full bg-red-100/70 blur-3xl" />
        <div className="mx-auto max-w-[860px]">
          <Link to="/blog" className="group inline-flex items-center gap-2 text-sm font-semibold text-gray-500 transition hover:text-[#d91e2a]">
            <span className="transition-transform group-hover:-translate-x-1">←</span> All articles
          </Link>
          <span className="mt-8 inline-flex rounded-full border border-red-100 bg-red-50 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.18em] text-[#d91e2a]">{post.category}</span>
          <h1 className="mt-5 text-3xl font-black leading-[1.1] tracking-tight sm:text-5xl">{post.title}</h1>
          <p className="mt-4 text-lg leading-8 text-gray-600">{post.excerpt}</p>
          <p className="mt-5 text-sm font-semibold text-gray-500">{post.author} · {post.date} · {post.mins} min read</p>
        </div>
      </section>

      <div className="px-[7.8%] pt-10">
        <div className="mx-auto max-w-[860px] overflow-hidden rounded-[2rem] border border-red-100 shadow-[0_20px_50px_rgba(217,30,42,0.10)]">
          <BlogImage post={post} className="aspect-[16/9] w-full object-cover" />
        </div>
      </div>

      <article className="mx-auto max-w-[860px] px-[7.8%] pb-14 pt-6 md:px-0">
        {post.body.map((b, i) => <Body key={i} b={b} />)}
      </article>

      <section className="border-t border-red-100 bg-red-50/30 px-[7.8%] py-14">
        <div className="mx-auto max-w-[1160px]">
          <h2 className="text-2xl font-black">Keep reading</h2>
          <div className="mt-6 grid gap-5 md:grid-cols-3">
            {related.map((p) => (
              <Link key={p.slug} to={`/blog/${p.slug}`} className="group overflow-hidden rounded-[1.35rem] border border-red-100 bg-white transition hover:-translate-y-1 hover:shadow-[0_16px_35px_rgba(217,30,42,0.10)]">
                <BlogImage post={p} className="aspect-[16/10] w-full object-cover" />
                <div className="p-5">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#d91e2a]">{p.category}</span>
                  <h3 className="mt-2 font-extrabold leading-snug">{p.title}</h3>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

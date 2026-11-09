import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { motion as Motion } from "framer-motion";
import { createPublicBlogReader, staticBlogPost } from "./utils/publicBlog";
import { API_BASE_URL } from "./utils/api";
import { ArrowLeft } from "lucide-react";
import { CTA } from "./home/CTA";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
};

const staggerContainer = {
  initial: {},
  animate: { transition: { staggerChildren: 0.08 } },
};

const BlogDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [detail, setDetail] = useState({ id: "", status: "loading", post: null });
  const reader = useMemo(() => createPublicBlogReader({ client: axios, baseUrl: API_BASE_URL, onChange: setDetail }), []);
  useEffect(() => { void reader.load(id); return () => reader.cancel(); }, [reader, id]);
  const legacy = staticBlogPost(id);
  const result = detail.id === id ? detail : { status: "loading", post: null };
  const post = legacy || result.post;

  if (!post) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Motion.div
          className="text-center"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 role={result.status === "loading" ? "status" : undefined} className="text-2xl font-bold text-white mb-4">{result.status === "loading" ? "Loading article…" : result.status === "invalid" ? "Invalid article link" : result.status === "missing" ? "Post not found" : "Unable to load article"}</h1>
          {result.status === "error" && <div role="alert" className="mb-4 text-sm text-gray-400"><p>{result.error}</p><button type="button" onClick={() => reader.load(id)} className="mt-3 text-blue-500 hover:underline">Retry loading article</button></div>}
          <button
            onClick={() => navigate("/blog")}
            className="text-blue-500 hover:underline"
          >
            Back to Blog
          </button>
        </Motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0E0E10]">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Back button */}
        <Motion.button
          onClick={() => navigate("/blog")}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors text-sm"
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Blog
        </Motion.button>

        {/* Title */}
        <Motion.h1
          className="break-words text-3xl md:text-5xl lg:text-6xl font-bold text-white text-center mb-6 leading-tight"
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
        >
          {legacy?.id === "1" ? <>{post.title.replace(/Changing$/, "").trim()}{" "}<span className="text-[#E5A50A] italic">Changing</span></> : post.title}
        </Motion.h1>

        {/* Meta */}
        <Motion.div
          className="flex flex-wrap items-center justify-center gap-4 mb-10"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
        >
          <span className="min-w-0 max-w-full break-words px-3 py-1 bg-blue-500 text-white text-xs font-semibold rounded">
            {post.category}
          </span>
          <div className="flex min-w-0 items-center gap-2">
            {post.authorAvatar ? <img
              src={post.authorAvatar}
              alt={post.author}
              className="w-7 h-7 rounded-full object-cover"
            /> : <span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs text-gray-400">{post.author.slice(0, 1)}</span>}
            <span className="min-w-0 break-words text-gray-400 text-sm">{post.author}</span>
          </div>
          <span className="text-gray-500 text-sm">{post.date}</span>
        </Motion.div>

        {!legacy && <p className="mb-10 break-words text-gray-400 leading-relaxed">{post.excerpt}</p>}

        {/* Hero Image */}
        <Motion.div
          className="rounded-xl overflow-hidden mb-10"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1], delay: 0.25 }}
        >
          <img
            src={post.image}
            alt={post.title}
            className="w-full h-[300px] md:h-[450px] object-cover"
          />
        </Motion.div>

        {/* Content */}
        <Motion.article
          className="space-y-6"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {post.content.map((block, i) => {
            if (block.type === "heading") {
              return (
                <Motion.h2
                  key={i}
                  variants={fadeUp}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="break-words text-xl md:text-2xl font-bold text-white mt-8"
                >
                  {block.text}
                </Motion.h2>
              );
            }
            if (block.type === "quote") {
              return (
                <Motion.blockquote
                  key={i}
                  variants={fadeUp}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="break-words bg-[#1A1A1E] border border-white/5 rounded-xl p-6 italic text-white/90 my-8"
                >
                  " {block.text} "
                </Motion.blockquote>
              );
            }
            if (block.type === "image") {
              return (
                <Motion.div
                  key={i}
                  variants={fadeUp}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="rounded-xl overflow-hidden my-8"
                >
                  <img src={block.src} alt="" className="w-full object-cover" />
                </Motion.div>
              );
            }
            return (
              <Motion.p
                key={i}
                variants={fadeUp}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="break-words text-gray-400 leading-relaxed"
              >
                {block.text}
              </Motion.p>
            );
          })}
        </Motion.article>
      </div>
      <CTA />
    </div>
  );
};

export default BlogDetail;

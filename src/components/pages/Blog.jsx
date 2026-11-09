import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { motion as Motion } from "framer-motion";
import { combinedBlogPosts, createPublicBlogFeed } from "../utils/publicBlog";
import { API_BASE_URL } from "../utils/api";
import { CTA } from "../home/CTA";

const POSTS_PER_PAGE = 6;

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
};

const staggerContainer = {
  initial: {},
  animate: { transition: { staggerChildren: 0.1 } },
};

const Blog = () => {
  const navigate = useNavigate();
  const [visibleCount, setVisibleCount] = useState(POSTS_PER_PAGE);
  const [api, setApi] = useState({ posts: [], hasMore: true, status: "loading", error: "" });
  const feed = useMemo(() => createPublicBlogFeed({ client: axios, baseUrl: API_BASE_URL, onChange: setApi }), []);
  useEffect(() => { void feed.loadNext(); return () => feed.cancel(); }, [feed]);

  const [featuredPost, ...latestPosts] = combinedBlogPosts(api.posts);
  const visiblePosts = latestPosts.slice(0, visibleCount);
  const hasMore = (api.hasMore && api.status !== "error") || visibleCount < latestPosts.length;
  const loadMore = async () => {
    if (api.status === "loading") return;
    if (api.status === "error") { setVisibleCount(count => count + POSTS_PER_PAGE); return; }
    if (api.hasMore && visibleCount >= api.posts.length) {
      const loaded = await feed.loadNext();
      if (!loaded) return;
    }
    setVisibleCount(count => count + POSTS_PER_PAGE);
  };
  const retry = async () => { const loaded = await feed.loadNext(); if (loaded && api.posts.length) setVisibleCount(count => Math.max(count, api.posts.length + POSTS_PER_PAGE)); };

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto px-4 py-12 md:py-20">
        {/* Hero Header */}
        <Motion.div
          className="text-center mb-12 md:mb-16"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          <Motion.h1
            variants={fadeUp}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="text-4xl md:text-5xl lg:text-6xl text-white mb-4"
          >
            Insights for Job Seekers and <br />
            <span className="text-[#E5A50A]">Employers</span>
          </Motion.h1>
          <Motion.p
            variants={fadeUp}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="text-gray-400 text-sm md:text-base max-w-lg mx-auto"
          >
            Tips, trends, and stories to help you navigate your career, hiring,
            and the evolving job market.
          </Motion.p>
        </Motion.div>

        {/* Featured Post */}
        {featuredPost && <Motion.div
          onClick={() => navigate(`/blog/${featuredPost.id}`)}
          role="link" tabIndex={0} aria-label={`Read ${featuredPost.title}`}
          onKeyDown={event => { if (event.key === "Enter") navigate(`/blog/${featuredPost.id}`); }}
          className="relative rounded-xl overflow-hidden mb-12 md:mb-16 cursor-pointer group"
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
        >
          <img
            src={featuredPost.image}
            alt={featuredPost.title}
            className="w-full h-[300px] md:h-[420px] object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          <div className="absolute bottom-6 left-6 right-6">
            <span className="inline-block px-3 py-1 bg-blue-500 text-white text-xs font-semibold rounded mb-3">
              {featuredPost.category}
            </span>
            <h2 className="text-xl md:text-2xl font-bold text-white mb-3 max-w-xl">
              {featuredPost.title}
            </h2>
            <div className="flex items-center gap-3">
              <img
                src={featuredPost.authorAvatar}
                alt={featuredPost.author}
                className="w-8 h-8 rounded-full object-cover"
              />
              <span className="text-white/80 text-sm">
                {featuredPost.author}
              </span>
              <span className="text-white/50 text-sm">{featuredPost.date}</span>
            </div>
          </div>
        </Motion.div>}

        {/* Latest Posts */}
        <Motion.h2
          className="text-xl font-bold text-white mb-6"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          Latest Post
        </Motion.h2>

        {api.status === "loading" && <p role="status" className="mb-6 text-sm text-gray-400">Loading new articles…</p>}
        {api.status === "error" && <div role="alert" className="mb-6 text-sm text-gray-400"><p>{api.error} Existing articles remain available.</p><button type="button" onClick={retry} className="mt-3 text-blue-500 hover:underline">Retry loading articles</button></div>}
        {api.status === "ready" && api.posts.length === 0 && <p role="status" className="mb-6 text-sm text-gray-400">No new articles yet. Explore our existing articles below.</p>}
        {!featuredPost && !latestPosts.length && api.status === "ready" && <p role="status" className="mb-6 text-gray-400">No articles available yet.</p>}
        <div aria-label="Blog articles" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
          {visiblePosts.map((post, index) => (
            <Motion.div
              key={post.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.1 }}
              transition={{
                duration: 0.5,
                ease: [0.16, 1, 0.3, 1],
                delay: (index % POSTS_PER_PAGE) * 0.08,
              }}
              onClick={() => navigate(`/blog/${post.id}`)}
              role="link" tabIndex={0} aria-label={`Read ${post.title}`}
              onKeyDown={event => { if (event.key === "Enter") navigate(`/blog/${post.id}`); }}
              className="bg-[#1A1A1E] border border-white/5 rounded-xl overflow-hidden cursor-pointer group hover:border-blue-500/40 transition-colors"
            >
              <div className="overflow-hidden">
                <img
                  src={post.image}
                  alt={post.title}
                  className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="p-5">
                <span className="inline-block max-w-full break-words px-3 py-1 bg-blue-500/20 text-blue-500 text-xs font-semibold rounded mb-3">
                  {post.category}
                </span>
                <h3 className="break-words text-white font-semibold mb-3 leading-snug">
                  {post.title}
                </h3>
                <div className="flex flex-wrap items-center gap-3">
                  {post.authorAvatar ? <img
                    src={post.authorAvatar}
                    alt={post.author}
                    className="w-7 h-7 rounded-full object-cover"
                  /> : <span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs text-gray-400">{post.author.slice(0, 1)}</span>}
                  <span className="min-w-0 break-words text-gray-400 text-xs">{post.author}</span>
                  <span className="text-gray-500 text-xs">{post.date}</span>
                </div>
              </div>
            </Motion.div>
          ))}
        </div>

        {/* Load More */}
        {hasMore && (
          <Motion.div
            className="flex justify-center"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
          >
            <button
              type="button" disabled={api.status === "loading"} onClick={loadMore}
              className="px-8 py-3 border border-white text-white rounded-full hover:bg-[#1A1A1E] transition-colors text-sm font-medium"
            >
              Load more
            </button>
          </Motion.div>
        )}
      </div>
      <CTA />
    </div>
  );
};

export default Blog;

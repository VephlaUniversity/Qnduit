import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { blogPosts } from "../data/blogPosts";
import { CTA } from "../home/CTA";

const POSTS_PER_PAGE = 6;

const Blog = () => {
  const navigate = useNavigate();
  const [visibleCount, setVisibleCount] = useState(POSTS_PER_PAGE);

  const featuredPost = blogPosts[0];
  const latestPosts = blogPosts.slice(1);
  const visiblePosts = latestPosts.slice(0, visibleCount);
  const hasMore = visibleCount < latestPosts.length;

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto px-4 py-12 md:py-20">
        {/* Hero Header */}
        <div className="text-center mb-12 md:mb-16">
          <h1 className="text-4xl md:text-5xl lg:text-6xl text-white mb-4">
            Insights for Job Seekers and <br />
            <span className="text-[#E5A50A] ">Employers</span>
          </h1>
          <p className="text-gray-400 text-sm md:text-base max-w-lg mx-auto">
            Tips, trends, and stories to help you navigate your career, hiring,
            and the evolving job market.
          </p>
        </div>

        {/* Featured Post */}
        <div
          onClick={() => navigate(`/blog/${featuredPost.id}`)}
          className="relative rounded-xl overflow-hidden mb-12 md:mb-16 cursor-pointer group"
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
        </div>

        {/* Latest Posts */}
        <h2 className="text-xl font-bold text-white mb-6">Latest Post</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
          {visiblePosts.map((post) => (
            <div
              key={post.id}
              onClick={() => navigate(`/blog/${post.id}`)}
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
                <span className="inline-block px-3 py-1 bg-blue-500/20 text-blue-500 text-xs font-semibold rounded mb-3">
                  {post.category}
                </span>
                <h3 className="text-white font-semibold mb-3 leading-snug">
                  {post.title}
                </h3>
                <div className="flex items-center gap-3">
                  <img
                    src={post.authorAvatar}
                    alt={post.author}
                    className="w-7 h-7 rounded-full object-cover"
                  />
                  <span className="text-gray-400 text-xs">{post.author}</span>
                  <span className="text-gray-500 text-xs">{post.date}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Load More */}
        {hasMore && (
          <div className="flex justify-center">
            <button
              onClick={() => setVisibleCount((c) => c + POSTS_PER_PAGE)}
              className="px-8 py-3 border border-white text-white rounded-full hover:bg-[#1A1A1E] transition-colors text-sm font-medium"
            >
              Load more
            </button>
          </div>
        )}
      </div>
      <CTA />
    </div>
  );
};

export default Blog;

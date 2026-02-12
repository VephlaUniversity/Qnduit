import { useParams, useNavigate } from "react-router-dom";
import { blogPosts } from "./data/blogPosts";
import { ArrowLeft } from "lucide-react";
import { CTA } from "./home/CTA";

const BlogDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const post = blogPosts.find((p) => p.id === id);

  if (!post) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Post not found</h1>
          <button
            onClick={() => navigate("/blog")}
            className="text-blue-500 hover:underline"
          >
            Back to Blog
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0E0E10]">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Back button */}
        <button
          onClick={() => navigate("/blog")}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Blog
        </button>

        {/* Title */}
        <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white text-center mb-6 leading-tight">
          {post.title.replace("Changing", "").trim()}{" "}
          <span className="text-[#E5A50A] italic">Changing</span>
        </h1>

        {/* Meta */}
        <div className="flex items-center justify-center gap-4 mb-10">
          <span className="px-3 py-1 bg-blue-500 text-white text-xs font-semibold rounded">
            {post.category}
          </span>
          <div className="flex items-center gap-2">
            <img
              src={post.authorAvatar}
              alt={post.author}
              className="w-7 h-7 rounded-full object-cover"
            />
            <span className="text-gray-400 text-sm">{post.author}</span>
          </div>
          <span className="text-gray-500 text-sm">{post.date}</span>
        </div>

        {/* Hero Image */}
        <div className="rounded-xl overflow-hidden mb-10">
          <img
            src={post.image}
            alt={post.title}
            className="w-full h-[300px] md:h-[450px] object-cover"
          />
        </div>

        {/* Content */}
        <article className="space-y-6">
          {post.content.map((block, i) => {
            if (block.type === "heading") {
              return (
                <h2
                  key={i}
                  className="text-xl md:text-2xl font-bold text-white mt-8"
                >
                  {block.text}
                </h2>
              );
            }
            if (block.type === "quote") {
              return (
                <blockquote
                  key={i}
                  className="bg-[#1A1A1E] border border-white/5 rounded-xl p-6 italic text-white/90 my-8"
                >
                  " {block.text} "
                </blockquote>
              );
            }
            if (block.type === "image") {
              return (
                <div key={i} className="rounded-xl overflow-hidden my-8">
                  <img src={block.src} alt="" className="w-full object-cover" />
                </div>
              );
            }
            return (
              <p key={i} className="text-gray-400 leading-relaxed">
                {block.text}
              </p>
            );
          })}
        </article>
      </div>
      <CTA />
    </div>
  );
};

export default BlogDetail;

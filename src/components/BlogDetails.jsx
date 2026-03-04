import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { blogPosts } from "./data/blogPosts";
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
  const post = blogPosts.find((p) => p.id === id);

  if (!post) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-2xl font-bold text-white mb-4">Post not found</h1>
          <button
            onClick={() => navigate("/blog")}
            className="text-blue-500 hover:underline"
          >
            Back to Blog
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0E0E10]">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Back button */}
        <motion.button
          onClick={() => navigate("/blog")}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors text-sm"
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Blog
        </motion.button>

        {/* Title */}
        <motion.h1
          className="text-3xl md:text-5xl lg:text-6xl font-bold text-white text-center mb-6 leading-tight"
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
        >
          {post.title.replace("Changing", "").trim()}{" "}
          <span className="text-[#E5A50A] italic">Changing</span>
        </motion.h1>

        {/* Meta */}
        <motion.div
          className="flex items-center justify-center gap-4 mb-10"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
        >
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
        </motion.div>

        {/* Hero Image */}
        <motion.div
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
        </motion.div>

        {/* Content */}
        <motion.article
          className="space-y-6"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {post.content.map((block, i) => {
            if (block.type === "heading") {
              return (
                <motion.h2
                  key={i}
                  variants={fadeUp}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="text-xl md:text-2xl font-bold text-white mt-8"
                >
                  {block.text}
                </motion.h2>
              );
            }
            if (block.type === "quote") {
              return (
                <motion.blockquote
                  key={i}
                  variants={fadeUp}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="bg-[#1A1A1E] border border-white/5 rounded-xl p-6 italic text-white/90 my-8"
                >
                  " {block.text} "
                </motion.blockquote>
              );
            }
            if (block.type === "image") {
              return (
                <motion.div
                  key={i}
                  variants={fadeUp}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="rounded-xl overflow-hidden my-8"
                >
                  <img src={block.src} alt="" className="w-full object-cover" />
                </motion.div>
              );
            }
            return (
              <motion.p
                key={i}
                variants={fadeUp}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="text-gray-400 leading-relaxed"
              >
                {block.text}
              </motion.p>
            );
          })}
        </motion.article>
      </div>
      <CTA />
    </div>
  );
};

export default BlogDetail;

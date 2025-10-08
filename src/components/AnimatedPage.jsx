import { motion } from "framer-motion";

export const AnimatedPage = ({ children }) => {
  return (
    <motion.div
      initial={{
        opacity: 0,
        scale: 0.8,
        filter: "blur(20px)",
      }}
      animate={{
        opacity: 1,
        scale: 1,
        filter: "blur(0px)",
      }}
      exit={{
        opacity: 0,
        scale: 1.2,
        filter: "blur(20px)",
      }}
      transition={{
        duration: 0.7,
        ease: [0.16, 1, 0.3, 1],
        scale: {
          type: "spring",
          damping: 20,
          stiffness: 100,
        },
      }}
      className="w-full h-full"
    >
      {children}
    </motion.div>
  );
};

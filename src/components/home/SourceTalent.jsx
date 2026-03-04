import { motion } from "framer-motion";
import { SourceTalentForm } from "./SourceTalentForm";

export const SourceTalent = () => {
  return (
    <div
      id="source-talents"
      className="min-h-screen items-center justify-center p-4"
    >
      <div>
        <motion.h2
          className="text-4xl lg:text-5xl text-center mb-12 text-white"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          Do you have an open role?
          <br /> Post now and Hire
        </motion.h2>
        <SourceTalentForm />
      </div>
    </div>
  );
};

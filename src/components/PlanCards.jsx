import { motion } from "framer-motion";

const springTransition = {
  type: "spring",
  stiffness: 100,
  damping: 18,
  mass: 0.8,
};

const smoothEase = [0.16, 1, 0.3, 1];

export const PlanCard = ({
  planType,
  title,
  description,
  price,
  icon,
  features = [],
  ctaText,
  isSelected,
  onSelect,
  onCTAClick,
  variant = "default",
  disableWhenNotSelected = true,
}) => {
  const getBackground = () => {
    if (variant === "highlighted") {
      return isSelected ? "#1a2942" : "#182232";
    }
    return "#2A2A2A";
  };

  const getIconColor = () => {
    if (variant === "highlighted") return "text-blue-400";
    return "text-gray-400";
  };

  const getTextColor = () => {
    if (variant === "highlighted") return "text-gray-300";
    return "text-gray-400";
  };

  const getFeatureTextColor = () => {
    if (variant === "highlighted") return "text-gray-200";
    return "text-gray-300";
  };

  const getButtonClasses = () => {
    const baseClasses =
      "w-full py-4 rounded-full font-semibold transition-all duration-300 cursor-pointer border border-[#5F8DD7]";

    if (variant === "highlighted") {
      return `${baseClasses} ${
        isSelected
          ? "bg-[#09111F] text-white hover:bg-[#0d1a2e]"
          : "bg-[#09111F] text-white hover:bg-[#071326]"
      }`;
    }

    return `${baseClasses} ${
      isSelected
        ? "bg-[#313131] text-white hover:bg-[#3a3a3a]"
        : "text-gray-100 hover:bg-[#313131] hover:text-white disabled:opacity-50"
    }`;
  };

  const handleCardClick = () => {
    if (onSelect) onSelect(planType);
  };

  const handleButtonClick = (e) => {
    e.stopPropagation();
    if (onCTAClick) onCTAClick(planType);
  };

  return (
    <motion.div
      onClick={handleCardClick}
      initial={{ opacity: 0, y: 40, scale: 0.97 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.7, ease: smoothEase }}
      whileHover={{
        y: -4,
        boxShadow: isSelected
          ? "0 20px 60px -12px rgba(59, 130, 246, 0.25)"
          : "0 20px 60px -12px rgba(0, 0, 0, 0.4)",
        transition: { duration: 0.3, ease: "easeOut" },
      }}
      animate={{
        boxShadow: isSelected
          ? "0 8px 32px -8px rgba(59, 130, 246, 0.2)"
          : "0 4px 24px -8px rgba(0, 0, 0, 0.2)",
      }}
      className={`rounded-3xl p-8 cursor-pointer transition-colors duration-300 ${
        isSelected ? "ring-2 ring-blue-500" : "hover:ring-1 hover:ring-blue-400"
      }`}
      style={{ background: getBackground() }}
    >
      {/* Icon and Title */}
      <div className="flex items-center mb-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.6, rotate: -10 }}
          whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
          viewport={{ once: true }}
          transition={{ ...springTransition, delay: 0.1 }}
          className={`w-8 h-8 ${getIconColor()} mr-3`}
        >
          {icon}
        </motion.div>
        <motion.h3
          initial={{ opacity: 0, x: -12 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: smoothEase, delay: 0.15 }}
          className="text-2xl font-bold text-white"
        >
          {title}
        </motion.h3>
      </div>

      {/* Description */}
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease: smoothEase, delay: 0.2 }}
        className={`${getTextColor()} mb-6`}
      >
        {description}
      </motion.p>

      {/* Price */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease: smoothEase, delay: 0.25 }}
        className="mb-8"
      >
        <span className="text-5xl font-bold text-white">
          ${price.toFixed(2)}
        </span>
        <span className={`${getTextColor()} ml-2`}>/month</span>
      </motion.div>

      {/* Features List */}
      <div className="space-y-4 mb-8">
        {features.map((feature, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{
              duration: 0.45,
              ease: smoothEase,
              delay: 0.3 + index * 0.06,
            }}
            className="flex items-center"
          >
            <motion.svg
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              transition={{
                type: "spring",
                stiffness: 200,
                damping: 12,
                delay: 0.35 + index * 0.06,
              }}
              className="w-5 h-5 text-green-400 mr-3 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </motion.svg>
            <span className={getFeatureTextColor()}>{feature}</span>
          </motion.div>
        ))}
      </div>

      {/* CTA Button */}
      <motion.button
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{
          duration: 0.5,
          ease: smoothEase,
          delay: 0.35 + features.length * 0.06,
        }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleButtonClick}
        disabled={disableWhenNotSelected && !isSelected}
        className={getButtonClasses()}
      >
        {ctaText}
      </motion.button>
    </motion.div>
  );
};

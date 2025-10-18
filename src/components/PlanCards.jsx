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

  // Button styling
  const getButtonClasses = () => {
    const baseClasses =
      "w-full py-4 rounded-full font-semibold transition-all duration-200 cursor-pointer border border-[#5F8DD7]";

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
    if (onSelect) {
      onSelect(planType);
    }
  };

  const handleButtonClick = (e) => {
    e.stopPropagation();
    if (onCTAClick) {
      onCTAClick(planType);
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className={`rounded-3xl p-8 transition-all cursor-pointer ${
        isSelected ? "ring-2 ring-blue-500" : "hover:ring-1 hover:ring-blue-400"
      }`}
      style={{
        background: getBackground(),
      }}
    >
      {/* Icon and Title */}
      <div className="flex items-center mb-4">
        <div className={`w-8 h-8 ${getIconColor()} mr-3`}>{icon}</div>
        <h3 className="text-2xl font-bold text-white">{title}</h3>
      </div>

      {/* Description */}
      <p className={`${getTextColor()} mb-6`}>{description}</p>

      {/* Price */}
      <div className="mb-8">
        <span className="text-5xl font-bold text-white">
          ${price.toFixed(2)}
        </span>
        <span className={`${getTextColor()} ml-2`}>/month</span>
      </div>

      {/* Features List */}
      <div className="space-y-4 mb-8">
        {features.map((feature, index) => (
          <div key={index} className="flex items-center">
            <svg
              className="w-5 h-5 text-green-400 mr-3 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            <span className={getFeatureTextColor()}>{feature}</span>
          </div>
        ))}
      </div>

      {/* CTA Button */}
      <button
        onClick={handleButtonClick}
        disabled={disableWhenNotSelected && !isSelected}
        className={getButtonClasses()}
      >
        {ctaText}
      </button>
    </div>
  );
};

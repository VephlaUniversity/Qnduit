import { useState, useEffect, useRef } from "react";

export const WhyDifferent = () => {
  const stats = [
    {
      number: 1200,
      suffix: "+",
      label: "Projects Completed",
      description:
        "Real work, real results, from branding to design, delivered by top creatives.",
    },
    {
      number: 97,
      suffix: "%",
      label: "Client Satisfaction",
      description:
        "Clients rate their project outcomes as excellent, praising talents quality.",
    },
    {
      number: 15000,
      suffix: "+",
      label: "Active Creatives",
      description:
        "A thriving network of techies, designers, and developers from around the world.",
    },
    {
      number: 2500,
      suffix: "+",
      label: "Success Stories",
      description:
        "Projects that began on Qnduit have gone on to win awards, scaling globally.",
    },
  ];

  const features = [
    {
      image: "/images/first.png",
      title: "Stay discoverable 24/7",
      description:
        "Every post and listing gets seen, with the right talent connecting faster.",
    },
    {
      image: "/images/middle.png",
      title: "High Client Satisfaction",
      description:
        "97% of Qnduit talents, and employers rate hiring outcomes excellent",
    },
    {
      image: "/images/third.png",
      title: "Maximized for Speed",
      description:
        "Post a job or find that right talent you need in minutes, not hours.",
    },
  ];

  return (
    <section className="max-w-7xl mx-auto px-6 lg:px-8 py-20">
      <div className="text-center mb-16">
        <p className="text-lg text-gray-300 mb-8">
          The most affordable career move you'll make all
          <br />
          year.
          <span className="text-yellow-400">
            Boost your profile for just $1.99/month.
          </span>
        </p>
        <button className="border border-gray-600 text-white px-8 py-3 rounded-full hover:bg-gray-800 transition-colors">
          Boost profile for $1.99 →
        </button>
      </div>

      <h2 className="text-4xl lg:text-5xl text-center mb-16">
        Why Qnduit is Different
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
        {features.map((feature, index) => (
          <div
            key={index}
            className="bg-gray-800 rounded-2xl p-8 w-[300px] sm:w-[410px] mx-auto md:w-full"
          >
            <div className="mb-6">
              <div className="w- full h-full rounded-2xl mb-4 overflow-hidden">
                <img
                  src={feature.image}
                  alt={feature.title}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <h3 className="text-2xl font-semibold mb-4">{feature.title}</h3>
            <p className="text-gray-400">{feature.description}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {stats.map((stat, index) => (
          <StatCard key={index} stat={stat} index={index} />
        ))}
      </div>
    </section>
  );
};

const StatCard = ({ stat }) => {
  const [count, setCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    const currentRef = cardRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    const duration = 2000; // 2 seconds
    const steps = 60;
    const increment = stat.number / steps;
    const stepDuration = duration / steps;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      if (currentStep <= steps) {
        setCount(Math.floor(increment * currentStep));
      } else {
        setCount(stat.number);
        clearInterval(timer);
      }
    }, stepDuration);

    return () => clearInterval(timer);
  }, [isVisible, stat.number]);

  const formatNumber = (num) => {
    if (num >= 1000) {
      const thousands = Math.floor(num / 1000);
      const remainder = num % 1000;
      if (remainder === 0) {
        return thousands + ",000";
      }
      return thousands + "," + remainder.toString().padStart(3, "0");
    }
    return num.toString();
  };

  return (
    <div ref={cardRef} className="text-center">
      <div className="text-4xl lg:text-5xl font-bold text-yellow-400 mb-2">
        {formatNumber(count)}
        {stat.suffix}
      </div>
      <div className="text-xl font-semibold mb-2">{stat.label}</div>
      <p className="text-gray-400 text-sm">{stat.description}</p>
    </div>
  );
};

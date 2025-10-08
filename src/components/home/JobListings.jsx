export const JobListings = () => {
  const jobListings = [
    {
      company: "DaVinci Resolve",
      title: "Creative Product Designer",
      location: "Asana • Hybrid / Remote • Spain",
      salary: "$65,000/annual",
      description:
        "We're looking for a creative Product Designer to join our design team. You'll be responsible for crafting user-centric experiences, from re...",
      logo: "/images/Asana.png",
    },
    {
      company: "Evernote",
      title: "Creative Product Designer",
      location: "Asana • Hybrid / Remote • Spain",
      salary: "$65,000/annual",
      description:
        "We're looking for a creative Product Designer to join our design team. You'll be responsible for crafting user-centric experiences, from re...",
      logo: "/images/Evernote.png",
    },
    {
      company: "3D Tool",
      title: "Creative Product Designer",
      location: "Asana • Hybrid / Remote • Spain",
      salary: "$65,000/annual",
      description:
        "We're looking for a creative Product Designer to join our design team. You'll be responsible for crafting user-centric experiences, from re...",
      logo: "/images/Linear.png",
    },
    {
      company: "Figma",
      title: "Creative Product Designer",
      location: "Asana • Hybrid / Remote • Spain",
      salary: "$65,000/annual",
      description:
        "We're looking for a creative Product Designer to join our design team. You'll be responsible for crafting user-centric experiences, from re...",
      logo: "/images/Slack.png",
    },
    {
      company: "Loading",
      title: "Creative Product Designer",
      location: "Asana • Hybrid / Remote • Spain",
      salary: "$65,000/annual",
      description:
        "We're looking for a creative Product Designer to join our design team. You'll be responsible for crafting user-centric experiences, from re...",
      logo: "/images/Loom.png",
    },
    {
      company: "Monday",
      title: "Creative Product Designer",
      location: "Asana • Hybrid / Remote • Spain",
      salary: "$65,000/annual",
      description:
        "We're looking for a creative Product Designer to join our design team. You'll be responsible for crafting user-centric experiences, from re...",
      logo: "/images/Monday.png",
    },
  ];

  return (
    <section className="max-w-7xl mx-auto px-6 lg:px-12 py-10 bg-[#0A0F17] rounded-3xl mt-10">
      <h2 className="text-4xl lg:text-5xl  text-center mb-12">
        Latest Jobs of the Week
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {jobListings.map((job, index) => (
          <div
            key={index}
            className="bg-gray-800 rounded-2xl p-6 hover:bg-gray-750 transition-colors"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <img src={job.logo} alt="logo" />
              </div>
            </div>

            <h3 className="text-xl font-semibold mb-2">{job.title}</h3>
            <p className="text-gray-400 text-sm mb-4">{job.location}</p>
            <p className="text-gray-300 text-sm mb-6">{job.description}</p>

            <div className="flex justify-between flex-col md:flex-row gap-4 items-start md:items-center">
              <span className="text-2xl">{job.salary}</span>
              <button className="bg-blue-500 text-white px-4  py-2 rounded-lg hover:bg-blue-600 transition-colors">
                Apply Now →
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="text-center">
        <button className="border border-gray-600 text-white px-8 py-3 rounded-full hover:bg-gray-800 transition-colors">
          Show all Jobs →
        </button>
      </div>
    </section>
  );
};

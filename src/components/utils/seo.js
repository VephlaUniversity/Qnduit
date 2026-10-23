import { useEffect } from "react";

const stripHtml = (html) =>
  String(html || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const shortText = (html, max = 155) => {
  const text = stripHtml(html);
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
};

const EMPLOYMENT_TYPES = {
  "full time": "FULL_TIME",
  "part time": "PART_TIME",
  contract: "CONTRACTOR",
  temporary: "TEMPORARY",
  internship: "INTERN",
  freelancer: "CONTRACTOR",
};

const SALARY_UNITS = {
  hour: "HOUR",
  day: "DAY",
  week: "WEEK",
  month: "MONTH",
  year: "YEAR",
};

const validDate = (value) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
};

// schema.org JobPosting data, which search engines use for job listings.
export function buildJobPostingLd(job, url) {
  if (!job) return null;
  const posted = validDate(job.createdAt);
  const until = validDate(job.deadlineDate);
  const types = (
    Array.isArray(job.jobApplyType) ? job.jobApplyType : [job.jobApplyType]
  )
    .filter(Boolean)
    .map(
      (type) => EMPLOYMENT_TYPES[String(type).toLowerCase().replace(/-/g, " ")],
    )
    .filter(Boolean);

  const ld = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.jobTitle,
    description: job.jobDescription || job.jobTitle,
    url,
    hiringOrganization: {
      "@type": "Organization",
      name: job.employer?.companyName || "Employer on QNDUIT",
    },
  };
  if (posted) ld.datePosted = posted.toISOString().slice(0, 10);
  if (until) ld.validThrough = until.toISOString();
  if (types.length) ld.employmentType = types.length === 1 ? types[0] : types;
  if (job.employer?.companyWebsite)
    ld.hiringOrganization.sameAs = job.employer.companyWebsite;
  if (job.employer?.logo?.url)
    ld.hiringOrganization.logo = job.employer.logo.url;
  if (job.location)
    ld.jobLocation = {
      "@type": "Place",
      address: { "@type": "PostalAddress", addressLocality: job.location },
    };
  if (job.workType === "Remote") ld.jobLocationType = "TELECOMMUTE";

  const unit = SALARY_UNITS[String(job.salary?.type || "").toLowerCase()];
  const min = Number(job.salary?.min);
  const max = Number(job.salary?.max);
  if (unit && (Number.isFinite(min) || Number.isFinite(max))) {
    const value = { "@type": "QuantitativeValue", unitText: unit };
    if (Number.isFinite(min) && job.salary?.min != null) value.minValue = min;
    if (Number.isFinite(max) && job.salary?.max != null) value.maxValue = max;
    // Salaries are shown in dollars on the site.
    ld.baseSalary = { "@type": "MonetaryAmount", currency: "USD", value };
  }
  return ld;
}

// Sets the page title, description, canonical link, social-share tags and
// (optionally) structured data while the page is shown, then puts everything back.
export function useDocumentSeo({ title, description, canonical, jsonLd }) {
  const ldText = jsonLd ? JSON.stringify(jsonLd) : "";

  useEffect(() => {
    if (!title) return undefined;
    const undo = [];

    const previousTitle = document.title;
    document.title = title;
    undo.push(() => {
      document.title = previousTitle;
    });

    const setTag = (selector, create, attribute, value) => {
      if (!value) return;
      let element = document.head.querySelector(selector);
      let created = false;
      if (!element) {
        element = create();
        document.head.appendChild(element);
        created = true;
      }
      const previous = element.getAttribute(attribute);
      element.setAttribute(attribute, value);
      undo.push(() => {
        if (created) element.remove();
        else if (previous === null) element.removeAttribute(attribute);
        else element.setAttribute(attribute, previous);
      });
    };
    const meta =
      (key, value, kind = "name") =>
      () => {
        const element = document.createElement("meta");
        element.setAttribute(kind, key);
        return element;
      };

    setTag(
      'meta[name="description"]',
      meta("description"),
      "content",
      description,
    );
    setTag(
      'meta[property="og:title"]',
      meta("og:title", "", "property"),
      "content",
      title,
    );
    setTag(
      'meta[property="og:description"]',
      meta("og:description", "", "property"),
      "content",
      description,
    );
    setTag(
      'meta[property="og:type"]',
      meta("og:type", "", "property"),
      "content",
      "website",
    );
    if (canonical) {
      setTag(
        'meta[property="og:url"]',
        meta("og:url", "", "property"),
        "content",
        canonical,
      );
      setTag(
        'link[rel="canonical"]',
        () => {
          const element = document.createElement("link");
          element.setAttribute("rel", "canonical");
          return element;
        },
        "href",
        canonical,
      );
    }

    if (ldText) {
      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.text = ldText;
      document.head.appendChild(script);
      undo.push(() => script.remove());
    }

    return () => undo.reverse().forEach((fn) => fn());
  }, [title, description, canonical, ldText]);
}

/**
 * Cross-Platform Deep Job Search Links Generator
 * Constructs targeted queries to major job platforms (LinkedIn, Naukri, Indeed)
 * using the job title, company, or target tech role and city.
 */

export interface ExternalSearchLinks {
  linkedInUrl: string;
  naukriUrl: string;
  indeedUrl: string;
  googleJobsUrl: string;
}

export function buildExternalJobSearchLinks(title: string, city?: string | null): ExternalSearchLinks {
  const cleanTitle = encodeURIComponent(title.trim());
  const cleanCity = encodeURIComponent((city && city !== "All India" ? city : "India").trim());

  return {
    linkedInUrl: `https://www.linkedin.com/jobs/search/?keywords=${cleanTitle}&location=${cleanCity}`,
    naukriUrl: `https://www.naukri.com/${cleanTitle.toLowerCase().replace(/%20|\s+/g, "-")}-jobs-in-${cleanCity.toLowerCase().replace(/%20|\s+/g, "-")}`,
    indeedUrl: `https://in.indeed.com/jobs?q=${cleanTitle}&l=${cleanCity}`,
    googleJobsUrl: `https://www.google.com/search?q=${cleanTitle}+jobs+in+${cleanCity}&ibp=htl;jobs`,
  };
}

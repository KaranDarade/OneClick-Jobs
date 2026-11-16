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

export function buildExternalJobSearchLinks(title: string, city?: string | null, isFresher = false): ExternalSearchLinks {
  const cleanTitle = encodeURIComponent(title.trim());
  const cleanCity = encodeURIComponent((city && city !== "All India" ? city : "India").trim());
  const fresherSuffix = isFresher ? "%20fresher%20entry%20level" : "";

  return {
    // LinkedIn: Filtered to past 24 hours (f_TPR=r86400) and direct apply / easy apply (f_LF=f_AL)
    linkedInUrl: `https://www.linkedin.com/jobs/search/?keywords=${cleanTitle}${fresherSuffix}&location=${cleanCity}&f_TPR=r86400&f_AL=true`,
    // Naukri: Filtered directly to tech openings with direct employer applications
    naukriUrl: `https://www.naukri.com/${cleanTitle.toLowerCase().replace(/%20|\s+/g, "-")}-jobs-in-${cleanCity.toLowerCase().replace(/%20|\s+/g, "-")}${isFresher ? "?experience=0" : ""}`,
    // Indeed: Filtered to past 24 hours (fromage=1) and direct apply (directapply=1)
    indeedUrl: `https://in.indeed.com/jobs?q=${cleanTitle}${fresherSuffix}&l=${cleanCity}&fromage=1&directapply=1`,
    // Google Jobs: Deep direct link for direct application portal
    googleJobsUrl: `https://www.google.com/search?q=${cleanTitle}+${cleanCity}+jobs+direct+apply&ibp=htl;jobs`,
  };
}

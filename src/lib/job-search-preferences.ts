export interface JobSearchCity {
  id: string;
  name: string;
  jobArea: string;
}

export const DEFAULT_SEARCH_CITIES: JobSearchCity[] = [
  { id: "shenzhen", name: "深圳", jobArea: "040000" },
  { id: "huizhou", name: "惠州", jobArea: "030300" },
  { id: "zhuhai", name: "珠海", jobArea: "030500" },
];

export function createSearchCity(name: string, jobArea: string, id?: string): JobSearchCity {
  return {
    id: id ?? name.trim().toLowerCase().replace(/\s+/g, "-") + "-" + jobArea.trim(),
    name: name.trim(),
    jobArea: jobArea.trim(),
  };
}

/**
 * True when a job is in one of the user's selected cities.
 * Location matching is intentionally strict: unknown or unrelated cities
 * should not leak into city-specific recommendations. Remote jobs remain
 * eligible because they are not tied to a single office city.
 */
export function isJobInSelectedCities(
  location: string | undefined,
  selectedCities: JobSearchCity[],
  workMode?: string,
): boolean {
  if (!location || !selectedCities.length) return false;
  if (workMode === "remote" || /远程|居家办公|全国可远程|remote/i.test(location)) return true;

  const normalize = (value: string) =>
    value
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/[·•,，、/|_-]/g, "");

  const normalizedLocation = normalize(location);
  return selectedCities.some(({ name }) => {
    const city = normalize(name).replace(/市$/, "");
    if (!city) return false;
    return normalizedLocation.includes(city) ||
      normalizedLocation.includes(city + "市");
  });
}


/** Resolve built-in city names to their known 51Job area codes.
 * Cloud saves created during earlier UI iterations may contain a label instead
 * of a source code, so never send that label as the jobArea query parameter.
 */
export function canonical51JobArea(city: JobSearchCity): string {
  const name = city.name.replace(/市$/, "").trim();
  const known: Record<string, string> = {
    深圳: "040000",
    惠州: "030300",
    珠海: "030500",
  };
  return known[name] ?? city.jobArea.trim();
}

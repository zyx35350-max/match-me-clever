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
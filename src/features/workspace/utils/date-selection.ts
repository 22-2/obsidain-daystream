import type { Moment } from "moment";
import type { Granularity } from "src/core/domain/granularity";

export interface DateSelection {
  year: number | null;
  month: number | null;
  day: number | null;
}

export function getDateSelection(date: Moment, granularity: Granularity): DateSelection {
  return {
    year: date.year(),
    month: granularity === "year" ? null : date.month() + 1,
    day: granularity === "day" ? date.date() : null,
  };
}

export function matchesDateSelection(date: Moment, selection: DateSelection): boolean {
  return (
    (selection.year === null || date.year() === selection.year) &&
    (selection.month === null || date.month() + 1 === selection.month) &&
    (selection.day === null || date.date() === selection.day)
  );
}

import { describe, expect, it } from "vitest";
import {
	combineDateParts,
	dateToNumberString,
	formatDate,
	isValidDateNumberString,
	numberStringToDate,
	parseDate,
	validateDateString,
} from "@/data/utils/dateUtils";

describe("parseDate", () => {
	it("returns null for null input", () => {
		expect(parseDate(null)).toBeNull();
	});

	it("parses an ISO date string", () => {
		const d = parseDate("2026-04-10");
		expect(d).toBeInstanceOf(Date);
		expect((d as Date).toISOString().slice(0, 10)).toBe("2026-04-10");
	});
});

describe("formatDate", () => {
	it("returns an empty string for null/undefined", () => {
		expect(formatDate(null)).toBe("");
		expect(formatDate(undefined)).toBe("");
	});

	it("formats a Date in dd/MMM/yyyy shape", () => {
		const d = new Date(2026, 3, 10); // April 10, 2026 local
		expect(formatDate(d)).toMatch(/^\d{2}\/[A-Za-z]{3}\/\d{4}$/);
	});
});

describe("validateDateString", () => {
	it("accepts a valid date tuple", () => {
		expect(validateDateString(2026, 3, 10)).toBe(true);
	});

	it("rejects null components", () => {
		expect(validateDateString(null as unknown as number, 3, 10)).toBe(false);
	});
});

describe("combineDateParts", () => {
	it("builds a Date from year/month/day", () => {
		const d = combineDateParts(2026, 3, 10);
		expect(d.getFullYear()).toBe(2026);
		expect(d.getMonth()).toBe(3);
		expect(d.getDate()).toBe(10);
	});
});

describe("isValidDateNumberString", () => {
	it("accepts a valid ddMMyyyy string", () => {
		expect(isValidDateNumberString("10042026")).toBe(true);
	});

	it("rejects non-8-digit input", () => {
		expect(isValidDateNumberString("2026-04-10")).toBe(false);
		expect(isValidDateNumberString("1042026")).toBe(false);
	});

	it("rejects impossible dates like 32/01/2025", () => {
		expect(isValidDateNumberString("32012025")).toBe(false);
	});
});

describe("numberStringToDate / dateToNumberString", () => {
	it("round-trips a valid date", () => {
		const d = combineDateParts(2026, 3, 10);
		const s = dateToNumberString(d);
		const parsed = numberStringToDate(s);
		expect(parsed?.getFullYear()).toBe(2026);
		expect(parsed?.getMonth()).toBe(3);
		expect(parsed?.getDate()).toBe(10);
	});

	it("returns empty string for null date", () => {
		expect(dateToNumberString(null)).toBe("");
	});

	it("returns null for an invalid ddMMyyyy string", () => {
		expect(numberStringToDate("99999999")).toBeNull();
	});
});

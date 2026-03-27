import { describe, it, expect } from "bun:test";
import { buildOfferSearchParams, parseOffersData, extractErrorMessage } from "./dexieApiHelpers";

describe("buildOfferSearchParams", () => {
  it("should return empty params when no arguments given", () => {
    const params = buildOfferSearchParams({});
    expect(params.toString()).toBe("");
  });

  it("should include requested when provided", () => {
    const params = buildOfferSearchParams({ requested: "xch-asset-id" });
    expect(params.get("requested")).toBe("xch-asset-id");
  });

  it("should include offered when provided", () => {
    const params = buildOfferSearchParams({ offered: "cat-asset-id" });
    expect(params.get("offered")).toBe("cat-asset-id");
  });

  it("should include maker when provided", () => {
    const params = buildOfferSearchParams({ maker: "xch1abc123" });
    expect(params.get("maker")).toBe("xch1abc123");
  });

  it("should include page_size and page when provided", () => {
    const params = buildOfferSearchParams({ page_size: 20, page: 2 });
    expect(params.get("page_size")).toBe("20");
    expect(params.get("page")).toBe("2");
  });

  it("should include page=0 when page is 0", () => {
    const params = buildOfferSearchParams({ page: 0 });
    expect(params.get("page")).toBe("0");
  });

  it("should include status when provided", () => {
    const params = buildOfferSearchParams({ status: 4 });
    expect(params.get("status")).toBe("4");
  });

  it("should include status=0 when status is 0", () => {
    const params = buildOfferSearchParams({ status: 0 });
    expect(params.get("status")).toBe("0");
  });

  it("should include all provided params together", () => {
    const params = buildOfferSearchParams({
      requested: "req-id",
      offered: "off-id",
      page_size: 10,
      page: 1,
      status: 2,
    });
    expect(params.get("requested")).toBe("req-id");
    expect(params.get("offered")).toBe("off-id");
    expect(params.get("page_size")).toBe("10");
    expect(params.get("page")).toBe("1");
    expect(params.get("status")).toBe("2");
  });

  it("should not include undefined params", () => {
    const params = buildOfferSearchParams({ requested: undefined, offered: undefined });
    expect(params.toString()).toBe("");
  });
});

describe("parseOffersData", () => {
  it("should parse direct array response", () => {
    const data = [{ id: "1" }, { id: "2" }];
    const result = parseOffersData(data);
    expect(result.offers).toHaveLength(2);
    expect(result.total).toBe(2);
    expect(result.page).toBe(1);
    expect(result.page_size).toBe(10);
  });

  it("should parse response with 'data' key", () => {
    const data = { data: [{ id: "1" }], total: 50, page: 2, page_size: 20 };
    const result = parseOffersData(data);
    expect(result.offers).toHaveLength(1);
    expect(result.total).toBe(50);
    expect(result.page).toBe(2);
    expect(result.page_size).toBe(20);
  });

  it("should parse response with 'offers' key", () => {
    const data = { offers: [{ id: "1" }, { id: "2" }, { id: "3" }] };
    const result = parseOffersData(data);
    expect(result.offers).toHaveLength(3);
  });

  it("should parse response with 'results' key", () => {
    const data = { results: [{ id: "1" }] };
    const result = parseOffersData(data);
    expect(result.offers).toHaveLength(1);
  });

  it("should return empty array for empty object", () => {
    const result = parseOffersData({});
    expect(result.offers).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it("should return empty array for object without known keys", () => {
    const result = parseOffersData({ unknown: [] });
    expect(result.offers).toHaveLength(0);
  });
});

describe("extractErrorMessage", () => {
  it("should include HTTP status in message", async () => {
    const response = new Response("", { status: 404 });
    const message = await extractErrorMessage(response);
    expect(message).toContain("404");
  });

  it("should include JSON error message field", async () => {
    const body = JSON.stringify({ message: "Not found" });
    const response = new Response(body, { status: 404 });
    const message = await extractErrorMessage(response);
    expect(message).toContain("Not found");
  });

  it("should include JSON error field when message is absent", async () => {
    const body = JSON.stringify({ error: "Unauthorized" });
    const response = new Response(body, { status: 401 });
    const message = await extractErrorMessage(response);
    expect(message).toContain("Unauthorized");
  });

  it("should include raw text for non-JSON body", async () => {
    const response = new Response("Internal Server Error", { status: 500 });
    const message = await extractErrorMessage(response);
    expect(message).toContain("Internal Server Error");
    expect(message).toContain("500");
  });

  it("should return base message when body is empty", async () => {
    const response = new Response("", { status: 503 });
    const message = await extractErrorMessage(response);
    expect(message).toContain("503");
  });
});

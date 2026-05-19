import "server-only";

import {
  normalizeSummaryResponse,
  type ApiErrorResponse,
  type TaxDetailResponse,
  type TaxSummaryResponse,
} from "./bapenda-contract";

const DEFAULT_API_BASE_URL = "https://api-bapenda.ichmal.my.id/api";

interface ApiFetchOptions {
  cache?: RequestCache;
  revalidate?: number;
}

function getApiBaseUrl(): string {
  return process.env.BAPENDA_API_BASE_URL ?? process.env.NEXT_PUBLIC_BAPENDA_API_BASE_URL ?? DEFAULT_API_BASE_URL;
}

function buildBackendUrl(pathname: string, searchParams?: URLSearchParams): string {
  const url = new URL(pathname, `${getApiBaseUrl()}/`);

  if (searchParams) {
    searchParams.forEach((value, key) => {
      url.searchParams.set(key, value);
    });
  }

  return url.toString();
}

async function parseJsonResponse<T>(response: Response): Promise<T | null> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return null;
  }

  return (await response.json()) as T;
}

function buildHttpErrorMessage(status: number, fallback: string): string {
  if (status === 404) {
    return "Endpoint yang diminta belum tersedia di server API.";
  }

  if (status === 422) {
    return "Detail belum tersedia untuk jenis data ini.";
  }

  if (status >= 500) {
    return "Server API sedang bermasalah. Silakan coba lagi.";
  }

  return fallback;
}

function buildFetchInit(options?: ApiFetchOptions): RequestInit & { next?: { revalidate: number } } {
  if (typeof options?.revalidate === "number") {
    return { next: { revalidate: options.revalidate } };
  }

  return { cache: options?.cache ?? "no-store" };
}

export async function getSummaryData(
  tahun?: string | number | null,
  options?: ApiFetchOptions,
): Promise<TaxSummaryResponse> {
  const searchParams = new URLSearchParams();
  if (tahun) {
    searchParams.set("tahun", String(tahun));
  }

  const response = await fetch(
    buildBackendUrl("realisasi-pajak", searchParams),
    buildFetchInit(options),
  );

  if (!response.ok) {
    throw new Error(buildHttpErrorMessage(response.status, "Gagal mengambil data realisasi pajak."));
  }

  const payload = await response.json();
  return normalizeSummaryResponse(payload);
}

export async function getDetailData(
  jenisPajak: string,
  searchParams: URLSearchParams,
  options?: ApiFetchOptions,
): Promise<{ status: number; body: TaxDetailResponse | ApiErrorResponse }> {
  try {
    const response = await fetch(
      buildBackendUrl(`realisasi-pajak/${encodeURIComponent(jenisPajak)}/detail`, searchParams),
      buildFetchInit(options),
    );

    const json = await parseJsonResponse<TaxDetailResponse | ApiErrorResponse>(response);

    if (json) {
      return {
        status: response.status,
        body: json,
      };
    }

    return {
      status: response.status,
      body: {
        success: false,
        message: buildHttpErrorMessage(
          response.status,
          "Terjadi kesalahan saat mengambil detail realisasi pajak.",
        ),
      },
    };
  } catch {
    return {
      status: 502,
      body: {
        success: false,
        message: "Tidak dapat terhubung ke server API Bapenda.",
      },
    };
  }
}

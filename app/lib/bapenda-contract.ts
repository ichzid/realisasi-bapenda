export type TaxDataSource = "sts_history" | "epbb_db" | "simpada";

export interface TaxSummaryItem {
  jenis_pajak: string;
  kode_jenis_pajak: string;
  slug_jenis_pajak: string;
  sumber_data: TaxDataSource;
  detail_tersedia: boolean;
  detail_endpoint: string | null;
  target: number;
  realisasi: number;
  persentase: number;
  selisih: number;
}

export interface TaxSummaryResponse {
  success: boolean;
  message: string;
  tahun: number;
  ringkasan: {
    total_target: number;
    total_realisasi: number;
    persentase_capaian: number;
    selisih_anggaran: number;
  };
  rincian: TaxSummaryItem[];
}

export interface TaxTopPembayarItem {
  no_pokok_wp: string | null;
  nama_pemilik: string | null;
  total_nilai: number;
  total_denda: number;
  total_bayar: number;
  jumlah_transaksi: number;
}

export interface TaxDetailPaymentItem {
  no_sts: string | null;
  no_sspd?: string | null; // Keep optional if still present for other taxes
  no_nop: string | null;
  no_ketetapan?: string | null;
  no_pokok_wp: string | null;
  nama_pemilik: string | null;
  alamat_pemilik: string | null;
  mata_anggaran?: string | null; // Optional if removed
  nilai: number;
  denda: number;
  total_bayar: number;
  tgl_bayar: string | null;
  nama_channel: string | null;
  pembayaran_ke?: number | null;
  kode_pembayaran?: string | null;
  kode_pengesahan: string | null;
  kode_cab: string | null;
}

export interface TaxDetailResponse {
  success: boolean;
  message: string;
  data: {
    jenis_pajak: {
      kode: string;
      slug: string;
      nama: string;
      sumber_data: TaxDataSource;
    };
    ringkasan: {
      target: number;
      realisasi: number;
      persentase_capaian: number;
      sisa_anggaran: number;
      jumlah_transaksi: number;
    };
    top_pembayar: TaxTopPembayarItem[];
    pembayaran: {
      data: TaxDetailPaymentItem[];
      pagination: {
        current_page: number;
        per_page: number;
        total: number;
        last_page: number;
        from: number | null;
        to: number | null;
        has_more_pages: boolean;
      };
      sorting: {
        sort_by: string;
        sort_direction: string;
      };
    };
  };
  filters: {
    tahun: number;
    page: number;
    per_page: number;
  };
}

export interface ApiErrorResponse {
  success: false;
  message: string;
}

interface TaxFallbackMeta {
  kode_jenis_pajak: string;
  slug_jenis_pajak: string;
  sumber_data: TaxDataSource;
  detail_tersedia: boolean;
}

const TAX_FALLBACKS: Record<string, TaxFallbackMeta> = {
  "Pajak Bumi dan Bangunan": {
    kode_jenis_pajak: "PBB",
    slug_jenis_pajak: "pbb",
    sumber_data: "epbb_db",
    detail_tersedia: false,
  },
  "Pajak BPHTB": {
    kode_jenis_pajak: "BPHTB",
    slug_jenis_pajak: "bphtb",
    sumber_data: "sts_history",
    detail_tersedia: true,
  },
  "PBJT Atas Makanan dan Minuman": {
    kode_jenis_pajak: "Pajak Restoran",
    slug_jenis_pajak: "pajak-restoran",
    sumber_data: "sts_history",
    detail_tersedia: true,
  },
  "PBJT Atas Tenaga Listrik": {
    kode_jenis_pajak: "Pajak Penerangan",
    slug_jenis_pajak: "pajak-penerangan",
    sumber_data: "sts_history",
    detail_tersedia: true,
  },
  "PBJT Atas Jasa Perhotelan": {
    kode_jenis_pajak: "Pajak Hotel",
    slug_jenis_pajak: "pajak-hotel",
    sumber_data: "sts_history",
    detail_tersedia: true,
  },
  "PBJT Atas Jasa Parkir": {
    kode_jenis_pajak: "Pajak Parkir",
    slug_jenis_pajak: "pajak-parkir",
    sumber_data: "sts_history",
    detail_tersedia: true,
  },
  "PBJT Atas Jasa Kesenian dan Hiburan": {
    kode_jenis_pajak: "Pajak Hiburan",
    slug_jenis_pajak: "pajak-hiburan",
    sumber_data: "sts_history",
    detail_tersedia: true,
  },
  "Pajak Reklame": {
    kode_jenis_pajak: "Pajak Reklame",
    slug_jenis_pajak: "pajak-reklame",
    sumber_data: "sts_history",
    detail_tersedia: true,
  },
  "Pajak Air Tanah (PAT)": {
    kode_jenis_pajak: "Pajak Air Tanah",
    slug_jenis_pajak: "pajak-air-tanah",
    sumber_data: "sts_history",
    detail_tersedia: true,
  },
  "Pajak Mineral Bukan Logam dan Batuan (MBLB)": {
    kode_jenis_pajak: "Pajak Galian",
    slug_jenis_pajak: "pajak-galian",
    sumber_data: "sts_history",
    detail_tersedia: true,
  },
  "Pajak Sarang Burung Walet": {
    kode_jenis_pajak: "Pajak Sarang Burung Walet",
    slug_jenis_pajak: "pajak-sarang-burung-walet",
    sumber_data: "sts_history",
    detail_tersedia: true,
  },
  "Opsen PKB": {
    kode_jenis_pajak: "Opsen PKB",
    slug_jenis_pajak: "opsen-pkb",
    sumber_data: "simpada",
    detail_tersedia: false,
  },
  "Opsen BBNKB": {
    kode_jenis_pajak: "Opsen BBNKB",
    slug_jenis_pajak: "opsen-bbnkb",
    sumber_data: "simpada",
    detail_tersedia: false,
  },
  "Retribusi Lainnya": {
    kode_jenis_pajak: "Retribusi",
    slug_jenis_pajak: "retribusi",
    sumber_data: "sts_history",
    detail_tersedia: true,
  },
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

function asBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function asNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function asSource(value: unknown): TaxDataSource | null {
  return value === "sts_history" || value === "epbb_db" || value === "simpada"
    ? value
    : null;
}

function slugifyJenisPajak(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildApiEndpoint(slug: string): string {
  const base = typeof process !== "undefined" && process.env.NEXT_PUBLIC_BAPENDA_API_BASE_URL
    ? process.env.NEXT_PUBLIC_BAPENDA_API_BASE_URL
    : "https://api-bapenda.ichmal.my.id/api";
  return `${base}/realisasi-pajak/${slug}/detail`;
}

export { buildApiEndpoint as buildLocalDetailEndpoint };

export function normalizeSummaryResponse(payload: unknown): TaxSummaryResponse {
  const record = asRecord(payload);
  const ringkasan = asRecord(record?.ringkasan);
  const rincian = Array.isArray(record?.rincian) ? record.rincian : [];
  const currentYear = new Date().getFullYear();

  return {
    success: record?.success !== false,
    message: asString(record?.message) ?? "Data realisasi berhasil diambil.",
    tahun: asNumber(record?.tahun) || currentYear,
    ringkasan: {
      total_target: asNumber(ringkasan?.total_target),
      total_realisasi: asNumber(ringkasan?.total_realisasi),
      persentase_capaian: asNumber(ringkasan?.persentase_capaian),
      selisih_anggaran: asNumber(ringkasan?.selisih_anggaran),
    },
    rincian: rincian
      .map((item) => normalizeSummaryItem(item))
      .filter((item): item is TaxSummaryItem => item !== null),
  };
}

function normalizeSummaryItem(payload: unknown): TaxSummaryItem | null {
  const record = asRecord(payload);
  const jenisPajak = asString(record?.jenis_pajak);

  if (!jenisPajak) {
    return null;
  }

  const fallback = TAX_FALLBACKS[jenisPajak];
  const slug = asString(record?.slug_jenis_pajak) ?? fallback?.slug_jenis_pajak ?? slugifyJenisPajak(jenisPajak);
  const sumberData = asSource(record?.sumber_data) ?? fallback?.sumber_data ?? "sts_history";
  const detailTersedia = asBoolean(record?.detail_tersedia) ?? fallback?.detail_tersedia ?? false;

  return {
    jenis_pajak: jenisPajak,
    kode_jenis_pajak: asString(record?.kode_jenis_pajak) ?? fallback?.kode_jenis_pajak ?? jenisPajak,
    slug_jenis_pajak: slug,
    sumber_data: sumberData,
    detail_tersedia: detailTersedia,
    detail_endpoint: detailTersedia
      ? asString(record?.detail_endpoint) ?? buildApiEndpoint(slug)
      : null,
    target: asNumber(record?.target),
    realisasi: asNumber(record?.realisasi),
    persentase: asNumber(record?.persentase),
    selisih: asNumber(record?.selisih),
  };
}

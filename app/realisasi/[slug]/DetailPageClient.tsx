"use client";


import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  ApiErrorResponse,
  TaxDetailPaymentItem,
  TaxDetailResponse,
  TaxTopPembayarItem,
} from "@/app/lib/bapenda-contract";

interface DetailPageClientProps {
  slug: string;
  initialYear: number;
  initialPage: number;
  initialPerPage: number;
}

type SortBy = "tgl_bayar" | "no_sts" | "nama_pemilik" | "nilai" | "total_bayar";
type SortDir = "asc" | "desc";

const PER_PAGE_OPTIONS = [10, 25, 50];

const API_BASE = process.env.NEXT_PUBLIC_BAPENDA_API_BASE_URL ?? "https://api-bapenda.ichmal.my.id/api";

/* ── Helpers ─────────────────────────────────────────────────────────── */
function formatRupiah(n: number): string {
  return n.toLocaleString("id-ID");
}
function formatMilyar(n: number): string {
  const abs = Math.abs(n);
  const prefix = n < 0 ? "- " : "";
  return `${prefix}Rp ${formatRupiah(abs)}`;
}
function formatDateTime(value: string | null): string {
  if (!value) return "-";
  const date = new Date(value.replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(date);
}
function buildPaymentKey(payment: TaxDetailPaymentItem, index: number): string {
  return [payment.no_sts ?? "sts", payment.no_nop ?? "nop", payment.kode_pengesahan ?? "kode", payment.tgl_bayar ?? "t", payment.total_bayar, index].join("-");
}

/** Shimmer skeleton */
function Skeleton({ width = "6rem", height = "1em", radius = "0.4rem" }: {
  width?: string; height?: string; radius?: string;
}) {
  return <span className="skeleton-bar" style={{ display: "inline-block", width, height, borderRadius: radius, verticalAlign: "middle" }} />;
}

interface DetailRingkasan {
  target: number;
  realisasi: number;
  persentase_capaian: number;
  sisa_anggaran: number;
  jumlah_transaksi: number;
}

/* ── Sort icon component ─────────────────────────────────────────────── */
function SortIcon({ column, sortBy, sortDir }: { column: SortBy; sortBy: SortBy; sortDir: SortDir }) {
  const isActive = column === sortBy;
  return (
    <span className="dt-sort-icon" aria-hidden>
      <span className={`dt-sort-asc ${isActive && sortDir === "asc" ? "dt-sort-active" : ""}`}>▲</span>
      <span className={`dt-sort-desc ${isActive && sortDir === "desc" ? "dt-sort-active" : ""}`}>▼</span>
    </span>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   DetailPageClient
════════════════════════════════════════════════════════════════════════ */
export function DetailPageClient({ slug, initialYear, initialPage, initialPerPage }: DetailPageClientProps) {
  const router = useRouter();
  const [year] = useState(initialYear);
  const [page, setPage] = useState(initialPage);
  const [perPage, setPerPage] = useState(initialPerPage);
  const [sortBy, setSortBy] = useState<SortBy>("tgl_bayar");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [search, setSearch] = useState("");

  /* Detail (server-side pagination — fetch per-halaman, bukan semua) */
  const [rows, setRows] = useState<TaxDetailPaymentItem[]>([]);
  const [topPembayar, setTopPembayar] = useState<TaxTopPembayarItem[]>([]);
  const [jenisPajak, setJenisPajak] = useState<TaxDetailResponse["data"]["jenis_pajak"] | null>(null);
  const [ringkasan, setRingkasan] = useState<DetailRingkasan | null>(null);
  const [detailLoading, setDetailLoading] = useState(true);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailFetched, setDetailFetched] = useState(false);
  const paginationRef = useRef({ total: 0, last_page: 0, has_more: false });

  const firstLoadRef = useRef(true);

  /* ── Fetch ONE page (server-side pagination) ─────────────────────── */
  const fetchPage = useCallback(async (targetPage: number, targetPerPage: number, signal: AbortSignal) => {
    const res = await fetch(
      `${API_BASE}/realisasi-pajak/${slug}/detail?tahun=${year}&page=${targetPage}&per_page=${targetPerPage}`,
      { cache: "no-store", signal },
    );
    const payload = (await res.json()) as TaxDetailResponse | ApiErrorResponse;
    if (!res.ok || payload.success === false) {
      throw new Error((payload as ApiErrorResponse).message ?? "Gagal memuat detail.");
    }
    const data = payload as TaxDetailResponse;

    // Simpan metadata yang tidak berubah
    if (!detailFetched) {
      setJenisPajak(data.data.jenis_pajak);
      setRingkasan(data.data.ringkasan);
      setTopPembayar(data.data.top_pembayar ?? []);
      setDetailFetched(true);
    }
    setRows(data.data.pembayaran.data);
    paginationRef.current = {
      total: data.data.pembayaran.pagination.total,
      last_page: data.data.pembayaran.pagination.last_page,
      has_more: data.data.pembayaran.pagination.has_more_pages,
    };
  }, [slug, year, detailFetched]);

  useEffect(() => {
    const controller = new AbortController();
    setDetailLoading(true);
    setDetailError(null);
    void Promise.resolve()
      .then(() => fetchPage(page, perPage, controller.signal))
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") return;
        setDetailError(err instanceof Error ? err.message : "Gagal memuat detail.");
      })
      .finally(() => setDetailLoading(false));
    return () => controller.abort();
  }, [fetchPage, page, perPage]);

  /* ── Sync URL ────────────────────────────────────────────────────── */
  useEffect(() => {
    if (firstLoadRef.current) { firstLoadRef.current = false; return; }
    const params = new URLSearchParams({ tahun: String(year), page: String(page), per_page: String(perPage) });
    startTransition(() => { router.replace(`/realisasi/${slug}?${params.toString()}`, { scroll: false }); });
  }, [router, slug, year, page, perPage]);

  /* ── Search filter ───────────────────────────────────────────────── */
  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r) =>
        (r.nama_pemilik ?? "").toLowerCase().includes(q) ||
        (r.no_pokok_wp ?? "").toLowerCase().includes(q) ||
        (r.no_sts ?? "").toLowerCase().includes(q) ||
        (r.no_nop ?? "").toLowerCase().includes(q) ||
        String(r.total_bayar).includes(q) ||
        String(r.nilai).includes(q),
    );
  }, [rows, search]);

  /* ── Sort ────────────────────────────────────────────────────────── */
  const sortedRows = useMemo(() => {
    if (!filteredRows.length) return filteredRows;
    return [...filteredRows].sort((a, b) => {
      let aVal: string | number;
      let bVal: string | number;
      switch (sortBy) {
        case "nama_pemilik": aVal = (a.nama_pemilik ?? "").toLowerCase(); bVal = (b.nama_pemilik ?? "").toLowerCase(); break;
        case "total_bayar":  aVal = a.total_bayar;  bVal = b.total_bayar;  break;
        case "no_sts":       aVal = (a.no_sts ?? "").toLowerCase(); bVal = (b.no_sts ?? "").toLowerCase(); break;
        case "nilai":        aVal = a.nilai;        bVal = b.nilai;        break;
        default: /* tgl_bayar */ aVal = a.tgl_bayar ?? ""; bVal = b.tgl_bayar ?? "";
      }
      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredRows, sortBy, sortDir]);

  /* ── Pagination ──────────────────────────────────────────────────── */
  const totalCount    = paginationRef.current.total;
  const totalPages    = paginationRef.current.last_page;
  const safePage      = page;
  const pagedRows     = sortedRows; // sudah per-halaman dari server
  const hasPrev       = safePage > 1;
  const hasNext       = paginationRef.current.has_more;

  /* ── Metrics ─────────────────────────────────────────────────────── */
  const targetValue    = ringkasan?.target                  ?? 0;
  const realisasiValue = ringkasan?.realisasi               ?? 0;
  const capaianValue   = ringkasan?.persentase_capaian      ?? 0;
  const transaksiValue = ringkasan?.jumlah_transaksi        ?? null;
  const sisaValue      = ringkasan?.sisa_anggaran           ?? Math.max(targetValue - realisasiValue, 0);

  /* ── Column sort helper ──────────────────────────────────────────── */
  function handleColSort(col: SortBy) {
    if (col === sortBy) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(col);
      setSortDir("asc");
    }
    setPage(1);
  }

  /* ── Render ──────────────────────────────────────────────────────── */
  return (
    <div className="dp-shell">
      <div className="bg-accent-orb" />
      <div className="glow-line" />

      {/* Top bar */}
      <header className="dp-topbar">
        <div className="dp-topbar-left">
          <Link href="/" className="detail-back-link">← Kembali ke dashboard</Link>
          <span className="dp-topbar-sep">/</span>
          <span className="dp-topbar-crumb">
            {detailLoading ? <Skeleton width="8rem" /> : (jenisPajak?.nama ?? slug)}
          </span>
        </div>
        <div className="dp-topbar-right">
          <span>Pemerintah Kabupaten Batubara</span>
          <strong>Badan Pendapatan Daerah</strong>
        </div>
      </header>

      {/* Hero metrics */}
      <section className="dp-hero">
        <div className="dp-hero-metrics">
          <HeroMetric label="Total Realisasi" value={detailLoading ? null : formatMilyar(realisasiValue)} accent="gold" />
          <HeroMetric label="Target"          value={detailLoading ? null : formatMilyar(targetValue)} />
          <HeroMetric label="Capaian"         value={detailLoading ? null : `${capaianValue.toFixed(2)}%`} accent="green" />
          <HeroMetric label="Sisa Anggaran"   value={detailLoading ? null : formatMilyar(sisaValue)} />
          <HeroMetric label="Total Transaksi" value={detailLoading ? null : transaksiValue !== null ? formatRupiah(transaksiValue) : "-"} />
        </div>
      </section>

      {/* DataTable panel — two-column layout */}
      <section className="dp-panel">
        <div className="dp-body-layout">

          {/* ── Left: Top Pembayar ─────────────────────────────── */}
          <aside className="dp-top-pembayar-panel">
            <div className="tp-header">
              <h2 className="tp-title">Top Pembayar</h2>
              <span className="tp-subtitle">10 Terbesar Tahun {year}</span>
            </div>
            <div className="tp-list-wrap">
              {detailLoading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="tp-item tp-item-skeleton">
                    <span className="tp-rank tp-rank-skeleton">{i + 1}</span>
                    <div className="tp-item-body">
                      <Skeleton width="9rem" height="0.8em" />
                      <Skeleton width="5rem" height="0.7em" />
                    </div>
                    <div className="tp-item-amount">
                      <Skeleton width="5rem" height="0.85em" />
                    </div>
                  </div>
                ))
              ) : topPembayar.length === 0 ? (
                <div className="tp-empty">Data tidak tersedia</div>
              ) : (
                topPembayar.map((item, i) => (
                  <TopPembayarRow key={i} item={item} rank={i + 1} />
                ))
              )}
            </div>
          </aside>

          {/* ── Right: Riwayat Pembayaran ──────────────────────── */}
          <div className="dp-riwayat-panel">

            {/* DataTable toolbar */}
            <div className="dt-toolbar">
              <div className="dt-toolbar-left">
                <h2 className="dt-title">Riwayat Pembayaran Terbaru</h2>
              </div>
              <div className="dt-toolbar-right">
                <div className="dt-search-wrap">
                  <span className="dt-search-icon">⌕</span>
                  <input
                    id="dt-search"
                    type="search"
                    className="dt-search"
                    placeholder="Cari wajib pajak, NPWPD, NOP, STS…"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    disabled={!detailFetched}
                  />
                </div>
                <label className="dt-per-page-label">
                  Show
                  <select
                    className="dt-per-page-select"
                    value={perPage}
                    onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}
                    disabled={!detailFetched}
                  >
                    {PER_PAGE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                  entries
                </label>
              </div>
            </div>

            {/* Notices */}
            {detailError && <NoticeCard title="Data tidak dapat dimuat" description={detailError} />}

            {/* Table scroll area */}
            <div className="dp-table-wrap">
              <table className="dt-table">
                <colgroup>
                  <col style={{ width: "16%" }} />
                  <col style={{ width: "22%" }} />
                  <col style={{ width: "29%" }} />
                  <col style={{ width: "13%" }} />
                  <col style={{ width: "20%" }} />
                </colgroup>
                <thead>
                  <tr>
                    <th className="dt-th dt-th-sortable" onClick={() => handleColSort("tgl_bayar")}>
                      <span className="dt-th-inner">
                        Tanggal &amp; Channel
                        <SortIcon column="tgl_bayar" sortBy={sortBy} sortDir={sortDir} />
                      </span>
                    </th>
                    <th className="dt-th dt-th-sortable" onClick={() => handleColSort("no_sts")}>
                      <span className="dt-th-inner">
                        STS / NOP
                        <SortIcon column="no_sts" sortBy={sortBy} sortDir={sortDir} />
                      </span>
                    </th>
                    <th className="dt-th dt-th-sortable" onClick={() => handleColSort("nama_pemilik")}>
                      <span className="dt-th-inner">
                        Wajib Pajak
                        <SortIcon column="nama_pemilik" sortBy={sortBy} sortDir={sortDir} />
                      </span>
                    </th>
                    <th className="dt-th dt-th-sortable dt-th-right" onClick={() => handleColSort("nilai")}>
                      <span className="dt-th-inner" style={{ justifyContent: "flex-end" }}>
                        Rincian Bayar
                        <SortIcon column="nilai" sortBy={sortBy} sortDir={sortDir} />
                      </span>
                    </th>
                    <th className="dt-th dt-th-sortable dt-th-right" onClick={() => handleColSort("total_bayar")}>
                      <span className="dt-th-inner" style={{ justifyContent: "flex-end" }}>
                        Total Bayar
                        <SortIcon column="total_bayar" sortBy={sortBy} sortDir={sortDir} />
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {detailLoading ? (
                    Array.from({ length: perPage }).map((_, i) => (
                      <tr key={i} className="dt-skeleton-row">
                        <td><Skeleton width="7rem" /></td>
                        <td><Skeleton width="9rem" /></td>
                        <td><Skeleton width="8rem" /></td>
                        <td><Skeleton width="5rem" /></td>
                        <td style={{ textAlign: "right" }}><Skeleton width="6rem" /></td>
                      </tr>
                    ))
                  ) : pagedRows.length ? (
                    pagedRows.map((payment, i) => (
                      <PaymentRow key={buildPaymentKey(payment, i)} payment={payment} />
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="dt-empty">
                        {search ? `Tidak ada data yang cocok dengan "${search}"` : "Belum ada transaksi."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* DataTable footer */}
            {(detailFetched || detailLoading) && (
              <div className="dt-footer">
                <span className="dt-info">
                  {detailLoading
                    ? <Skeleton width="12rem" />
                    : totalCount === 0
                      ? "Tidak ada data"
                      : `Menampilkan ${(page - 1) * perPage + 1}–${Math.min(page * perPage, totalCount)} dari ${formatRupiah(totalCount)} entri`}
                </span>
                <div className="dt-pagination">
                  <button
                    type="button"
                    className={`dt-page-btn ${!hasPrev ? "dt-page-btn-disabled" : ""}`}
                    onClick={() => { if (hasPrev) setPage((p) => Math.max(p - 1, 1)); }}
                    disabled={!hasPrev}
                  >‹ Sebelumnya</button>

                  <div className="dt-page-pills">
                    {buildPagePills(safePage, totalPages).map((item, i) =>
                      item === "…" ? (
                        <span key={`ellipsis-${i}`} className="dt-page-ellipsis">…</span>
                      ) : (
                        <button
                          key={item}
                          type="button"
                          className={`dt-page-pill ${item === safePage ? "dt-page-pill-active" : ""}`}
                          onClick={() => setPage(item as number)}
                        >{item}</button>
                      ),
                    )}
                  </div>

                  <button
                    type="button"
                    className={`dt-page-btn ${!hasNext ? "dt-page-btn-disabled" : ""}`}
                    onClick={() => { if (hasNext) setPage((p) => p + 1); }}
                    disabled={!hasNext}
                  >Berikutnya ›</button>
                </div>
              </div>
            )}

          </div>{/* end dp-riwayat-panel */}
        </div>{/* end dp-body-layout */}
      </section>
    </div>
  );
}

/* ── Page pill builder (shows first, last, current ±1, with ellipsis) ── */
function buildPagePills(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "…")[] = [];
  const add = (n: number) => { if (!pages.includes(n)) pages.push(n); };
  add(1);
  if (current > 3) pages.push("…");
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) add(i);
  if (current < total - 2) pages.push("…");
  add(total);
  return pages;
}

/* ── Sub-components ──────────────────────────────────────────────────── */
function HeroMetric({ label, value, accent }: { label: string; value: string | null; accent?: "gold" | "green" }) {
  const colorClass = accent === "gold" ? "text-accent-gold" : accent === "green" ? "text-accent-green" : "text-text-primary";
  return (
    <div className="dp-metric">
      <span className="dp-metric-label">{label}</span>
      <span className={`dp-metric-value ${colorClass}`}>
        {value === null ? <Skeleton width="7rem" height="1.1em" /> : value}
      </span>
    </div>
  );
}

function NoticeCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="detail-page-notice">
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}

const RANK_COLORS = [
  { bg: "rgba(251,191,36,0.18)", border: "rgba(251,191,36,0.55)", text: "#fbbf24" },   // #1 gold
  { bg: "rgba(148,163,184,0.14)", border: "rgba(148,163,184,0.4)", text: "#cbd5e1" },  // #2 silver
  { bg: "rgba(180,120,60,0.15)", border: "rgba(180,120,60,0.4)", text: "#c97c3a" },    // #3 bronze
];

function TopPembayarRow({ item, rank }: { item: TaxTopPembayarItem; rank: number }) {
  const colors = RANK_COLORS[rank - 1] ?? null;
  return (
    <div className="tp-item">
      <span
        className="tp-rank"
        style={colors ? {
          background: colors.bg,
          border: `1px solid ${colors.border}`,
          color: colors.text,
        } : undefined}
      >
        {rank}
      </span>
      <div className="tp-item-body">
        <strong className="tp-item-name">{item.nama_pemilik ?? "-"}</strong>
        <span className="tp-item-meta">
          {item.jumlah_transaksi} transaksi
          {item.no_pokok_wp ? ` · ${item.no_pokok_wp}` : ""}
        </span>
      </div>
      <div className="tp-item-amount">
        <span className="tp-item-total">Rp {formatRupiah(item.total_bayar)}</span>
        {item.total_denda > 0 && (
          <span className="tp-item-denda">+denda Rp {formatRupiah(item.total_denda)}</span>
        )}
      </div>
    </div>
  );
}

function PaymentRow({ payment }: { payment: TaxDetailPaymentItem }) {
  return (
    <tr className="dt-row">
      <td className="dt-td">
        <div className="detail-page-cell-stack">
          <strong>{formatDateTime(payment.tgl_bayar)}</strong>
          <span className="dt-cell-sub">{payment.nama_channel ?? "-"}</span>
        </div>
      </td>
      <td className="dt-td">
        <div className="detail-page-cell-stack">
          <strong>{payment.no_sts ?? "-"}</strong>
          <span className="dt-cell-sub">{payment.no_nop ?? payment.kode_pengesahan ?? "-"}</span>
        </div>
      </td>
      <td className="dt-td">
        <div className="detail-page-cell-stack">
          <strong>{payment.nama_pemilik ?? "-"}</strong>
          <span className="dt-cell-sub">{payment.no_pokok_wp ?? payment.alamat_pemilik ?? "-"}</span>
        </div>
      </td>
      <td className="dt-td dt-td-right">
        <div className="detail-page-cell-stack" style={{ alignItems: "flex-end" }}>
          <strong>Pokok: Rp {formatRupiah(payment.nilai)}</strong>
          <span className="dt-cell-sub">Denda: Rp {formatRupiah(payment.denda)}</span>
        </div>
      </td>
      <td className="dt-td dt-td-right dt-currency">Rp {formatRupiah(payment.total_bayar)}</td>
    </tr>
  );
}

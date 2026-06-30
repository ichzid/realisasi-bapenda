"use client";

import Image from "next/image";

import { startTransition, useCallback, useEffect, useRef, useState } from "react";
import { LiveClock } from "./LiveClock";
import { useCountUp } from "../hooks/useCountUp";
import type { TaxSummaryResponse } from "../lib/bapenda-contract";

const POLL_INTERVAL_MS = 5_000;

function formatRupiah(n: number): string {
  return n.toLocaleString("id-ID");
}

function formatMilyar(n: number): string {
  const abs = Math.abs(n);
  const prefix = n < 0 ? "- " : "";
  if (abs >= 1_000_000_000) {
    return `${prefix}Rp ${(abs / 1_000_000_000).toFixed(2)} M`;
  }
  return `${prefix}Rp ${formatRupiah(abs)}`;
}

function getBarColor(persen: number): string {
  if (persen >= 75) return "progress-green";
  if (persen >= 40) return "progress-gold";
  return "progress-red";
}

function AnimatedRupiah({ value }: { value: number }) {
  const animated = useCountUp(value);
  return <>{formatRupiah(animated)}</>;
}

function AnimatedMilyar({ value }: { value: number }) {
  const animated = useCountUp(value);
  return <>{formatMilyar(animated)}</>;
}

function AnimatedPercent({ value, decimals = 2 }: { value: number; decimals?: number }) {
  const scaled = Math.round(value * 100);
  const animated = useCountUp(scaled);
  return <>{(animated / 100).toFixed(decimals)}%</>;
}

function AnimatedBar({ persen }: { persen: number }) {
  const [width, setWidth] = useState(0);
  const prevPersen = useRef(persen);
  const animRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    const from = prevPersen.current;
    const to = Math.min(persen, 100);
    prevPersen.current = persen;

    if (animRef.current) cancelAnimationFrame(animRef.current);
    startRef.current = null;

    const animate = (ts: number) => {
      if (!startRef.current) startRef.current = ts;
      const t = Math.min((ts - startRef.current) / 1200, 1);
      const eased = 1 - Math.pow(1 - t, 4);
      setWidth(from + (to - from) * eased);

      if (t < 1) {
        animRef.current = requestAnimationFrame(animate);
      }
    };

    animRef.current = requestAnimationFrame(animate);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [persen]);

  return (
    <div className="progress-bar-track">
      <div className={`progress-bar-fill ${getBarColor(persen)}`} style={{ width: `${width}%` }} />
    </div>
  );
}

function FlashRow({ children, changed }: { children: React.ReactNode; changed: boolean }) {
  return <tr className={`transition-colors border-b border-panel-border/30 ${changed ? "row-flash" : ""}`}>{children}</tr>;
}

export function DashboardClient({ initialData }: { initialData: TaxSummaryResponse }) {
  const [data, setData] = useState<TaxSummaryResponse>(initialData);
  const [changedRows, setChangedRows] = useState<Set<number>>(new Set());
  const prevDataRef = useRef<TaxSummaryResponse>(initialData);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/realisasi-pajak", {
        cache: "no-store",
      });

      if (!res.ok) return;

      const fresh: TaxSummaryResponse = await res.json();
      const changed = new Set<number>();

      fresh.rincian.forEach((row, index) => {
        const prev = prevDataRef.current.rincian[index];
        if (!prev || prev.realisasi !== row.realisasi || prev.target !== row.target) {
          changed.add(index);
        }
      });

      prevDataRef.current = fresh;
      startTransition(() => {
        setData(fresh);
        setChangedRows(changed);
      });
      setLastUpdated(new Date());

      if (changed.size > 0) {
        setTimeout(() => setChangedRows(new Set()), 2000);
      }
    } catch (error) {
      console.error("Polling error:", error);
    }
  }, []);

  useEffect(() => {
    const intervalId = setInterval(fetchData, POLL_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [fetchData]);

  const { ringkasan, rincian, tahun } = data;

  return (
    <div className="dashboard-wrapper" style={{ padding: "1.1vh 1.2vw" }}>
      <div className="bg-accent-orb" />
      <div className="glow-line" />

      <header
        className="flex justify-between items-start"
        style={{ position: "relative", zIndex: 1, marginBottom: "1.5vh" }}
      >
        <div className="flex items-center" style={{ gap: "0.8vw" }}>
          <div
            className="flex items-center justify-center"
            style={{ width: "clamp(40px, 3.5vw, 64px)", height: "clamp(40px, 3.5vw, 64px)" }}
          >
            <div className="w-full h-full flex items-center justify-center">
              <Image src="/logo.png" alt="Logo Bapenda" width={64} height={64} className="w-full h-full object-contain" />
            </div>
          </div>
          <div>
            <h2
              className="text-text-secondary uppercase tracking-wide font-medium"
              style={{ fontSize: "clamp(0.55rem, 0.75vw, 0.85rem)", marginBottom: "0.15vh" }}
            >
              Pemerintah Kabupaten Batubara - Badan Pendapatan Daerah
            </h2>
            <h1 className="font-bold text-text-primary" style={{ fontSize: "clamp(1rem, 1.5vw, 1.6rem)" }}>
              Target dan Realisasi Pendapatan Asli Daerah
            </h1>
            <p className="text-text-secondary" style={{ fontSize: "clamp(0.55rem, 0.7vw, 0.8rem)" }}>
              Kabupaten Batubara - Tahun Anggaran {tahun}
              {lastUpdated ? (
                <span className="ml-2 opacity-50">· Diperbarui {lastUpdated.toLocaleTimeString("id-ID")}</span>
              ) : null}
            </p>
          </div>
        </div>
        <div className="text-right flex flex-col items-end" style={{ gap: "0.3vh" }}>
          <div
            className="inline-flex items-center text-accent-green font-semibold"
            style={{
              gap: "0.4vw",
              background: "rgba(5, 150, 105, 0.15)",
              border: "1px solid rgba(52, 211, 153, 0.3)",
              borderRadius: "9999px",
              padding: "0.25vh 0.7vw",
              fontSize: "clamp(0.6rem, 0.7vw, 0.85rem)",
            }}
          >
            <div className="live-dot rounded-full bg-accent-green" style={{ width: 7, height: 7 }} />
            LIVE
          </div>
          <LiveClock />
        </div>
      </header>

      <section
        className="grid grid-cols-4"
        style={{ gap: "0.8vw", position: "relative", zIndex: 1, marginBottom: "1.5vh" }}
      >
        <SummaryCard label="Total Target PAD" color="text-white">
          <AnimatedMilyar value={ringkasan.total_target} />
        </SummaryCard>
        <SummaryCard label="Total Realisasi" color="text-white">
          <AnimatedMilyar value={ringkasan.total_realisasi} />
        </SummaryCard>
        <SummaryCard label="Persentase Capaian" color="text-accent-gold">
          <AnimatedPercent value={ringkasan.persentase_capaian} />
        </SummaryCard>
        <SummaryCard label="Selisih Anggaran" color="text-accent-gold">
          <AnimatedMilyar value={ringkasan.selisih_anggaran} />
        </SummaryCard>
      </section>

      <section className="table-section" style={{ flex: 1, position: "relative", zIndex: 1, minHeight: 0 }}>
        <div
          className="border-b border-panel-border"
          style={{ padding: "0.6vh 1vw", background: "rgba(30, 41, 59, 0.6)" }}
        >
          <h3
            className="text-text-secondary uppercase tracking-wider font-medium"
            style={{ fontSize: "clamp(0.55rem, 0.7vw, 0.8rem)" }}
          >
            Rincian Per Jenis Pajak dan Retribusi
          </h3>
        </div>

        <div className="table-scroll" style={{ flex: 1, overflow: "hidden" }}>
          <table className="data-table w-full" style={{ fontSize: "clamp(0.55rem, 0.72vw, 0.82rem)" }}>
            <thead>
              <tr
                className="text-text-secondary border-b border-panel-border"
                style={{ background: "rgba(30, 41, 59, 0.7)" }}
              >
                <th className="font-medium text-center" style={{ padding: "0.5vh 0.6vw", width: "4%" }}>
                  No
                </th>
                <th className="font-medium text-left" style={{ padding: "0.5vh 0.6vw", width: "31%" }}>
                  Jenis Pajak / Retribusi
                </th>
                <th className="font-medium text-right" style={{ padding: "0.5vh 0.6vw", width: "16%" }}>
                  Target (Rp)
                </th>
                <th className="font-medium text-right" style={{ padding: "0.5vh 0.6vw", width: "16%" }}>
                  Realisasi (Rp)
                </th>
                <th className="font-medium text-center" style={{ padding: "0.5vh 0.6vw", width: "17%" }}>
                  %
                </th>
                <th className="font-medium text-right" style={{ padding: "0.5vh 0.6vw", width: "16%" }}>
                  Selisih (Rp)
                </th>
              </tr>
            </thead>
            <tbody className="text-text-secondary">
              {rincian.map((row, index) => (
                <FlashRow key={row.slug_jenis_pajak} changed={changedRows.has(index)}>
                  <td className="text-center" style={{ padding: "0.45vh 0.6vw", width: "4%" }}>
                    {index + 1}
                  </td>
                  <td style={{ padding: "0.45vh 0.6vw", width: "31%" }}>
                    {row.detail_tersedia ? (
                      <a
                        href={`/realisasi/${row.slug_jenis_pajak}?tahun=${tahun}`}
                        className="detail-row-link"
                      >
                        {row.jenis_pajak}
                      </a>
                    ) : (
                      <span className="detail-row-title">{row.jenis_pajak}</span>
                    )}
                  </td>
                  <td className="text-right font-mono" style={{ padding: "0.45vh 0.6vw", width: "16%" }}>
                    <AnimatedRupiah value={row.target} />
                  </td>
                  <td className="text-right font-mono" style={{ padding: "0.45vh 0.6vw", width: "16%" }}>
                    <AnimatedRupiah value={row.realisasi} />
                  </td>
                  <td style={{ padding: "0.45vh 0.6vw", width: "17%" }}>
                    <div className="flex items-center" style={{ gap: "0.5vw" }}>
                      <AnimatedBar persen={row.persentase} />
                      <span className="text-text-primary whitespace-nowrap" style={{ minWidth: "3vw", textAlign: "right" }}>
                        <AnimatedPercent value={row.persentase} decimals={1} />
                      </span>
                    </div>
                  </td>
                  <td className="text-right font-mono text-accent-red" style={{ padding: "0.45vh 0.6vw", width: "16%" }}>
                    <AnimatedRupiah value={row.selisih} />
                  </td>
                </FlashRow>
              ))}
            </tbody>
            <tfoot>
              <tr className="total-row text-text-primary font-semibold">
                <td colSpan={2} style={{ padding: "0.55vh 0.6vw", width: "35%" }}>
                  TOTAL KESELURUHAN
                </td>
                <td className="text-right font-mono" style={{ padding: "0.55vh 0.6vw", width: "16%" }}>
                  <AnimatedRupiah value={ringkasan.total_target} />
                </td>
                <td className="text-right font-mono" style={{ padding: "0.55vh 0.6vw", width: "16%" }}>
                  <AnimatedRupiah value={ringkasan.total_realisasi} />
                </td>
                <td className="text-center text-accent-gold" style={{ padding: "0.55vh 0.6vw", width: "17%" }}>
                  <AnimatedPercent value={ringkasan.persentase_capaian} />
                </td>
                <td className="text-right font-mono text-accent-red" style={{ padding: "0.55vh 0.6vw", width: "16%" }}>
                  <AnimatedRupiah value={ringkasan.selisih_anggaran} />
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <footer
        className="flex justify-between items-center text-text-secondary"
        style={{
          position: "relative",
          zIndex: 1,
          marginTop: "0.6vh",
          fontSize: "clamp(0.5rem, 0.6vw, 0.72rem)",
        }}
      >
        <div>Sumber data: Sistem Informasi Manajamen Pajak Daerah Kab. Batubara</div>
        <div className="flex items-center" style={{ gap: "1vw" }}>
          <LegendItem color="bg-accent-green" label=">= 75% Baik" />
          <LegendItem color="bg-accent-gold" label="40-74% Sedang" />
          <LegendItem color="bg-accent-red" label="< 40% Rendah" />
        </div>
      </footer>
    </div>
  );
}

function SummaryCard({ label, color, children }: { label: string; color: string; children: React.ReactNode }) {
  return (
    <div className="summary-card flex flex-col items-center justify-center" style={{ padding: "1.5vh 0.5vw" }}>
      <h3
        className="text-text-secondary uppercase tracking-wider font-medium text-center"
        style={{ fontSize: "clamp(0.5rem, 0.6vw, 0.7rem)", marginBottom: "0.3vh" }}
      >
        {label}
      </h3>
      <p className={`${color} font-semibold`} style={{ fontSize: "clamp(0.9rem, 1.3vw, 1.6rem)" }}>
        {children}
      </p>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center" style={{ gap: "0.3vw" }}>
      <div className={`legend-box ${color}`} />
      <span>{label}</span>
    </div>
  );
}

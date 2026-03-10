"use client";

import { useRef } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Chart } from "react-chartjs-2";
import type { SiteProfit } from "./actions";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend
);

const fmt = (n: number) => "¥" + Math.round(Math.abs(n)).toLocaleString("ja-JP");
const pct = (s: number, c: number) => (s === 0 ? 0 : ((s - c) / s) * 100);

export function ProfitChart({ sites }: { sites: SiteProfit[] }) {
  const chartRef = useRef<ChartJS | null>(null);

  const labels = sites.map((s) =>
    s.name.length > 10 ? s.name.slice(0, 10) + "…" : s.name
  );
  const costs = sites.map((s) => s.total_cost);
  const profits = sites.map((s) => s.gross_profit);
  const rates = sites.map((s) => pct(s.sales, s.total_cost));

  const maxRate = rates.length > 0
    ? Math.max(50, ...rates.map((r) => Math.ceil(r / 10) * 10 + 10))
    : 50;

  return (
    <Chart
      ref={chartRef}
      type="bar"
      data={{
        labels,
        datasets: [
          {
            type: "bar" as const,
            label: "原価",
            data: costs,
            backgroundColor: "#c8d8e8",
            borderColor: "#c8d8e8",
            borderWidth: 1,
            stack: "stack1",
            barPercentage: 0.65,
            maxBarThickness: 80,
            yAxisID: "y",
            order: 2,
          },
          {
            type: "bar" as const,
            label: "粗利益",
            data: profits,
            backgroundColor: "#1a7a4a",
            borderColor: "#1a7a4a",
            borderWidth: 1,
            stack: "stack1",
            barPercentage: 0.65,
            maxBarThickness: 80,
            yAxisID: "y",
            order: 1,
          },
          {
            type: "line" as const,
            label: "粗利率",
            data: rates,
            borderColor: "#2E8B9A",
            backgroundColor: "rgba(46,139,154,0.06)",
            borderWidth: 1.5,
            pointBackgroundColor: "#2E8B9A",
            pointBorderColor: "#ffffff",
            pointRadius: 4,
            pointHoverRadius: 6,
            tension: 0.3,
            fill: false,
            yAxisID: "yRate",
            order: 0,
          },
        ],
      }}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { top: 10 } },
        plugins: {
          legend: {
            labels: {
              color: "#6a8a9e",
              font: { family: "'Inter', sans-serif", weight: 500, size: 10 },
            },
          },
          tooltip: {
            backgroundColor: "#ffffff",
            borderColor: "#e2e6ec",
            borderWidth: 1,
            titleColor: "#1a2332",
            titleFont: { family: "'Noto Sans JP', sans-serif", weight: 500 },
            bodyColor: "#4a6a82",
            bodyFont: { family: "'Inter', monospace" },
            padding: 14,
            callbacks: {
              title: (c: any[]) => sites[c[0].dataIndex]?.name ?? "",
              label: (c: any) => {
                if (c.dataset.label === "粗利率") {
                  return `  粗利率  : ${rates[c.dataIndex].toFixed(1)}%`;
                }
                return `  ${c.dataset.label} : ${fmt(c.raw as number)}`;
              },
              afterBody: (c: any[]) => {
                const i = c[0].dataIndex;
                return [`  ─────────────`, `  売上合計 : ${fmt(sites[i].sales)}`];
              },
            },
          },
        },
        scales: {
          x: {
            ticks: {
              color: "#8a9bb0",
              font: { family: "'Inter', sans-serif", weight: 500, size: 10 },
              maxRotation: 30,
            },
            grid: { display: false },
          },
          y: {
            position: "left" as const,
            ticks: {
              color: "#8a9bb0",
              font: { family: "'Inter', sans-serif", weight: 500, size: 10 },
              callback: (v: any) => Math.round(Number(v)).toLocaleString("ja-JP"),
            },
            grid: { color: "rgba(0,0,0,0.025)" },
          },
          yRate: {
            position: "right" as const,
            min: 0,
            max: maxRate,
            ticks: {
              color: "#2E8B9A",
              font: { family: "'Inter', sans-serif", weight: 500, size: 10 },
              callback: (v: any) => v + "%",
            },
            grid: { drawOnChartArea: false },
          },
        },
      } as any}
    />
  );
}

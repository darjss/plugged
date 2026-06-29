import * as d3 from "d3";
import { createMemo, createSignal, For, onCleanup, onMount, Show } from "solid-js";

import { cn } from "@/lib/utils";

interface FrequencyPoint {
  freq: number;
  db: number;
}

interface FrequencyResponse {
  left: FrequencyPoint[];
  right: FrequencyPoint[];
  product: { name: string; slug: string };
}

interface Props {
  slug: string;
  productName: string;
  apiBase: string;
}

const ORANGE = "#ff6b1a";
const PINK = "#ff2e88";
const INK = "#1a1714";

const MARGIN = { top: 28, right: 16, bottom: 36, left: 48 };
const HEIGHT = 380;
const X_TICKS = [20, 100, 1000, 10000, 20000];

/** Interpolate dB at a target frequency from a sorted-by-freq channel. */
function interpDb(channel: FrequencyPoint[], freq: number): number | null {
  if (channel.length === 0) return null;
  if (freq <= channel[0]!.freq) return channel[0]!.db;
  if (freq >= channel[channel.length - 1]!.freq) return channel[channel.length - 1]!.db;
  // Binary search for the bracketing pair.
  let lo = 0;
  let hi = channel.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (channel[mid]!.freq <= freq) lo = mid;
    else hi = mid;
  }
  const a = channel[lo]!;
  const b = channel[hi]!;
  const t = (freq - a.freq) / (b.freq - a.freq);
  return a.db + t * (b.db - a.db);
}

export default function FrequencyResponseChart(props: Props) {
  const [data, setData] = createSignal<FrequencyResponse | null>(null);
  const [failed, setFailed] = createSignal(false);
  const [width, setWidth] = createSignal(640);
  const [dbRange, setDbRange] = createSignal(50);
  const [hover, setHover] = createSignal<{ x: number; freq: number; l: number | null; r: number | null } | null>(null);

  let containerRef: HTMLDivElement | undefined;

  onMount(async () => {
    try {
      const res = await fetch(`${props.apiBase}/api/products/${props.slug}/frequency-response`);
      if (!res.ok) {
        setFailed(true);
        return;
      }
      setData((await res.json()) as FrequencyResponse);
    } catch {
      setFailed(true);
    }

    if (!containerRef) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w && w > 0) setWidth(w);
    });
    ro.observe(containerRef);
    onCleanup(() => ro.disconnect());
  });

  const innerWidth = () => Math.max(160, width() - MARGIN.left - MARGIN.right);
  const innerHeight = () => HEIGHT - MARGIN.top - MARGIN.bottom;

  const xScale = createMemo(() =>
    d3.scaleLog().domain([20, 20000]).range([0, innerWidth()]),
  );
  const yScale = createMemo(() =>
    d3.scaleLinear().domain([-dbRange(), dbRange()]).range([innerHeight(), 0]),
  );

  const lineGen = (channel: FrequencyPoint[]) =>
    d3
      .line<FrequencyPoint>()
      .x((d) => xScale()(d.freq))
      .y((d) => yScale()(d.db))
      .curve(d3.curveMonotoneX)(channel) ?? "";

  const xAxisTicks = () =>
    X_TICKS.map((f) => ({
      f,
      x: xScale()(f),
      label: f >= 1000 ? `${f / 1000}k` : `${f}`,
    }));

  const yAxisTicks = () => yScale().ticks(6).map((t) => ({ t, y: yScale()(t) }));

  const onMove = (e: MouseEvent) => {
    const svg = e.currentTarget as SVGElement;
    const rect = svg.getBoundingClientRect();
    const px = e.clientX - rect.left - MARGIN.left;
    if (px < 0 || px > innerWidth()) {
      setHover(null);
      return;
    }
    const freq = xScale().invert(px);
    const d = data();
    if (!d) return;
    setHover({
      x: px,
      freq,
      l: interpDb(d.left, freq),
      r: interpDb(d.right, freq),
    });
  };

  const onLeave = () => setHover(null);

  const fmtFreq = (f: number) => (f >= 1000 ? `${(f / 1000).toFixed(f >= 10000 ? 0 : 1)}k` : `${Math.round(f)}`);
  const fmtDb = (v: number | null) => (v === null ? "—" : `${v.toFixed(1)} dB`);

  const loading = () => !failed() && !data();

  return (
    <Show when={!failed() && data()} fallback={
      <Show when={loading()}>
        <section class="mt-10 sm:mt-12" style={{ "min-height": "200px" }}>
          <div class="mb-4 flex items-center gap-3">
            <h2 class="-rotate-1 border-2 border-ink bg-pink px-3 py-1 font-display text-heading-lg font-black uppercase tracking-tight text-ink shadow-hard-sm">
              Frequency response
            </h2>
            <span class="font-mono text-micro font-black uppercase tracking-widest text-ink-muted">
              loading…
            </span>
          </div>
          <div class="clip-torn-edges flex items-center justify-center border-2 border-ink bg-card p-10 shadow-hard-lg" style={{ "min-height": "160px" }}>
            <span class="font-mono text-caption font-black uppercase tracking-widest text-ink-muted animate-pulse">
              Fetching squig.link data…
            </span>
          </div>
        </section>
      </Show>
    }>
      {(d) => (
        <section class="mt-10 sm:mt-12">
          {/* Header stamp */}
          <div class="mb-4 flex items-center gap-3">
            <h2 class="-rotate-1 border-2 border-ink bg-pink px-3 py-1 font-display text-heading-lg font-black uppercase tracking-tight text-ink shadow-hard-sm">
              Frequency response
            </h2>
            <span class="font-mono text-micro font-black uppercase tracking-widest text-ink-muted">
              squig.link · measured
            </span>
          </div>

          {/* Chart frame — torn paper, halftone grid */}
          <div class="clip-torn-edges relative border-2 border-ink bg-card shadow-hard-lg" ref={containerRef}>
            <div class="bg-halftone pointer-events-none absolute inset-0 opacity-10" aria-hidden="true" />

            <div class="relative z-10 p-3 sm:p-5">
              <svg
                width="100%"
                height={HEIGHT}
                viewBox={`0 0 ${width()} ${HEIGHT}`}
                preserveAspectRatio="xMidYMid meet"
                class="block"
                onMouseMove={onMove}
                onMouseLeave={onLeave}
              >
                <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
                  {/* Plot background */}
                  <rect x={0} y={0} width={innerWidth()} height={innerHeight()} fill="transparent" />

                  {/* Y gridlines */}
                  <For each={yAxisTicks()}>
                    {(tick) => (
                      <line
                        x1={0}
                        x2={innerWidth()}
                        y1={tick.y}
                        y2={tick.y}
                        stroke={INK}
                        stroke-opacity={0.12}
                        stroke-width={1}
                      />
                    )}
                  </For>

                  {/* 0 dB reference line */}
                  <line
                    x1={0}
                    x2={innerWidth()}
                    y1={yScale()(0)}
                    y2={yScale()(0)}
                    stroke={INK}
                    stroke-opacity={0.4}
                    stroke-width={1}
                    stroke-dasharray="4 3"
                  />

                  {/* X gridlines */}
                  <For each={xAxisTicks()}>
                    {(tick) => (
                      <line
                        x1={tick.x}
                        x2={tick.x}
                        y1={0}
                        y2={innerHeight()}
                        stroke={INK}
                        stroke-opacity={0.12}
                        stroke-width={1}
                      />
                    )}
                  </For>

                  {/* Left channel — hazard orange */}
                  <path d={lineGen(d().left)} fill="none" stroke={ORANGE} stroke-width={2} stroke-linejoin="round" />
                  {/* Right channel — acid pink */}
                  <path d={lineGen(d().right)} fill="none" stroke={PINK} stroke-width={2} stroke-linejoin="round" />

                  {/* X axis */}
                  <For each={xAxisTicks()}>
                    {(tick) => (
                      <g transform={`translate(${tick.x},${innerHeight()})`}>
                        <line y1={0} y2={5} stroke={INK} stroke-width={1.5} />
                        <text y={18} text-anchor="middle" font-family="var(--font-mono)" font-size="11" font-weight="700" fill={INK}>
                          {tick.label}
                        </text>
                      </g>
                    )}
                  </For>
                  <text
                    x={innerWidth() / 2}
                    y={innerHeight() + 32}
                    text-anchor="middle"
                    font-family="var(--font-mono)"
                    font-size="10"
                    font-weight="800"
                    fill={INK}
                    opacity={0.6}
                  >
                    FREQUENCY (Hz)
                  </text>

                  {/* Y axis labels */}
                  <For each={yAxisTicks()}>
                    {(tick) => (
                      <g transform={`translate(0,${tick.y})`}>
                        <line x1={-5} x2={0} stroke={INK} stroke-width={1.5} />
                        <text x={-9} dy="0.32em" text-anchor="end" font-family="var(--font-mono)" font-size="11" font-weight="700" fill={INK}>
                          {tick.t}
                        </text>
                      </g>
                    )}
                  </For>
                  <text
                    x={-MARGIN.left + 12}
                    y={-8}
                    font-family="var(--font-mono)"
                    font-size="10"
                    font-weight="800"
                    fill={INK}
                    opacity={0.6}
                  >
                    dB
                  </text>

                  {/* IEM name label — top left, mono uppercase */}
                  <text x={4} y={14} font-family="var(--font-mono)" font-size="12" font-weight="900" fill={INK} opacity={0.85}>
                    {props.productName.toUpperCase()}
                  </text>

                  {/* Hover guide + tooltip */}
                  <Show when={hover()}>
                    {(h) => (
                      <>
                        <line
                          x1={h().x}
                          x2={h().x}
                          y1={0}
                          y2={innerHeight()}
                          stroke={INK}
                          stroke-opacity={0.5}
                          stroke-width={1}
                          stroke-dasharray="3 2"
                        />
                        <circle cx={h().x} cy={yScale()(h().l ?? 0)} r={3.5} fill={ORANGE} stroke={INK} stroke-width={1} />
                        <circle cx={h().x} cy={yScale()(h().r ?? 0)} r={3.5} fill={PINK} stroke={INK} stroke-width={1} />
                      </>
                    )}
                  </Show>
                </g>
              </svg>

              {/* Hover readout — mono stamp */}
              <Show when={hover()}>
                {(h) => (
                  <div class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-caption font-black uppercase tracking-wide text-ink">
                    <span>{fmtFreq(h().freq)} Hz</span>
                    <span class="flex items-center gap-1.5">
                      <span class="inline-block size-2.5 border border-ink" style={{ background: ORANGE }} />
                      L {fmtDb(h().l)}
                    </span>
                    <span class="flex items-center gap-1.5">
                      <span class="inline-block size-2.5 border border-ink" style={{ background: PINK }} />
                      R {fmtDb(h().r)}
                    </span>
                  </div>
                )}
              </Show>

              {/* dB range slider + legend */}
              <div class="mt-3 flex flex-wrap items-center justify-between gap-3 border-t-2 border-ink/20 pt-3">
                <div class="flex items-center gap-3">
                  <span class="font-mono text-micro font-black uppercase tracking-wide text-ink-muted">
                    L
                  </span>
                  <span class="inline-block h-1.5 w-6 border border-ink" style={{ background: ORANGE }} />
                  <span class="font-mono text-micro font-black uppercase tracking-wide text-ink-muted">
                    R
                  </span>
                  <span class="inline-block h-1.5 w-6 border border-ink" style={{ background: PINK }} />
                </div>
                <label class="flex items-center gap-2 font-mono text-micro font-black uppercase tracking-wide text-ink-muted">
                  ±{dbRange()} dB
                  <input
                    type="range"
                    min={10}
                    max={50}
                    step={5}
                    value={dbRange()}
                    onInput={(e) => setDbRange(Number(e.currentTarget.value))}
                    class={cn("accent-[var(--color-orange)]")}
                  />
                </label>
              </div>
            </div>
          </div>
        </section>
      )}
    </Show>
  );
}

<script lang="ts">
  import { untrack } from 'svelte';
  import { DRIVERS, WARMING_PRESETS, WARMING_TODAY, extraWarming, isNoChange, type Driver, type Scenario } from '../lib/scenario';

  interface Props {
    scenario: Scenario;
  }
  let { scenario = $bindable() }: Props = $props();

  const untouched = $derived(isNoChange(scenario));
  const warming = DRIVERS.find((d) => d.id === 'warming') as Driver;
  /** The sweep raises warming by this many °C a second. */
  const SWEEP_RATE = 1;

  let sweeping = $state(false);

  function reset() {
    sweeping = false;
    for (const d of DRIVERS) scenario[d.id] = 0;
  }

  const snap = (d: Driver, n: number): number => {
    const v = Math.min(d.max, Math.max(0, Math.round(n / d.step) * d.step));
    return +v.toFixed(d.step < 1 ? 1 : 0);
  };

  /** A typed value: ignored while it is not a number yet (an empty box, a lone "-"). */
  function typed(d: Driver, raw: string) {
    const n = Number(raw);
    if (raw.trim() === '' || !Number.isFinite(n)) return;
    sweeping = false;
    scenario[d.id] = snap(d, n);
  }

  /** When the box is left, show what the app took from it. */
  function settle(d: Driver, box: HTMLInputElement) {
    if (box.value.trim() === '' || !Number.isFinite(Number(box.value))) scenario[d.id] = 0;
    box.value = String(scenario[d.id]);
  }

  // The sweep plays warming from where it is up to the top of the slider, then stops. Touching anything
  // that moves warming (a slider, a chip, a typed value) stops it too.
  $effect(() => {
    if (!sweeping) return;
    let raf = 0;
    let last = performance.now();
    let w = untrack(() => (scenario.warming >= warming.max ? 0 : scenario.warming));
    let expected = untrack(() => scenario.warming);
    const tick = (now: number) => {
      if (untrack(() => scenario.warming) !== expected) {
        sweeping = false;
        return;
      }
      w = Math.min(warming.max, w + ((now - last) / 1000) * SWEEP_RATE);
      last = now;
      expected = +w.toFixed(1);
      scenario.warming = expected;
      if (w >= warming.max) {
        sweeping = false;
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  });
</script>

<section class="bar" aria-label="What-if pressures">
  <header>
    <p>
      <strong>What if…</strong>
      <span>Drag a slider or type an exact value; every animal's score changes at once.</span>
    </p>

    <div class="tools">
      <div class="presets" role="group" aria-label="Warming scenarios, in °C above 1850–1900">
        <span class="lead">Warming to</span>
        {#each WARMING_PRESETS as p (p.total)}
          {@const extra = extraWarming(p.total)}
          <button
            type="button"
            class:on={Math.abs(scenario.warming - extra) < 0.05}
            aria-pressed={Math.abs(scenario.warming - extra) < 0.05}
            title="{p.total} °C above 1850–1900 is +{extra.toFixed(1)} °C from today (about {WARMING_TODAY} °C now). {p.note}"
            onclick={() => {
              sweeping = false;
              scenario.warming = extra;
            }}>{p.total} °C</button
          >
        {/each}
        <button
          type="button"
          class="sweep"
          class:on={sweeping}
          aria-pressed={sweeping}
          title="Play warming from where it is up to +{warming.max} °C"
          onclick={() => (sweeping = !sweeping)}>{sweeping ? '■ Stop' : '▶ Sweep'}</button
        >
      </div>
      <button type="button" class="reset" onclick={reset} disabled={untouched}>Reset</button>
    </div>
  </header>

  <div class="grid">
    {#each DRIVERS as d (d.id)}
      {@const value = scenario[d.id]}
      <div class="ctl" class:on={value > 0}>
        <div class="row">
          <label class="name" for="driver-{d.id}">{d.label}</label>
          <span class="entry">
            {#if d.plus}<span class="sign" aria-hidden="true">+</span>{/if}<input
              class="num"
              type="number"
              inputmode="decimal"
              min="0"
              max={d.max}
              step={d.step}
              value={value}
              aria-label="{d.label}, exact value in {d.unit}"
              oninput={(e) => typed(d, e.currentTarget.value)}
              onchange={(e) => settle(d, e.currentTarget)}
            /><span class="unit" aria-hidden="true">{d.unit}</span>
          </span>
        </div>
        <input
          id="driver-{d.id}"
          type="range"
          min="0"
          max={d.max}
          step={d.step}
          bind:value={scenario[d.id]}
          oninput={() => (sweeping = false)}
          aria-valuetext={value === 0 ? 'Today' : d.format(value)}
          style:--fill="{(value / d.max) * 100}%"
        />
        <span class="hint" title={d.hint}>{d.hint}</span>
      </div>
    {/each}
  </div>
</section>

<style>
  .bar {
    padding: 14px 32px 14px;
    background: var(--panel);
    border-top: 1px solid var(--line);
  }

  header {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px 20px;
    margin-bottom: 12px;
  }
  header p {
    margin: 0;
    font-size: 13px;
    color: var(--muted);
  }
  header strong {
    margin-right: 6px;
    font-family: var(--serif);
    font-size: 20px;
    font-weight: 500;
    letter-spacing: -0.01em;
    color: var(--ink);
  }
  .tools {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 14px;
  }
  .presets {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px 6px;
  }
  .lead {
    margin-right: 2px;
    font-size: 12px;
    color: var(--muted);
  }
  .presets button,
  .reset {
    padding: 3px 9px;
    border: 1px solid var(--line-strong);
    border-radius: 999px;
    background: transparent;
    color: var(--ink-2);
    font-size: 12px;
    font-variant-numeric: tabular-nums;
  }
  .reset {
    border-radius: var(--radius);
    padding: 4px 10px;
    font-size: 12.5px;
  }
  .presets button:hover,
  .reset:hover:not(:disabled) {
    background: var(--hover);
    border-color: var(--ink-2);
    color: var(--ink);
  }
  .presets button.on {
    border-color: var(--accent);
    background: color-mix(in srgb, var(--accent) 12%, transparent);
    color: var(--accent-ink);
    font-weight: 600;
  }
  .presets .sweep {
    border-style: dashed;
  }
  .reset:disabled {
    cursor: default;
    opacity: 0.45;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 12px 24px;
  }
  .ctl {
    display: flex;
    flex-direction: column;
    gap: 5px;
    min-width: 0;
  }
  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
  }
  .name {
    min-width: 0;
    overflow: hidden;
    font-size: 12.5px;
    font-weight: 600;
    color: var(--ink);
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .entry {
    flex: none;
    display: inline-flex;
    align-items: baseline;
    gap: 1px;
    font-size: 12.5px;
    color: var(--muted);
  }
  .ctl.on .entry {
    color: var(--accent-ink);
  }
  .num {
    width: 3.6ch;
    padding: 1px 0;
    border: 0;
    border-bottom: 1px solid transparent;
    background: transparent;
    color: inherit;
    font-size: 12.5px;
    font-weight: 600;
    text-align: right;
    font-variant-numeric: tabular-nums;
    -moz-appearance: textfield;
    appearance: textfield;
  }
  .num::-webkit-outer-spin-button,
  .num::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  .num:hover {
    border-bottom-color: var(--line-strong);
  }
  .num:focus-visible {
    outline: none;
    border-bottom-color: var(--accent);
  }
  .unit {
    margin-left: 2px;
  }
  .hint {
    overflow: hidden;
    font-size: 11.5px;
    line-height: 1.3;
    color: var(--muted);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  input[type='range'] {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 20px;
    margin: 0;
    background: transparent;
    cursor: pointer;
  }
  input[type='range']::-webkit-slider-runnable-track {
    height: 4px;
    border-radius: 2px;
    background: linear-gradient(90deg, var(--accent) var(--fill), var(--line-strong) var(--fill));
  }
  input[type='range']::-moz-range-track {
    height: 4px;
    border-radius: 2px;
    background: linear-gradient(90deg, var(--accent) var(--fill), var(--line-strong) var(--fill));
  }
  input[type='range']::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    margin-top: -6px;
    border: 2px solid var(--accent);
    border-radius: 50%;
    background: var(--panel);
  }
  input[type='range']::-moz-range-thumb {
    width: 12px;
    height: 12px;
    border: 2px solid var(--accent);
    border-radius: 50%;
    background: var(--panel);
  }
  input[type='range']:focus-visible {
    outline: none;
  }
  input[type='range']:focus-visible::-webkit-slider-thumb {
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--accent) 25%, transparent);
  }
  input[type='range']:focus-visible::-moz-range-thumb {
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--accent) 25%, transparent);
  }

  @media (max-width: 720px) {
    .bar {
      padding: 12px 20px 14px;
    }
    header p span {
      display: none;
    }
  }
</style>

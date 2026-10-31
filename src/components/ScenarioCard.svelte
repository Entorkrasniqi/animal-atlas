<script lang="ts">
  import { DRIVERS, DRIVER_BY_ID, LEVEL_LABEL, toneOf, type Assessment, type Scenario } from '../lib/scenario';
  import { STATUS_LABEL, type Animal } from '../lib/types';

  interface Props {
    animal: Animal;
    assessment: Assessment;
    scenario: Scenario;
  }
  let { animal, assessment, scenario }: Props = $props();

  const tone = $derived(toneOf(assessment.score));
  const biggest = $derived(Math.max(1, ...assessment.parts.map((p) => p.points)));
  /** Sliders that are up but do little or nothing to this animal. */
  const spared = $derived(
    DRIVERS.filter((d) => scenario[d.id] > 0 && !assessment.parts.some((p) => p.id === d.id)).map((d) => d.label.toLowerCase()),
  );
</script>

<section class="card" aria-label="Scenario risk for {animal.name}">
  <h3>Under this scenario</h3>

  <div class="score" style="--c: var(--s-{tone})">
    <b>{assessment.score}</b><span class="of">/ 100</span>
    <p>
      {#if assessment.rise > 0}
        <strong>+{assessment.rise}</strong> from today's {assessment.baseline}
      {:else}
        Today's score, from its {STATUS_LABEL[animal.status]} status
      {/if}
    </p>
  </div>

  <div class="meter" aria-hidden="true">
    <i style="width: {assessment.score}%; background: var(--s-{tone})"></i>
    {#if assessment.rise > 0}<u style="left: {assessment.baseline}%"></u>{/if}
  </div>

  {#if assessment.parts.length}
    <ul class="parts">
      {#each assessment.parts as p (p.id)}
        <li>
          <div class="line">
            <span class="name">{DRIVER_BY_ID.get(p.id)?.label}</span>
            <span class="pts">+{Math.round(p.points)}</span>
          </div>
          <div class="mini" aria-hidden="true"><i style="width: {(p.points / biggest) * 100}%"></i></div>
          <p>{LEVEL_LABEL[p.level]} to this species. {p.detail}.</p>
        </li>
      {/each}
    </ul>
  {:else}
    <p class="idle">Raise a pressure below the map to see how it would hit {animal.name.toLowerCase()}.</p>
  {/if}

  {#if spared.length}
    <p class="spared">Little or no effect from {spared.join(', ')}: not a known threat to this species.</p>
  {/if}
  <p class="why">{assessment.fragilityNote}</p>
</section>

<style>
  .card {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 14px 16px 14px;
    border: 1px solid var(--line-strong);
    border-radius: var(--radius);
    background: var(--bg);
  }
  h3 {
    margin: 0;
    font-family: var(--sans);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    color: var(--muted);
  }
  .score {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 0 6px;
  }
  .score b {
    font-family: var(--serif);
    font-size: 40px;
    font-weight: 500;
    line-height: 1;
    letter-spacing: -0.02em;
    color: var(--c);
    font-variant-numeric: lining-nums tabular-nums;
  }
  .of {
    font-size: 13px;
    color: var(--muted);
  }
  .score p {
    flex-basis: 100%;
    margin: 4px 0 0;
    font-size: 12.5px;
    color: var(--muted);
  }
  .score p strong {
    color: var(--accent-ink);
  }

  .meter {
    position: relative;
    height: 6px;
    border-radius: 3px;
    background: var(--line);
  }
  .meter i {
    position: absolute;
    inset: 0 auto 0 0;
    border-radius: 3px;
    transition: width 0.12s ease-out;
  }
  /* Where it stands today. */
  .meter u {
    position: absolute;
    top: -3px;
    bottom: -3px;
    width: 2px;
    background: var(--ink);
    text-decoration: none;
  }

  .parts {
    display: flex;
    flex-direction: column;
    gap: 11px;
    margin: 2px 0 0;
    padding: 0;
    list-style: none;
  }
  .line {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
  }
  .name {
    font-size: 13px;
    font-weight: 600;
  }
  .pts {
    font-size: 13px;
    font-weight: 600;
    color: var(--accent-ink);
    font-variant-numeric: tabular-nums;
  }
  .mini {
    height: 3px;
    margin: 4px 0 5px;
    border-radius: 2px;
    background: var(--line);
  }
  .mini i {
    display: block;
    height: 100%;
    border-radius: 2px;
    background: var(--accent);
  }
  li p {
    margin: 0;
    font-size: 12px;
    line-height: 1.45;
    color: var(--muted);
  }

  .idle,
  .spared,
  .why {
    margin: 0;
    font-size: 12px;
    line-height: 1.45;
    color: var(--muted);
  }
  .why {
    padding-top: 8px;
    border-top: 1px solid var(--line);
  }
</style>

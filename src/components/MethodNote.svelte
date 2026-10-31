<script lang="ts">
  import { DRIVERS } from '../lib/scenario';
  import Icon from './Icon.svelte';
</script>

<details class="method">
  <summary>How the scores work</summary>
  <div class="body">
    <p>
      A score from 0 to 100 compares animals; it is <strong>not a forecast</strong>. It starts from the animal's IUCN
      status today. Each slider then adds pressure, scaled by how much of it reaches the animal (warming depends on where its
      range lies: land and the far north warm fastest) and by how strongly that pressure threatens the species. A small
      population or range magnifies every pressure.
    </p>
    <p>
      How strongly each pressure threatens each species is an estimate made by hand from the threats listed for it, not IUCN
      data. Treat the ranking as a way to ask "what hits whom?", not as a prediction of when anything will disappear.
    </p>
    <h3>Why these six pressures</h3>
    <ul>
      {#each DRIVERS as d (d.id)}
        <li>
          <strong>{d.label}.</strong>
          {d.fact}
          <span class="src">
            {#each d.sources as s, i (s.url)}{i > 0 ? ' · ' : ''}<a href={s.url} target="_blank" rel="noopener noreferrer">{s.label}<Icon name="external" size={11} /></a>{/each}
          </span>
        </li>
      {/each}
    </ul>
  </div>
</details>

<style>
  .method {
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--bg);
    font-size: 12.5px;
    line-height: 1.5;
    color: var(--ink-2);
  }
  summary {
    padding: 8px 12px;
    cursor: pointer;
    font-weight: 500;
    color: var(--ink);
  }
  summary:hover {
    color: var(--accent-ink);
  }
  .body {
    max-height: 42vh;
    overflow-y: auto;
    padding: 0 12px 12px;
  }
  p {
    margin: 0 0 8px;
  }
  h3 {
    margin: 12px 0 6px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    color: var(--muted);
  }
  ul {
    display: flex;
    flex-direction: column;
    gap: 9px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  strong {
    font-weight: 600;
    color: var(--ink);
  }
  .src {
    display: block;
    margin-top: 2px;
    font-size: 11.5px;
    color: var(--muted);
  }
  a {
    color: var(--ink-2);
    text-decoration: underline;
    text-decoration-color: var(--line-strong);
    text-underline-offset: 2px;
  }
  a:hover {
    color: var(--accent-ink);
    text-decoration-color: var(--accent);
  }
  a :global(svg) {
    margin-left: 3px;
    vertical-align: -1px;
  }
</style>

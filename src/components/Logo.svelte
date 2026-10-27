<script module lang="ts">
  let count = 0;
</script>

<script lang="ts">
  let { size = 22 }: { size?: number } = $props();
  // Each copy needs its own gradient id: a gradient inside a hidden <svg> does not resolve for the others.
  const id = `logo-heat-${count++}`;
</script>

<!-- A globe shaded with the map's own cold-to-hot ramp, circled by the timeline. -->
<svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
  <defs>
    <linearGradient id={id} x1="8" y1="26" x2="25" y2="6" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#8fc3e0" />
      <stop offset="0.3" stop-color="#dcbd68" />
      <stop offset="0.55" stop-color="#f0a050" />
      <stop offset="0.8" stop-color="#d9532f" />
      <stop offset="1" stop-color="#a11d2b" />
    </linearGradient>
  </defs>
  <g transform="rotate(-24 16 16)">
    <path d="M1.5 16a14.5 5.6 0 0 1 29 0" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" opacity="0.55" />
  </g>
  <circle cx="16" cy="16" r="10" fill="url(#{id})" />
  <g stroke="#fbfaf7" stroke-width="1" opacity="0.6">
    <ellipse cx="16" cy="16" rx="4.3" ry="10" />
    <path d="M6 16h20" />
  </g>
  <circle cx="19.6" cy="11.6" r="1.7" fill="#fbfaf7" />
  <g transform="rotate(-24 16 16)">
    <path d="M1.5 16a14.5 5.6 0 0 0 29 0" stroke="var(--bg, #f4f3ee)" stroke-width="3.6" stroke-linecap="round" />
    <path d="M1.5 16a14.5 5.6 0 0 0 29 0" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" />
    <circle cx="30.5" cy="16" r="1.9" fill="var(--accent, #c15f3c)" />
  </g>
</svg>

<script lang="ts">
  let { size = 22 }: { size?: number } = $props();
</script>

<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
  <circle cx="12" cy="12" r="9.25" />
  <path d="M2.75 12h18.5" />
  <ellipse cx="12" cy="12" rx="4" ry="9.25" />
</svg>

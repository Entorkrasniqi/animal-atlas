<script lang="ts">
  type Name = 'search' | 'plus' | 'minus' | 'reset' | 'target' | 'close' | 'play' | 'pause';
  let { name, size = 16 }: { name: Name; size?: number } = $props();
</script>

<svg
  width={size}
  height={size}
  viewBox="0 0 16 16"
  fill="none"
  stroke="currentColor"
  stroke-width="1.5"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
>
  {#if name === 'search'}
    <circle cx="7" cy="7" r="4.5" />
    <path d="M10.4 10.4 14 14" />
  {:else if name === 'plus'}
    <path d="M8 3v10M3 8h10" />
  {:else if name === 'minus'}
    <path d="M3 8h10" />
  {:else if name === 'reset'}
    <path d="M2.5 6V2.5H6M13.5 6V2.5H10M2.5 10v3.5H6M13.5 10v3.5H10" />
  {:else if name === 'target'}
    <circle cx="8" cy="8" r="2.5" />
    <path d="M8 1.5v3M8 11.5v3M1.5 8h3M11.5 8h3" />
  {:else if name === 'close'}
    <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" />
  {:else if name === 'play'}
    <path d="M5.5 3.5v9l7-4.5z" fill="currentColor" stroke="none" />
  {:else if name === 'pause'}
    <path d="M4.5 3.5h2.5v9H4.5zM9 3.5h2.5v9H9z" fill="currentColor" stroke="none" />
  {/if}
</svg>

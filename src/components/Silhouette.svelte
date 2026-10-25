<script lang="ts">
  interface Props {
    /** Public path of the SVG, e.g. "/silhouettes/x.svg". */
    src?: string;
    /** Describes the image for screen readers; omit when the name is shown next to it. */
    label?: string;
  }
  let { src, label }: Props = $props();
</script>

<!-- A mask lets one SVG take any theme colour via `color`. -->
<span
  class="sil"
  class:empty={!src}
  style:--src={src ? `url(${src})` : 'none'}
  role={label ? 'img' : undefined}
  aria-label={label}
  aria-hidden={label ? undefined : 'true'}
></span>

<style>
  .sil {
    display: block;
    flex: none;
    width: var(--w, 36px);
    height: var(--h, 24px);
    background: currentColor;
    -webkit-mask: var(--src) center / contain no-repeat;
    mask: var(--src) center / contain no-repeat;
  }
  .sil.empty {
    background: none;
  }
</style>

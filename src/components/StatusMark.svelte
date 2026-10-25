<script lang="ts">
  import type { IucnStatus } from '../lib/types';

  interface Props {
    kind: IucnStatus | 'ALIVE';
    /** Overrides the visible text (defaults to the code). */
    text?: string;
  }
  let { kind, text }: Props = $props();
</script>

<span class="mark" style="--c: var(--s-{kind})"><i aria-hidden="true"></i>{text ?? kind}</span>

<style>
  .mark {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 11.5px;
    font-weight: 600;
    letter-spacing: 0.03em;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }
  i {
    flex: none;
    width: 8px;
    height: 8px;
    border-radius: 2px;
    background: var(--c);
  }
</style>

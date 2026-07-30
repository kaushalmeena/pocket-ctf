type Payload = { path: string; width: number; height: number; pointCount: number };

export default function Page(props: { payload: Payload }) {
  return (
    <div class="space-y-5">
      <p class="prose-mini">
        One <code>&lt;path&gt;</code>, {props.payload.pointCount} points, drawn exactly as
        specified. It looks like noise because it is noise — in one axis.
      </p>

      <figure class="space-y-3">
        <svg
          viewBox={`0 0 ${props.payload.width} ${props.payload.height}`}
          class="w-full rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900"
          role="img"
          aria-label="A jagged polyline"
        >
          <title>A jagged polyline</title>
          <path
            d={props.payload.path}
            fill="none"
            stroke="currentColor"
            stroke-width="1"
            class="text-accent-500"
          />
        </svg>
        <figcaption class="prose-mini">
          An SVG path is text. Open the element, copy the <code>d</code> attribute, and you have
          every coordinate the renderer had.
        </figcaption>
      </figure>

      <p class="prose-mini">
        Look at the coordinates rather than the picture. One of the two axes marches steadily
        from left to right and carries nothing at all. The other was told to land on a specific
        side of a very small line, over and over, {props.payload.pointCount} times.
      </p>
    </div>
  );
}

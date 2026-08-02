// Geisel Library — vector recreation with transparent bg + die-cut sticker
// outline. Ported from the Figma Make design's own SVG (the raster
// "ChatGPT sticker" asset isn't exportable from the Make file, and a vector
// is self-contained, scalable, and transparent so it works on the dark nav).

export function GeiselLogo({ width = 320, stickerOutline = true }: { width?: number; stickerOutline?: boolean }) {
  const VW = 320, VH = 228;
  const svgH = Math.round((width / VW) * VH);

  const BL  = "#92c4e8";   // slab blue
  const BD  = "#68a8d8";   // slab shadow
  const BHI = "#c4ddf2";   // slab highlight
  const GR  = "#9aaabb";   // concrete
  const GRD = "#6a7a8c";   // concrete shadow
  const GDK = "#4e5c6e";   // concrete deep shadow
  const OL  = "#222638";   // outline

  function slab(x: number, y: number, w: number, h: number) {
    return (
      <>
        <rect x={x} y={y} width={w} height={h} fill={BL} stroke={OL} strokeWidth={2.5} rx={2} />
        <rect x={x + 3} y={y + 3} width={w - 6} height={9} fill={BHI} rx={1} />
        <rect x={x + 3} y={y + h - 11} width={w - 6} height={9} fill={BD} rx={1} />
      </>
    );
  }

  const filterId = "geis-outline";
  const pillarXs = [22, 62, 102, 144, 184, 226, 268];

  return (
    <svg width={width} height={svgH} viewBox={`0 0 ${VW} ${VH}`} xmlns="http://www.w3.org/2000/svg">
      <defs>
        {/* white sticker-border filter */}
        <filter id={filterId} x="-16%" y="-16%" width="132%" height="132%">
          <feMorphology in="SourceAlpha" operator="dilate" radius="10" result="dilated" />
          <feFlood floodColor="white" result="wh" />
          <feComposite in="wh" in2="dilated" operator="in" result="whiteBlob" />
          <feMerge>
            <feMergeNode in="whiteBlob" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g filter={stickerOutline ? `url(#${filterId})` : undefined}>
        {/* ── ground slab ── */}
        <rect x={8} y={200} width={304} height={22} fill={GR} stroke={OL} strokeWidth={2.5} rx={2} />
        <rect x={11} y={202} width={298} height={8} fill={GRD} rx={1} />

        {/* ── pillars ── */}
        {pillarXs.map(px => (
          <g key={px}>
            <rect x={px} y={148} width={16} height={54} fill={GR} stroke={OL} strokeWidth={2} />
            <rect x={px + 3} y={150} width={4} height={50} fill={GRD} />
          </g>
        ))}

        {/* ── underbelly / soffit ── */}
        <rect x={8} y={134} width={304} height={18} fill={GRD} stroke={OL} strokeWidth={2.5} rx={1} />
        <rect x={11} y={136} width={298} height={7} fill={GDK} rx={1} />

        {/* ── main body slab (widest, with eyes) ── */}
        {slab(20, 66, 280, 70)}

        {/* left eye */}
        <rect x={62} y={80} width={50} height={36} rx={4} fill={OL} />
        <rect x={65} y={83} width={44} height={30} rx={3} fill="#1c2038" />
        <rect x={67} y={85} width={16} height={11} rx={2} fill="rgba(255,255,255,0.14)" />

        {/* right eye */}
        <rect x={208} y={80} width={50} height={36} rx={4} fill={OL} />
        <rect x={211} y={83} width={44} height={30} rx={3} fill="#1c2038" />
        <rect x={213} y={85} width={16} height={11} rx={2} fill="rgba(255,255,255,0.14)" />

        {/* ── mid slab ── */}
        {slab(52, 30, 216, 40)}

        {/* ── top slab ── */}
        {slab(98, 0, 124, 34)}
      </g>
    </svg>
  );
}

// TSS++ mascot — cartoon vector raccoon (mid-blep), drawn from the reference
// photo. Same die-cut sticker treatment as GeiselLogo so the two can be used
// interchangeably.

export function RaccoonLogo({ width = 220, stickerOutline = true }: { width?: number | string; stickerOutline?: boolean }) {
  const VW = 220, VH = 190;
  // Numeric width -> fixed pixel size (e.g. the nav). String width (e.g.
  // "100%") -> fluid: fill the container, viewBox keeps the aspect ratio.
  const fluid = typeof width === "string";
  const svgH = fluid ? undefined : Math.round(((width as number) / VW) * VH);

  const FUR  = "#a69e8f";   // base fur
  const EAR  = "#948c7e";   // outer ear
  const EARI = "#453e4c";   // inner ear
  const CRM  = "#eae4d6";   // cream brows
  const MUZ  = "#efe9dc";   // muzzle / whiskers
  const MSK  = "#312c37";   // eye mask
  const CHN  = "#3a3440";   // chin band
  const OL   = "#222638";   // outline

  const filterId = "rac-outline";

  return (
    <svg width={fluid ? undefined : width} height={svgH} viewBox={`0 0 ${VW} ${VH}`}
      style={fluid ? { width: "100%", height: "auto", display: "block" } : undefined}
      xmlns="http://www.w3.org/2000/svg">
      <defs>
        {/* white sticker-border filter */}
        <filter id={filterId} x="-16%" y="-16%" width="132%" height="132%">
          <feMorphology in="SourceAlpha" operator="dilate" radius="3" result="dilated" />
          <feFlood floodColor="white" result="wh" />
          <feComposite in="wh" in2="dilated" operator="in" result="whiteBlob" />
          <feMerge>
            <feMergeNode in="whiteBlob" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g filter={stickerOutline ? `url(#${filterId})` : undefined} strokeLinejoin="round" strokeLinecap="round">
        {/* ears */}
        <path d="M 58 54 Q 54 14 84 22 Q 98 27 100 44 Z" fill={EAR} stroke={OL} strokeWidth={3} />
        <path d="M 162 54 Q 166 14 136 22 Q 122 27 120 44 Z" fill={EAR} stroke={OL} strokeWidth={3} />
        <path d="M 64 47 Q 63 26 80 31 Q 89 35 90 44 Z" fill={EARI} />
        <path d="M 156 47 Q 157 26 140 31 Q 131 35 130 44 Z" fill={EARI} />

        {/* head */}
        <ellipse cx={110} cy={104} rx={78} ry={66} fill={FUR} stroke={OL} strokeWidth={3} />

        {/* cream brow patches */}
        <ellipse cx={74} cy={70} rx={26} ry={15} fill={CRM} transform="rotate(-10 74 70)" />
        <ellipse cx={146} cy={70} rx={26} ry={15} fill={CRM} transform="rotate(10 146 70)" />

        {/* dark eye mask (connected over the bridge) */}
        <path
          d="M 36 94 Q 50 74 80 82 Q 96 87 110 87 Q 124 87 140 82 Q 170 74 184 94
             Q 176 116 148 113 Q 128 111 110 118 Q 92 111 72 113 Q 44 116 36 94 Z"
          fill={MSK}
        />

        {/* dark chin band, tucked under the muzzle */}
        <path d="M 68 152 Q 110 142 152 152 Q 138 167 110 167 Q 82 167 68 152 Z" fill={CHN} />

        {/* cream muzzle */}
        <ellipse cx={110} cy={130} rx={36} ry={25} fill={MUZ} />

        {/* eyes */}
        <circle cx={74} cy={96} r={9.5} fill="#15121c" />
        <circle cx={146} cy={96} r={9.5} fill="#15121c" />
        <circle cx={71} cy={93} r={3} fill="#ffffff" opacity={0.9} />
        <circle cx={143} cy={93} r={3} fill="#ffffff" opacity={0.9} />

        {/* nose */}
        <path d="M 99 112 Q 110 106 121 112 Q 121 122 110 126 Q 99 122 99 112 Z" fill="#1a1622" stroke={OL} strokeWidth={2} />
        <circle cx={105} cy={113} r={2.2} fill="#ffffff" opacity={0.35} />

        {/* mouth + blep tongue */}
        <path d="M 110 126 L 110 132" stroke={OL} strokeWidth={2.5} fill="none" />
        <path d="M 100 133 Q 110 139 120 133" stroke={OL} strokeWidth={2.5} fill="none" />
        <rect x={100} y={134} width={20} height={19} rx={9.5} fill="#f09fae" stroke={OL} strokeWidth={2.5} />
        <path d="M 110 138 L 110 148" stroke="#d97a8d" strokeWidth={2} fill="none" />

        {/* whiskers */}
        <g stroke={MUZ} strokeWidth={2} fill="none" opacity={0.9}>
          <path d="M 76 124 Q 44 118 18 110" />
          <path d="M 78 132 Q 46 132 20 130" />
          <path d="M 80 140 Q 50 146 26 150" />
          <path d="M 144 124 Q 176 118 202 110" />
          <path d="M 142 132 Q 174 132 200 130" />
          <path d="M 140 140 Q 170 146 194 150" />
        </g>
      </g>
    </svg>
  );
}

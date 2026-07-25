import { useMemo, useState } from "react";
import { PREREQS } from "../data/prereqs";
import { GNH, GNW, MAX_D, NODE_CFG, buildGraph } from "../lib/prereqGraph";

export function PrereqGraph({ courseCode }: { courseCode: string }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [hovered, setHovered] = useState<string | null>(null);

  const graph = useMemo(() => buildGraph(courseCode, expanded), [courseCode, expanded]);

  const pathNodeIds = useMemo(() => {
    if (!hovered) return new Set<string>();
    const set = new Set<string>();
    set.add(hovered);
    let cur = graph.nodes.find(n => n.id === hovered);
    while (cur?.parentId) { set.add(cur.parentId); cur = graph.nodes.find(n => n.id === cur!.parentId); }
    function addDesc(id: string) {
      graph.nodes.filter(n => n.parentId === id).forEach(k => { set.add(k.id); addDesc(k.id); });
    }
    addDesc(hovered);
    return set;
  }, [hovered, graph.nodes]);

  function toggleExpand(code: string) {
    setExpanded(prev => { const s = new Set(prev); s.has(code) ? s.delete(code) : s.add(code); return s; });
  }

  const hasPrereqs = (PREREQS[courseCode] ?? []).length > 0;
  if (!hasPrereqs) {
    return (
      <div className="flex items-center justify-center py-6 text-xs text-gray-500 border border-dashed border-gray-300 bg-gray-50">
        No prerequisites for {courseCode}
      </div>
    );
  }

  const totalDepth = graph.nodes.length ? Math.max(...graph.nodes.map(n => n.depth)) : 0;

  return (
    <div className="border border-[#c0c0c0] bg-[#f7f8fc] overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#c0c0c0] bg-[#ececfa]">
        <span className="text-[11px] font-bold" style={{ color: "#0b4a67" }}>
          {totalDepth + 1} level{totalDepth !== 0 ? "s" : ""} shown · depth limit {MAX_D}
        </span>
        <div className="flex items-center gap-2">
          {expanded.size > 0 && (
            <button onClick={() => setExpanded(new Set())}
              className="text-[10px] px-2 py-0.5 border border-[#aaa] bg-white text-gray-600 hover:bg-gray-100">
              Collapse all
            </button>
          )}
          <span className="text-[10px] text-gray-500">
            Click <span className="font-bold text-indigo-600">+</span> to expand
          </span>
        </div>
      </div>

      <div className="overflow-auto" style={{ maxHeight: 320 }}>
        <div style={{ width: graph.svgW, height: graph.svgH, flexShrink: 0 }}>
          <svg width={graph.svgW} height={graph.svgH} style={{ display: "block" }}>
            <defs>
              <marker id="arr" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill="#b0b8cc" />
              </marker>
              <marker id="arr-hi" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill="#0ea5e9" />
              </marker>
              <filter id="gshadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.13" />
              </filter>
            </defs>

            {graph.orBoxes.map(box => (
              <g key={box.id}>
                <rect x={box.x} y={box.y} width={box.w} height={box.h} rx={9}
                  fill="#f0ecff" stroke="#8b5cf6" strokeWidth={1.5} strokeDasharray="6,3" opacity={0.85} />
                <rect x={box.x + 5} y={box.y - 10} width={26} height={15} rx={4} fill="#7c3aed" />
                <text x={box.x + 18} y={box.y - 1} textAnchor="middle" fill="#fff" fontSize={9} fontWeight="800">OR</text>
              </g>
            ))}

            {graph.edges.map(e => {
              const onPath = pathNodeIds.has(e.fromId) && pathNodeIds.has(e.toId);
              const dimmed = hovered && !onPath;
              const midY = (e.y1 + e.y2) / 2;
              const d = `M ${e.x1} ${e.y1} C ${e.x1} ${midY}, ${e.x2} ${midY}, ${e.x2} ${e.y2}`;
              return (
                <path key={e.id} d={d} fill="none"
                  stroke={onPath ? "#0ea5e9" : "#c0c8d8"}
                  strokeWidth={onPath ? 2.5 : 1.5}
                  opacity={dimmed ? 0.12 : 0.85}
                  markerEnd={onPath ? "url(#arr-hi)" : "url(#arr)"}
                  style={{ transition: "opacity 100ms, stroke 100ms" }}
                />
              );
            })}

            {graph.nodes.map(node => {
              const cfg = NODE_CFG[node.status];
              const isHov = hovered === node.id;
              const dimmed = hovered && !pathNodeIds.has(node.id);
              const nx = node.x - GNW / 2, ny = node.y - GNH / 2;
              const canExpand = node.isExpandable && !node.isOrMore;

              return (
                <g key={node.id}
                  style={{ cursor: canExpand ? "pointer" : "default", opacity: dimmed ? 0.2 : 1, transition: "opacity 100ms" }}
                  onMouseEnter={() => setHovered(node.id)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => canExpand && toggleExpand(node.code)}
                  filter={isHov ? "url(#gshadow)" : undefined}
                >
                  <rect x={nx} y={ny} width={GNW} height={GNH} rx={6}
                    fill={cfg.fill} stroke={isHov ? "#0ea5e9" : cfg.stroke}
                    strokeWidth={isHov ? 2 : node.status === "root" ? 2 : 1} />

                  {node.status !== "default" && !node.isOrMore && (
                    <rect x={nx} y={ny + 6} width={3} height={GNH - 12} rx={1.5}
                      fill={node.status === "root" ? "#f5c842" : node.status === "completed" ? "#16a34a" : "#dc2626"} />
                  )}

                  <text x={node.x + (canExpand ? -6 : 0)} y={node.y - 7} textAnchor="middle"
                    fill={cfg.text} fontSize={11} fontWeight="700"
                    fontFamily="'JetBrains Mono', 'Consolas', monospace">
                    {node.code.length > 13 ? node.code.slice(0, 12) + "…" : node.code}
                  </text>
                  <text x={node.x + (canExpand ? -6 : 0)} y={node.y + 9} textAnchor="middle"
                    fill={cfg.text} fontSize={8.5} opacity={0.72} fontFamily="Arial, sans-serif">
                    {node.title.length > 20 ? node.title.slice(0, 19) + "…" : node.title}
                  </text>

                  {canExpand && (
                    <g transform={`translate(${nx + GNW - 9}, ${ny + GNH / 2})`}>
                      <circle r={8} fill="#6366f1" />
                      <text textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize={13} fontWeight="700" dy={0.5}>
                        {expanded.has(node.code) ? "−" : "+"}
                      </text>
                    </g>
                  )}

                  {!canExpand && !node.isOrMore && node.status !== "root" && (PREREQS[node.code] ?? []).length > 0 && (
                    <g transform={`translate(${nx + GNW - 9}, ${ny + GNH / 2})`}>
                      <circle r={6} fill="#94a3b8" />
                      <text textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize={9} fontWeight="700">…</text>
                    </g>
                  )}

                  {node.isOrMore && (
                    <rect x={nx} y={ny} width={GNW} height={GNH} rx={6}
                      fill="#ede9fe" stroke="#8b5cf6" strokeWidth={1.5} strokeDasharray="5,3" />
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      <div className="flex items-center gap-4 px-3 py-1.5 bg-white border-t border-[#c0c0c0] text-[10px] text-gray-600 flex-wrap">
        {[
          { fill: "#0b4a67", stroke: "#083858", label: "Selected" },
          { fill: "#dcfce7", stroke: "#16a34a", label: "Completed" },
          { fill: "#f8faff", stroke: "#8899bb", label: "Available" },
          { fill: "#fee2e2", stroke: "#dc2626", label: "Missing" },
        ].map(({ fill, stroke, label }) => (
          <span key={label} className="flex items-center gap-1">
            <svg width={12} height={12}><rect x={1} y={1} width={10} height={10} rx={2} fill={fill} stroke={stroke} strokeWidth={1.5} /></svg>
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

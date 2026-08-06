import { Loader2, TriangleAlert } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ApiError, fetchCoursePrereqs } from "../lib/api";
import { GNH, GNW, MAX_D, NODE_CFG, buildGraph } from "../lib/prereqGraph";
import type { PrereqNode } from "../types";

export function PrereqGraph({ moduleId, plannedCodes }: { moduleId: string; plannedCodes: Set<string> }) {
  const [tree, setTree] = useState<PrereqNode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  const [expandedOr, setExpandedOr] = useState<Set<string>>(new Set());
  const [hovered, setHovered] = useState<string | null>(null);

  useEffect(() => {
    setTree(null);
    setError(null);
    setExpanded(new Set());
    setExpandedOr(new Set());
    let alive = true;
    fetchCoursePrereqs(moduleId)
      .then(t => { if (alive) setTree(t); })
      .catch(err => {
        if (!alive) return;
        setError(err instanceof ApiError ? err.message : "Failed to load prerequisites.");
      });
    return () => { alive = false; };
  }, [moduleId]);

  const graph = useMemo(
    () => (tree ? buildGraph(tree, expanded, expandedOr, plannedCodes) : null),
    [tree, expanded, expandedOr, plannedCodes]
  );

  // Center the root horizontally once, on initial load -- a wide subtree
  // otherwise leaves the root scrolled out of view (its x is the midpoint
  // of the whole tree, not the left edge). Keyed on `tree` only so
  // expanding/collapsing a node afterward doesn't yank the scroll position.
  useEffect(() => {
    if (!graph || !scrollRef.current) return;
    const root = graph.nodes.find(n => n.depth === 0);
    if (!root) return;
    scrollRef.current.scrollLeft = Math.max(0, root.x - scrollRef.current.clientWidth / 2);
  }, [tree]);

  const pathNodeIds = useMemo(() => {
    if (!hovered || !graph) return new Set<string>();
    const set = new Set<string>();
    set.add(hovered);
    let cur = graph.nodes.find(n => n.id === hovered);
    while (cur?.parentId) { set.add(cur.parentId); cur = graph.nodes.find(n => n.id === cur!.parentId); }
    function addDesc(id: string) {
      graph!.nodes.filter(n => n.parentId === id).forEach(k => { set.add(k.id); addDesc(k.id); });
    }
    addDesc(hovered);
    return set;
  }, [hovered, graph]);

  function toggleExpand(code: string) {
    setExpanded(prev => { const s = new Set(prev); s.has(code) ? s.delete(code) : s.add(code); return s; });
  }

  function toggleOrExpand(groupPath: string) {
    setExpandedOr(prev => { const s = new Set(prev); s.has(groupPath) ? s.delete(groupPath) : s.add(groupPath); return s; });
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 px-3 py-2.5 text-xs border border-amber-400 bg-amber-50 text-amber-800">
        <TriangleAlert className="w-4 h-4 flex-shrink-0" />
        {error}
      </div>
    );
  }

  if (!tree || !graph) {
    return (
      <div className="flex items-center justify-center gap-2 py-6 text-xs text-gray-500 border border-dashed border-gray-300 bg-gray-50">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading prerequisite tree…
      </div>
    );
  }

  if (tree.children.length === 0) {
    return (
      <div className="flex items-center justify-center py-6 text-xs text-gray-500 border border-dashed border-gray-300 bg-gray-50">
        No prerequisites for {tree.code}
      </div>
    );
  }

  const totalDepth = graph.nodes.length ? Math.max(...graph.nodes.map(n => n.depth)) : 0;

  return (
    <div className="border border-[#c0c0c0] bg-[#f7f8fc] overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#c0c0c0] bg-[#ececfa]">
        <span className="text-[0.846rem] font-bold" style={{ color: "#0b4a67" }}>
          {totalDepth + 1} level{totalDepth !== 0 ? "s" : ""} shown · depth limit {MAX_D}
        </span>
        <div className="flex items-center gap-2">
          {(expanded.size > 0 || expandedOr.size > 0) && (
            <button onClick={() => { setExpanded(new Set()); setExpandedOr(new Set()); }}
              className="text-[0.769rem] px-2 py-0.5 border border-[#aaa] bg-white text-gray-600 hover:bg-gray-100">
              Collapse all
            </button>
          )}
          <span className="text-[0.769rem] text-gray-500">
            Click <span className="font-bold text-indigo-600">+</span> to expand
          </span>
        </div>
      </div>

      <div ref={scrollRef} className="overflow-auto" style={{ maxHeight: 320 }}>
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
              const canToggle = node.isExpandable;

              return (
                <g key={node.id}
                  style={{ cursor: canToggle ? "pointer" : "default", opacity: dimmed ? 0.2 : 1, transition: "opacity 100ms" }}
                  onMouseEnter={() => setHovered(node.id)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => {
                    if (!canToggle) return;
                    if (node.isOrMore && node.orGroupPath) toggleOrExpand(node.orGroupPath);
                    else toggleExpand(node.code);
                  }}
                  filter={isHov ? "url(#gshadow)" : undefined}
                >
                  <title>{node.isOrMore ? node.title : `${node.code}${node.title !== node.code ? ` — ${node.title}` : ""}`}</title>

                  <rect x={nx} y={ny} width={GNW} height={GNH} rx={6}
                    fill={cfg.fill} stroke={isHov ? "#0ea5e9" : cfg.stroke}
                    strokeWidth={isHov ? 2 : node.status === "root" ? 2 : 1}
                    strokeDasharray={node.isOrMore ? "5,3" : undefined} />

                  {node.status !== "default" && !node.isOrMore && (
                    <rect x={nx} y={ny + 6} width={3} height={GNH - 12} rx={1.5}
                      fill={node.status === "root" ? "#f5c842" : node.status === "planned" ? "#16a34a" : "#dc2626"} />
                  )}

                  <text x={node.x + (canToggle ? -6 : 0)} y={node.y - 7} textAnchor="middle"
                    fill={cfg.text} fontSize={11} fontWeight="700"
                    fontFamily="'JetBrains Mono', 'Consolas', monospace">
                    {node.code.length > 13 ? node.code.slice(0, 12) + "…" : node.code}
                  </text>
                  <text x={node.x + (canToggle ? -6 : 0)} y={node.y + 9} textAnchor="middle"
                    fill={cfg.text} fontSize={8.5} opacity={0.72} fontFamily="Arial, sans-serif">
                    {node.title.length > 20 ? node.title.slice(0, 19) + "…" : node.title}
                  </text>

                  {canToggle && (
                    <g transform={`translate(${nx + GNW - 9}, ${ny + GNH / 2})`}>
                      <circle r={8} fill="#6366f1" />
                      <text textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize={13} fontWeight="700" dy={0.5}>
                        {node.isOrMore ? "+" : expanded.has(node.code) ? "−" : "+"}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      <div className="flex items-center gap-4 px-3 py-1.5 bg-white border-t border-[#c0c0c0] text-[0.769rem] text-gray-600 flex-wrap">
        {[
          { fill: "#0b4a67", stroke: "#083858", label: "Selected" },
          { fill: "#dcfce7", stroke: "#16a34a", label: "Planned" },
          { fill: "#f8faff", stroke: "#8899bb", label: "Available" },
          { fill: "#fee2e2", stroke: "#dc2626", label: "Not in catalog" },
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

// Client-side layout for the interactive prerequisite graph. The
// backend (/api/courses/{module_id}/prereqs, see app/prereqs.py)
// already returns the *full* transitive tree in one shot -- unlike
// ClassGraph, which precomputes depth-capped trees and lazy-fetches
// deeper ones on expand, we only need to progressively *reveal*
// already-fetched depth/OR-group data client-side. Layout otherwise
// follows ClassGraph's D3 renderer (src/utils/astGraphUtils.js): an OR
// node is a transparent layout level (its alternatives render at the
// OR node's own depth, wrapped in one dashed box) rather than a
// visible box of its own, and an overflowing OR group previews the
// first few alternatives behind a "+N more" node.
import type { PrereqNode } from "../types";

export const GNW = 148, GNH = 44, HGAP = 18, VGAP = 82, GPAD = 32;
export const COL_W = GNW + HGAP;
export const MAX_D = 2, OR_PREV = 3;
// OR-group alternatives stack vertically -- one card per row, all sharing the
// same column. STACK_VY (> GNH) is the vertical step between rows, so the cards
// clear each other. At most one alt is expanded at a time; its prereqs hang
// straight down only when its card is the bottom of the stack. Any higher card
// branches its prereqs out to the side instead -- straight down would overlay
// the cards stacked beneath it (see orGroupExpansion / place).
const STACK_VY = 60;
type FanBias = "left" | "right" | "center";

export interface GNode {
  id: string; code: string; title: string;
  depth: number; x: number; y: number;
  isExpandable: boolean; isOrMore: boolean;
  orGroupPath: string | null; parentId: string | null;
  status: "root" | "planned" | "unresolved" | "default";
}
export interface GEdge { id: string; fromId: string; toId: string; x1: number; y1: number; x2: number; y2: number; }
export interface GOrBox { id: string; x: number; y: number; w: number; h: number; }
export interface GraphLayout { nodes: GNode[]; edges: GEdge[]; orBoxes: GOrBox[]; svgW: number; svgH: number; }

// Column width a node's subtree occupies. `path` is a structural id
// (child-index chain from the root) used to key OR-group expand state
// -- it's independent of the sequential node ids assigned in place(),
// so this function and place() can each compute it standalone and
// still agree on which OR groups are expanded.
function subW(node: PrereqNode, depth: number, path: string, exp: Set<string>, orExp: Set<string>): number {
  const hasKids = node.children.length > 0;
  const show = hasKids && (depth < MAX_D - 1 || exp.has(node.code));
  if (!show) return 1;

  let w = 0;
  node.children.forEach((child, i) => {
    if (child.code === "OR") {
      const groupPath = `${path}.${i}`;
      const alts = child.children;
      const expanded = orExp.has(groupPath) || alts.length <= OR_PREV + 1;
      const visible = expanded ? alts : alts.slice(0, OR_PREV);
      const hidden = alts.length - visible.length;
      // Alternatives stack vertically in one column (see place()); the span is
      // driven by whichever single alt has its prereqs fanned out. A bottom-of-
      // stack alt fans straight down within its own subtree width; any higher
      // alt branches to the side, costing one extra column beside the stack.
      w += orGroupExpansion(visible, hidden, groupPath, depth, exp, orExp).width;
    } else {
      w += subW(child, depth + 1, `${path}.${i}`, exp, orExp);
    }
  });
  return Math.max(1, w);
}

// Resolve how one OR group lays out, given its currently-visible alternatives.
// At most one alt can have its prereqs expanded (toggleExpand closes the rest),
// so there is a single `expandedJ`. The bottom card of the stack -- the last
// visible alt when the group is fully expanded (no "+N more" below it) -- fans
// its prereqs straight down, reserving just its own subtree width. Any higher
// card would overlay the cards stacked beneath it, so it branches its prereqs
// out to the side instead, reserving one column for the stack plus its subtree.
// subW() and place() both call this so they agree on the reserved column span.
function orGroupExpansion(
  visible: PrereqNode[], hidden: number, groupPath: string,
  depth: number, exp: Set<string>, orExp: Set<string>,
): { bottomIdx: number; expandedJ: number; expandedW: number; sideBranch: boolean; width: number } {
  const bottomIdx = hidden > 0 ? -1 : visible.length - 1;
  // The one alt whose prereqs are revealed. Detect it by the same rule place()
  // uses to show a subtree -- not by subW width, since an alt expanded to a
  // single prereq still fans a card below it yet only measures one column wide.
  let expandedJ = -1, expandedW = 1;
  visible.forEach((alt, j) => {
    const showsSubtree = alt.children.length > 0 && (depth + 1 < MAX_D - 1 || exp.has(alt.code));
    if (showsSubtree) { expandedJ = j; expandedW = subW(alt, depth + 1, `${groupPath}.${j}`, exp, orExp); }
  });
  const sideBranch = expandedJ >= 0 && expandedJ !== bottomIdx;
  const width = expandedJ < 0 ? 1 : sideBranch ? 1 + expandedW : expandedW;
  return { bottomIdx, expandedJ, expandedW, sideBranch, width };
}

function place(
  node: PrereqNode, depth: number, leftCol: number, path: string,
  parentId: string | null, orGroupPath: string | null,
  exp: Set<string>, orExp: Set<string>, plannedCodes: Set<string>,
  nodes: GNode[], edges: GEdge[], orBoxMap: Record<string, string[]>, seq: { n: number },
  // yShift translates this node -- and, inherited unchanged, its whole subtree
  // -- straight down by a fixed pixel offset. OR-group cards use it to stack
  // down the column; a card's prereqs hang straight beneath it because they
  // carry the same shift.
  // drawParentEdge=false suppresses this node's incoming arrow: OR-group cards
  // skip it so the group gets one shared parent->group arrow (see buildGraph)
  // instead of one arrow per alternative.
  // childColShift offsets this node's children (and their subtrees) sideways by
  // a whole column while the node itself stays put. A side-branching OR alt uses
  // it to push its prereqs one column clear of the stack column beneath it.
  fanBias: FanBias = "center", yShift = 0, drawParentEdge = true, childColShift = 0,
): void {
  const id = `n${seq.n++}`;
  const hasKids = node.children.length > 0;
  const show = hasKids && (depth < MAX_D - 1 || exp.has(node.code));
  const w = subW(node, depth, path, exp, orExp);
  const colOffset = fanBias === "left" ? w - 1 : fanBias === "right" ? 0 : (w - 1) / 2;
  const x = GPAD + GNW / 2 + (leftCol + colOffset) * COL_W;
  const y = GPAD + GNH / 2 + depth * (GNH + VGAP) + yShift;

  const status: GNode["status"] = depth === 0 ? "root"
    : plannedCodes.has(node.code) ? "planned"
    : node.title === null ? "unresolved"
    : "default";

  nodes.push({
    id, code: node.code, title: node.title ?? node.code,
    depth, x, y, isExpandable: hasKids && !show, isOrMore: false,
    orGroupPath, parentId, status,
  });
  if (orGroupPath) (orBoxMap[orGroupPath] ??= []).push(id);

  if (parentId !== null && drawParentEdge) {
    const par = nodes.find(n => n.id === parentId)!;
    edges.push({ id: `${parentId}→${id}`, fromId: parentId, toId: id, x1: par.x, y1: par.y + GNH / 2, x2: x, y2: y - GNH / 2 });
  }
  if (!show) return;

  let col = leftCol + childColShift;
  node.children.forEach((child, i) => {
    if (child.code === "OR") {
      const groupPath = `${path}.${i}`;
      const alts = child.children;
      const expanded = orExp.has(groupPath) || alts.length <= OR_PREV + 1;
      const visible = expanded ? alts : alts.slice(0, OR_PREV);
      const hidden = alts.length - visible.length;

      // The cards stack vertically in one shared column (`stackCol`). At most
      // one alt is expanded; `width` reserves room for its prereq subtree. When
      // the expanded card is the bottom of the stack the subtree fans straight
      // down and the stack centers over it; otherwise the subtree branches to
      // the side (one column clear of the stack, via childColShift) so it never
      // overlays the cards below, and the stack sits at the group's left column.
      const groupCol = col;
      const { bottomIdx, expandedJ, sideBranch, expandedW, width } =
        orGroupExpansion(visible, hidden, groupPath, depth, exp, orExp);
      const stackCol = sideBranch ? groupCol : groupCol + (expandedW - 1) / 2;

      // Placed back-to-front so the first/primary alt paints last (frontmost,
      // top of the stack) with its siblings stacked below and behind it.
      visible.slice().reverse().forEach((alt, ri) => {
        const j = visible.length - 1 - ri;
        const yS = yShift + j * STACK_VY;
        if (j === bottomIdx) {
          // Bottom of the stack -- nothing sits beneath it, so its prereqs hang
          // straight down, centered under the card like any non-grouped course.
          const aw = subW(alt, depth + 1, `${groupPath}.${j}`, exp, orExp);
          place(alt, depth + 1, stackCol - (aw - 1) / 2, `${groupPath}.${j}`, id, groupPath,
            exp, orExp, plannedCodes, nodes, edges, orBoxMap, seq, "center", yS, false);
        } else {
          // A card above the bottom stays in the stack column but branches its
          // prereqs out to the side so they don't overlay the cards beneath it.
          // Only the one expanded alt has a subtree to push aside (childColShift).
          place(alt, depth + 1, stackCol, `${groupPath}.${j}`, id, groupPath,
            exp, orExp, plannedCodes, nodes, edges, orBoxMap, seq, "right", yS, false, j === expandedJ ? 1 : 0);
        }
      });

      if (hidden > 0) {
        // The "+N more" card is part of the group too, so it also skips its own
        // arrow -- the single parent->group arrow covers it.
        const pid = `n${seq.n++}`;
        const stackIdx = visible.length;
        const px = GPAD + GNW / 2 + stackCol * COL_W;
        const py = GPAD + GNH / 2 + (depth + 1) * (GNH + VGAP) + yShift + stackIdx * STACK_VY;
        nodes.push({
          id: pid, code: `+${hidden} more`, title: `${hidden} more alternative${hidden !== 1 ? "s" : ""}`,
          depth: depth + 1, x: px, y: py, isExpandable: true, isOrMore: true,
          orGroupPath: groupPath, parentId: id, status: "default",
        });
        (orBoxMap[groupPath] ??= []).push(pid);
      }

      col = groupCol + width;
    } else {
      const cw = subW(child, depth + 1, `${path}.${i}`, exp, orExp);
      place(child, depth + 1, col, `${path}.${i}`, id, null, exp, orExp, plannedCodes, nodes, edges, orBoxMap, seq, "center", yShift);
      col += cw;
    }
  });
}

export function buildGraph(
  root: PrereqNode, exp: Set<string>, orExp: Set<string>, plannedCodes: Set<string>,
): GraphLayout {
  const nodes: GNode[] = [], edges: GEdge[] = [];
  const orBoxMap: Record<string, string[]> = {};
  place(root, 0, 0, "0", null, null, exp, orExp, plannedCodes, nodes, edges, orBoxMap, { n: 0 });

  const orBoxes: GOrBox[] = [];
  for (const [groupPath, memberIds] of Object.entries(orBoxMap)) {
    const ns = nodes.filter(n => memberIds.includes(n.id));
    if (ns.length < 2) continue;
    const pad = 10;
    const minX = Math.min(...ns.map(n => n.x)), maxX = Math.max(...ns.map(n => n.x));
    const minY = Math.min(...ns.map(n => n.y)), maxY = Math.max(...ns.map(n => n.y));
    const box: GOrBox = {
      id: groupPath,
      x: minX - GNW / 2 - pad,
      y: minY - GNH / 2 - pad,
      w: maxX - minX + GNW + pad * 2,
      h: maxY - minY + GNH + pad * 2,
    };
    orBoxes.push(box);

    // One arrow from the group's parent to the top-center of the box, in place
    // of the per-alternative arrows suppressed in place(). All members share
    // the same parent; toId is the groupPath so hover highlighting can light
    // this arrow whenever any card in the group is on the path.
    const parentId = ns[0].parentId;
    const par = parentId ? nodes.find(n => n.id === parentId) : undefined;
    if (par) {
      edges.push({
        id: `${par.id}→or${groupPath}`, fromId: par.id, toId: groupPath,
        x1: par.x, y1: par.y + GNH / 2, x2: box.x + box.w / 2, y2: box.y,
      });
    }
  }

  const svgW = nodes.length ? Math.max(...nodes.map(n => n.x + GNW / 2)) + GPAD : 300;
  const svgH = nodes.length ? Math.max(...nodes.map(n => n.y + GNH / 2)) + GPAD : 200;
  return { nodes, edges, orBoxes, svgW, svgH };
}

export const NODE_CFG: Record<GNode["status"], { fill: string; stroke: string; text: string }> = {
  root:       { fill: "#0b4a67", stroke: "#083858", text: "#ffffff" },
  planned:    { fill: "#dcfce7", stroke: "#16a34a", text: "#14532d" },
  unresolved: { fill: "#fee2e2", stroke: "#dc2626", text: "#7f1d1d" },
  default:    { fill: "#f8faff", stroke: "#8899bb", text: "#1a2a4a" },
};

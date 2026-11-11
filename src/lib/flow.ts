// Build-time layout for the flow diagrams. Stages run left to right; edges are elbow lines.
// Text is 14px in a viewBox that is shown at 1:1 or larger, so labels never render below 13px.
export interface FlowStage { nodes: string[]; plain?: boolean }
export interface FlowSpec { stages: FlowStage[]; gap?: number }
export interface FlowNode { x: number; y: number; w: number; h: number; lines: string[]; stage: number; idx: number; plain: boolean }
export interface FlowEdge { d: string; stage: number }
export interface FlowGeom { w: number; h: number; nodes: FlowNode[]; edges: FlowEdge[] }

const CHAR = 7.7, LH = 18, PADX = 11, PADY = 9, VGAP = 10, M = 6;

export function layout(spec: FlowSpec): FlowGeom {
  const gap = spec.gap ?? 44;
  const cols = spec.stages.map((s) => {
    const lines = s.nodes.map((n) => n.split('|'));
    const w = Math.ceil(Math.max(...lines.map((l) => Math.max(...l.map((x) => x.length)))) * CHAR + PADX * 2 + (s.plain ? 14 : 0));
    const hs = lines.map((l) => l.length * LH + PADY * 2 - (s.plain ? 6 : 0));
    const h = hs.reduce((a, b) => a + b, 0) + VGAP * (lines.length - 1);
    return { lines, w, hs, h, plain: !!s.plain };
  });
  const H = Math.max(...cols.map((c) => c.h)) + M * 2;
  const nodes: FlowNode[] = [];
  let x = M;
  cols.forEach((c, si) => {
    let y = M + (H - M * 2 - c.h) / 2;
    c.lines.forEach((l, i) => {
      nodes.push({ x, y, w: c.w, h: c.hs[i], lines: l, stage: si, idx: i, plain: c.plain });
      y += c.hs[i] + VGAP;
    });
    x += c.w + gap;
  });
  const W = x - gap + M;
  const edges: FlowEdge[] = [];
  const by = (s: number) => nodes.filter((n) => n.stage === s);
  for (let s = 0; s < cols.length - 1; s++) {
    const A = by(s), B = by(s + 1);
    const pairs: [FlowNode, FlowNode][] = [];
    if (A.length === 1) B.forEach((b) => pairs.push([A[0], b]));
    else if (B.length === 1) A.forEach((a) => pairs.push([a, B[0]]));
    else A.forEach((a, i) => pairs.push([a, B[Math.round((i * (B.length - 1)) / Math.max(1, A.length - 1))]]));
    for (const [a, b] of pairs) {
      const x1 = a.x + a.w, y1 = a.y + a.h / 2, x2 = b.x - 7, y2 = b.y + b.h / 2, xm = (x1 + x2) / 2;
      edges.push({ stage: s, d: y1 === y2 ? `M${x1} ${y1}H${x2}` : `M${x1} ${y1}H${xm}V${y2}H${x2}` });
    }
  }
  return { w: Math.ceil(W), h: Math.ceil(H), nodes, edges };
}

export const stagesFromLayers = (layers: { name: string }[], gap = 36): FlowSpec => ({
  stages: layers.map((l) => ({
    nodes: [l.name.length > 16 ? l.name.replace(/^(.{8,16})\s/, '$1|') : l.name],
  })),
  gap,
});

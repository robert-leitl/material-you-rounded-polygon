import { Vector2 } from './vector2';

interface PolygonPoint {
    vertex: Vector2;
    angle: number;
    angleDeg?: number;
}

export interface RoundedPolygonArc {
    radius: number;
    p1: Vector2;
    p2: Vector2;
    corner: PolygonPoint;
    sweep: number;
    offset: number;
}

export class RoundedPolygon {
    private points: PolygonPoint[] = [];

    public arcs: RoundedPolygonArc[] = [];

    public static createFromPath(vertices: Vector2[], ratio: number = 1): RoundedPolygon {
        const poly: RoundedPolygon = new RoundedPolygon();
        poly.process(vertices, ratio);
        return poly;
    }

    public process(vertices: Vector2[], ratio: number = 1): void {
        this.points = [];
        this.arcs = [];

        const l = vertices.length;
        for (let i = 0; i < l; i++) {
            this.processVertexAt(vertices, i, ratio);
        }
    }

    public getSVGPathData(
        scale: number = 1,
        translate: Vector2 = new Vector2(0, 0),
        precision: number = 2
    ): string {
        return this.arcs.reduce((d, a, i) => {
            if (i === 0) {
                d = `M${this.r(a.p1.x * scale + translate.x, precision)},${this.r(
                    a.p1.y * scale + translate.y,
                    precision
                )}`;
            } else {
                d = `${d}L${this.r(a.p1.x * scale + translate.x, precision)},${this.r(
                    a.p1.y * scale + translate.y,
                    precision
                )}`;
            }
            d = `${d}A${this.r(a.radius * scale, precision)},${this.r(
                a.radius * scale,
                precision
            )},0,0,${a.sweep},${this.r(a.p2.x * scale + translate.x, precision)},${this.r(
                a.p2.y * scale + translate.y,
                precision
            )}`;

            if (i === this.arcs.length - 1) {
                const ea = this.arcs[0];
                d = `${d}L${this.r(ea.p1.x * scale + translate.x, precision)},${this.r(
                    ea.p1.y * scale + translate.y,
                    precision
                )}`;
            }

            return d;
        }, '');
    }

    private processVertexAt(vertices: Vector2[], index: number, ratio: number): void {
        // get the surrounding vertex indices
        const l = vertices.length;
        const a: number = this.getIndex(l, index - 2);
        const b: number = this.getIndex(l, index - 1);
        const p: number = this.getIndex(l, index - 0);
        const d: number = this.getIndex(l, index + 1);
        const e: number = this.getIndex(l, index + 2);

        // calculate the angles of the neighbouring points
        this.calculateAngleAt(vertices, a, b, p);
        this.calculateAngleAt(vertices, b, p, d);
        this.calculateAngleAt(vertices, p, d, e);

        // get the max corner radii of both sides of the vertex
        const B: PolygonPoint = this.points[b];
        const P: PolygonPoint = this.points[p];
        const D: PolygonPoint = this.points[d];
        const mr1 = this.getMaxCornerRadius(this.points[p], this.points[b]);
        const mr2 = this.getMaxCornerRadius(this.points[p], this.points[d]);
        const mr = Math.min(mr1, mr2);

        this.calculateCurves(B, P, D, mr * ratio);
    }

    private getIndex(total: number, index: number): number {
        const i = index % total;
        return i < 0 ? i + total : i;
    }

    private calculateAngleAt(vertices: Vector2[], a: number, index: number, b: number): void {
        if (!this.points[index]) {
            const vA: Vector2 = vertices[a];
            const vP: Vector2 = vertices[index];
            const vB: Vector2 = vertices[b];

            const vPA: Vector2 = Vector2.subtract(vA, vP);
            const vPB: Vector2 = Vector2.subtract(vB, vP);

            const angle = vPA.angle(vPB);

            this.points[index] = {
                vertex: vP,
                angle,
                angleDeg: angle * (180 / Math.PI)
            };
        }
    }

    private getMaxCornerRadius(A: PolygonPoint, B: PolygonPoint): number {
        const s = Vector2.subtract(A.vertex, B.vertex).length();
        const alpha = A.angle / 2;
        const beta = B.angle / 2;
        const c = s / (Math.cos(alpha) + Math.cos(beta));
        return Math.sin(alpha) * c;
    }

    private calculateCurves(
        A: PolygonPoint,
        P: PolygonPoint,
        C: PolygonPoint,
        radius: number
    ): void {
        const vP: Vector2 = P.vertex;
        const vPA: Vector2 = Vector2.subtract(A.vertex, vP);
        const vAP: Vector2 = Vector2.subtract(vP, A.vertex);
        const vnPA: Vector2 = Vector2.normalize(vPA);
        const vPC: Vector2 = Vector2.subtract(C.vertex, vP);
        const vnPC: Vector2 = Vector2.normalize(vPC);
        // the vector to the center of the arc relative to the corner point P
        const q = radius / Math.sin(P.angle / 2);
        const vPQ: Vector2 = Vector2.normalize(Vector2.add(vPA, vPC)).multiplyScalar(q);

        // find the tangent points of the arc by projecting the center of the arc to sides of the corner
        const t1Length = vPQ.dot(vnPA);
        const vT1: Vector2 = Vector2.add(vP, vnPA.multiplyScalar(t1Length));
        const t2Length = vPQ.dot(vnPC);
        const vT2: Vector2 = Vector2.add(vP, vnPC.multiplyScalar(t2Length));

        // find the tangent points of the arc
        const vQ: Vector2 = Vector2.add(vP, vPQ);
        const vQT1: Vector2 = Vector2.subtract(vT1, vQ);
        const vQT2: Vector2 = Vector2.subtract(vT2, vQ);

        this.arcs.push({
            radius,
            p1: Vector2.add(vQ, vQT1),
            p2: Vector2.add(vQ, vQT2),
            corner: P,
            sweep: vAP.cross(vPC) < 0 ? 0 : 1,
            offset: q - radius
        });
    }

    private r(value: number, precision: number = 2): number {
        return Math.round(value * 10 ** precision) / 10 ** precision;
    }
}

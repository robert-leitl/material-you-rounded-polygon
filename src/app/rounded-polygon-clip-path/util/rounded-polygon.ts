import { Vector2 } from './vector2';

// helper interface to store the polygon vertex along with its angle
interface PolygonPoint {
    vertex: Vector2;
    angle: number;
}

/**
 * This interface contains the necessary data to draw an arc element.
 */
export interface RoundedPolygonArc {
    /**
     * The radius of the arc.
     */
    radius: number;

    /**
     * The start point of the arc.
     */
    p1: Vector2;

    /**
     * The end point of the arc.
     */
    p2: Vector2;

    /**
     * Reference to the corner point which gets rounded
     * by this arc.
     */
    corner: PolygonPoint;

    /**
     * This value indicates if the arc should be drawn
     * clockwise (1) or counter-clockwise (0). See the description
     * of the svg arc definition for more info.
     */
    sweep: number;

    /**
     * The offset from the original polygon point to the
     * corner radius along the axis between the corner point
     * and the arc center point.
     */
    offset: number;
}

/**
 * This class takes a list of points and creates a round polygon
 * shape from it. the order of the points define the edges between them
 * and the last point gets connected to the first one.
 * The rounded polygon is represented using arcs and the shape
 * can be exported as a svg path data string.
 */
export class RoundedPolygon {

    /**
     * The arc data of the current polygon. These list
     * only contains the arcs and not the lines between them.
     */
    public arcs: RoundedPolygonArc[] = [];

    private points: PolygonPoint[] = [];

    /**
     * Creates a new rounded polygon from the provided vertices.
     *
     * @param vertices The list of vertices which define the polygon.
     * @param ratio The ratio of the corner radius to the maximum possible corner radius.
     */
    public static createFromVertices(vertices: Vector2[], ratio: number = 1): RoundedPolygon {
        const poly: RoundedPolygon = new RoundedPolygon();
        poly.process(vertices, ratio);
        return poly;
    }

    /**
     * This method clears the current polygon data and creates a new
     * rounded polygon from the given parameters.
     *
     * @param vertices The list of vertices which define the polygon
     * @param ratio The ratio of the corner radius to the maximum possible corner radius.
     */
    public process(vertices: Vector2[], ratio: number = 1): void {
        this.points = [];
        this.arcs = [];

        const l = vertices.length;
        for (let i = 0; i < l; i++) {
            this.processVertexAt(vertices, i, ratio);
        }
    }

    /**
     * This method returns an svg path data string which describes
     * the rounded polygon (lines and arcs).
     *
     * @param scale An optional scale factor which gets applied to all path coordinates
     * @param translate An optional translate transform which gets applied to all coordinates (after the scaling)
     * @param precision The number of decimal values used within the path data
     */
    public getSVGPathData(
        scale: number = 1,
        translate: Vector2 = new Vector2(0, 0),
        precision: number = 2
    ): string {
        return this.arcs.reduce((d, a, i) => {
            if (i === 0) {
                // move to the starting point of the first arc initially
                d = `M${this.r(a.p1.x * scale + translate.x, precision)},${this.r(
                    a.p1.y * scale + translate.y,
                    precision
                )}`;
            } else {
                // draw a straight line to the starting point of the next arc
                d = `${d}L${this.r(a.p1.x * scale + translate.x, precision)},${this.r(
                    a.p1.y * scale + translate.y,
                    precision
                )}`;
            }

            // draw the arc of the current polygon point
            d = `${d}A${this.r(a.radius * scale, precision)},${this.r(
                a.radius * scale,
                precision
            )},0,0,${a.sweep},${this.r(a.p2.x * scale + translate.x, precision)},${this.r(
                a.p2.y * scale + translate.y,
                precision
            )}`;

            if (i === this.arcs.length - 1) {
                // if the last point is reached, draw a line to the starting point of
                // the first arc
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

        this.calculateArc(B, P, D, mr * ratio);
    }

    private getIndex(total: number, index: number): number {
        const i = index % total;
        return i < 0 ? i + total : i;
    }

    /**
     * Calculates the angle on the vertex at position p.
     *
     * @param vertices
     * @param a
     * @param p
     * @param b
     * @private
     */
    private calculateAngleAt(vertices: Vector2[], a: number, p: number, b: number): void {
        if (!this.points[p]) {
            const vA: Vector2 = vertices[a];
            const vP: Vector2 = vertices[p];
            const vB: Vector2 = vertices[b];

            const vPA: Vector2 = Vector2.subtract(vA, vP);
            const vPB: Vector2 = Vector2.subtract(vB, vP);

            const angle = vPA.angle(vPB);

            this.points[p] = {
                vertex: vP,
                angle
            };
        }
    }

    /**
     * Calculates the maximal corner radius between the polygon points
     * A and B.
     * @param A
     * @param B
     * @private
     */
    private getMaxCornerRadius(A: PolygonPoint, B: PolygonPoint): number {
        const s = Vector2.subtract(A.vertex, B.vertex).length();
        const alpha = A.angle / 2;
        const beta = B.angle / 2;
        const gamma = Math.PI - alpha - beta;
        const r = (s * Math.sin(alpha) * Math.sin(beta)) / Math.sin(gamma);
        return r;
    }

    /**
     * Calculate the arc at the point P between A and B and store it
     * within the arcs list.
     *
     * @param A
     * @param P
     * @param C
     * @param radius
     * @private
     */
    private calculateArc(
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

import { Directive, ElementRef, Input, Renderer2 } from '@angular/core';
import { RoundedPolygon } from './util/rounded-polygon';
import { Vector2 } from './util/vector2';

/**
 * The configuration settings for the rounded polygon directive input.
 */
export interface RoundedPolygonConfig {
    /**
     * Number of corners
     */
    cornerCount: number;

    /**
     * The outer radius of the polygon (number between 0 and 1). Default is 1 which is
     * equal to 100% of the available space.
     */
    outerRadius: number;

    /**
     * The ratio of the inner radius to the outer radius of the
     * polygon (number between 0 and 1). A value of 1 will result in
     * a convex polygon. Default is 0.5.
     */
    innerRadiusRatio: number;

    /**
     * The radius of the corners (number between 0 and 1). Whe set to 1,
     * the maximal possible corner radius depending on the corner angle
     * will be used. Default is 1.
     */
    cornerRadius: number;

    /**
     * The rotation of the polygon in degrees. Default is 0.
     */
    tilt: number;
}

/**
 * The default configuration object.
 */
export const DEFAULT_ROUNDED_POLYGON_CONFIG: RoundedPolygonConfig = {
    cornerCount: 4,
    outerRadius: 1,
    innerRadiusRatio: 0.4,
    cornerRadius: 1,
    tilt: 0
};


/**
 * This directive draws a rounded svg polygon which gets applied
 * as a clip-path to the hosting element.
 *
 * @example
 *
 * <div [appRoundedPolygonClipPath]="{ cornerCount:3, innerRadiusRatio: 0.45, cornerRadius:0.7, tilt:270 }">
 *      <img src="https://picsum.photos/id/1081/400/400">
 * </div>
 */
@Directive({
    selector: '[appRoundedPolygonClipPath]'
})
export class RoundedPolygonClipPathDirective {
    // this static variable is necessary for applying unique ids to the svg clip paths
    private static _instanceCount = 0;

    private _config: RoundedPolygonConfig = {
        ...DEFAULT_ROUNDED_POLYGON_CONFIG
    };

    private _viewportSize = 1;

    @Input()
    set appRoundedPolygonClipPath(value: RoundedPolygonConfig | any) {
        // overwrite the default configuration
        this._config = { ...DEFAULT_ROUNDED_POLYGON_CONFIG, ...value };
        // clamp values to valid ranges
        this._config.cornerCount = Math.max(3, this._config.cornerCount);
        this._config.outerRadius = Math.min(1, Math.max(0, this._config.outerRadius));
        this._config.innerRadiusRatio = Math.min(1, Math.max(0, this._config.innerRadiusRatio));
        this._config.tilt = Math.min(360, Math.max(0, this._config.tilt));
        this._config.cornerRadius = Math.min(1, Math.max(0, this._config.cornerRadius));

        this.drawSvgBackground();
    }

    constructor(private hostElementRef: ElementRef, private renderer: Renderer2) {}

    private drawSvgBackground(): void {
        // generate the rounded polygon svg path commands
        const path: string = this.createShapePath();
        // create the svg markup
        const v2 = this._viewportSize / 2;
        const id: string = `rounded-polygon-clip-path-${RoundedPolygonClipPathDirective._instanceCount++}`;
        const svg: string = `
            <svg    xmlns='http://www.w3.org/2000/svg' 
                    width='0' height='0'
                    viewBox='${-v2} ${-v2} ${this._viewportSize} ${this._viewportSize}'>
                <defs>
                    <clipPath id="${id}" clipPathUnits="objectBoundingBox">
                        <path fill="#FFFFFF" stroke="#000000" d='${path}'/>
                    </clipPath>
                </defs>
            </svg>`;

        // append the svg clip path to the host element
        const frag = document.createRange().createContextualFragment(svg);
        this.renderer.appendChild(this.hostElementRef.nativeElement, frag);

        // apply the clip path to the host element
        this.renderer.setStyle(this.hostElementRef.nativeElement, 'clip-path', `url(#${id})`);
    }

    private createShapePath(): string {
        // prepare the parameters for the shape construction
        const maxRadius = this._viewportSize / 2;
        const outerRadius = this._config.outerRadius * maxRadius;
        const innerRadius = this._config.outerRadius * this._config.innerRadiusRatio * maxRadius;
        const tilt = this._config.tilt * (Math.PI / 180);

        // construct the star polygon with just the corner points
        const path: string = this.createStarPolygon(
            this._config.cornerCount,
            outerRadius,
            innerRadius,
            tilt
        );

        return path;
    }

    private createStarPolygon(
        corners: number,
        outerRadius: number,
        innerRadius: number,
        tilt: number
    ): string {
        // create the basic polygon vertices which than can be rounded
        const vertices: Vector2[] = [];
        const numPoints = corners * 2;
        const gamma = (2 * Math.PI) / numPoints;

        let angle = tilt;
        for (let i = 0; i < numPoints; i++) {
            const radius = i % 2 ? innerRadius : outerRadius;
            const rx = Math.cos(angle) * radius;
            const ry = Math.sin(angle) * radius;
            let v = new Vector2(rx, ry);
            vertices.push(v);

            angle += gamma;
        }

        // create the rounded polygon from the vertices
        const rp: RoundedPolygon = RoundedPolygon.createFromVertices(
            vertices,
            this._config.cornerRadius
        );

        // find the largest offset value to compensate the size reduction
        // caused by the rounded corners
        const offset = rp.arcs.reduce((m, a) => Math.max(m, a.offset), 0);
        const vp2 = this._viewportSize / 2;
        let scale = offset !== 0 ? vp2 / (vp2 - offset) : 1;
        scale *= 0.99; // just a little spacing

        return rp.getSVGPathData(scale, new Vector2(vp2, vp2), 4);
    }
}

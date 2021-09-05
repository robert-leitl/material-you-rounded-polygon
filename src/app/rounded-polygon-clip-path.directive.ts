import { Directive, ElementRef, Input, Renderer2 } from '@angular/core';
import { RoundedPolygon } from './util/rounded-polygon';
import { Vector2 } from './util/vector2';

export interface RoundedPolygonConfig {
    corners: number;
    radius: number;
    ratio: number;
    cornerRadius: number;
    tilt: number;
}

export const DEFAULT_ROUNDED_POLYGON_CONFIG: RoundedPolygonConfig = {
    corners: 4,
    radius: 1,
    ratio: 0.5,
    cornerRadius: 1,
    tilt: 0
};

@Directive({
    selector: '[appRoundedPolygonClipPath]'
})
export class RoundedPolygonClipPathDirective {
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
        this._config.corners = Math.max(3, this._config.corners);
        this._config.radius = Math.min(1, Math.max(0, this._config.radius));
        this._config.ratio = Math.min(1, Math.max(0, this._config.ratio));
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

        // apply the svg as an inline base64 encoded background image
        /*this.renderer.setStyle(
            this.hostElementRef.nativeElement,
            'background-image',
            `url("data:image/svg+xml;base64,${window.btoa(svg)}")`
        );*/
        this.renderer.setStyle(this.hostElementRef.nativeElement, 'clip-path', `url(#${id})`);
        // make the background stretch to the parent elements size
        this.renderer.setStyle(this.hostElementRef.nativeElement, 'background-size', '100% 100%');
    }

    private createShapePath(): string {
        // prepare the parameters for the shape construction
        const maxRadius = this._viewportSize / 2;
        const outerRadius = this._config.radius * maxRadius;
        const innerRadius = this._config.radius * this._config.ratio * maxRadius;
        const tilt = this._config.tilt * (Math.PI / 180);

        // construct the star polygon with just the corner points
        const path: string = this.createStarPolygon(
            this._config.corners,
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
        const rp: RoundedPolygon = RoundedPolygon.createFromPath(
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

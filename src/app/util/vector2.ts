export class Vector2 {
    public x: number;
    public y: number;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    public copy(v: Vector2): void {
        this.x = v.x;
        this.y = v.y;
    }

    public static normalize(v: Vector2): Vector2 {
        const len = v.length();
        return new Vector2(v.x / len, v.y / len);
    }

    public normalize(): void {
        this.copy(Vector2.normalize(this));
    }

    public static subtract(a: Vector2, b: Vector2) {
        return new Vector2(a.x - b.x, a.y - b.y);
    }

    public subtract(v: Vector2): void {
        this.copy(Vector2.subtract(this, v));
    }

    public static add(a: Vector2, b: Vector2) {
        return new Vector2(a.x + b.x, a.y + b.y);
    }

    public add(v: Vector2): void {
        this.copy(Vector2.add(this, v));
    }

    public multiplyScalar(s: number): Vector2 {
        return new Vector2(this.x * s, this.y * s);
    }

    public length(): number {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    public dot(v: Vector2): number {
        return this.x * v.x + this.y * v.y;
    }

    public angle(v: Vector2): number {
        return Math.acos(Vector2.normalize(this).dot(Vector2.normalize(v)));
    }

    public static rotate(v: Vector2, angle: number): Vector2 {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const nx = cos * v.x + sin * v.y;
        const ny = cos * v.y - sin * v.x;
        return new Vector2(nx, ny);
    }

    public cross(v: Vector2): number {
        return this.x * v.y - this.y * v.x;
    }
}

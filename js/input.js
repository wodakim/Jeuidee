
export default class Input {
    constructor() {
        this.active = false;
        this.startX = 0;
        this.startY = 0;
        this.currX = 0;
        this.currY = 0;
        this.angle = 0;
        this.distance = 0;
        this.maxDistance = 50;
        this.setupListeners();
    }

    setupListeners() {
        const target = window;

        target.addEventListener('touchstart', (e) => {
            if(e.target.tagName === 'CANVAS') e.preventDefault();
            this.handleStart(e.touches[0].clientX, e.touches[0].clientY);
        }, { passive: false });

        target.addEventListener('touchmove', (e) => {
            if(e.target.tagName === 'CANVAS') e.preventDefault();
            this.handleMove(e.touches[0].clientX, e.touches[0].clientY);
        }, { passive: false });

        target.addEventListener('touchend', (e) => {
            this.handleEnd();
        });

        target.addEventListener('mousedown', (e) => this.handleStart(e.clientX, e.clientY));
        target.addEventListener('mousemove', (e) => this.handleMove(e.clientX, e.clientY));
        target.addEventListener('mouseup', () => this.handleEnd());
    }

    handleStart(x, y) {
        this.active = true;
        this.startX = x;
        this.startY = y;
        this.currX = x;
        this.currY = y;
        this.distance = 0;
    }

    handleMove(x, y) {
        if (!this.active) return;
        this.currX = x;
        this.currY = y;
        const dx = x - this.startX;
        const dy = y - this.startY;
        this.angle = Math.atan2(dy, dx);
        this.distance = Math.min(Math.hypot(dx, dy), this.maxDistance);
    }

    handleEnd() {
        this.active = false;
        this.distance = 0;
    }

    getVector() {
        if (!this.active) return { x: 0, y: 0 };
        const force = this.distance / this.maxDistance;
        return {
            x: Math.cos(this.angle) * force,
            y: Math.sin(this.angle) * force
        };
    }
}

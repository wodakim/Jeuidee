
class MockCamera {
    constructor() {
        this.zoom = 1.0;
        this.x = 0;
        this.y = 0;
    }
    worldToScreen(x, y) {
        return { x: x, y: y }; // Simple identity for test
    }
    screenToWorld(x, y) {
        return { x: x, y: y };
    }
}

class MockGame {
    constructor() {
        this.camera = new MockCamera();
    }
}

class EditorTest {
    constructor() {
        this.game = new MockGame();
        this.clone = {
            points: [
                { x: 0, y: 0, radius: 20 },  // Head (Index 0)
                { x: 0, y: 20, radius: 20 }, // Body
                { x: 0, y: 40, radius: 20 }  // Tail
            ]
        };
    }

    // From editor.js logic
    calcSide(closest, dragX, dragY) {
        const bone = closest.point;
        let spineVec = { x: 0, y: 0 };

        // Logic from editor.js: "If closest.index < points.length - 1..."
        // Note: The logic in provided editor.js has a potential issue:
        // if index < length-1, it uses next - bone.
        // if index == length-1, it uses bone - prev.
        // But for index 0 (Head), it uses index+1 (Body) - Head.
        // Vector points backwards (downwards in this case: (0, 20) - (0, 0) = (0, 20)).

        if (closest.index < this.clone.points.length - 1) {
            const next = this.clone.points[closest.index + 1];
            spineVec = { x: next.x - bone.x, y: next.y - bone.y };
        } else {
            const prev = this.clone.points[closest.index - 1];
            spineVec = { x: bone.x - prev.x, y: bone.y - prev.y };
        }

        // dropWorld is dragX, dragY (identity camera)
        const dropVec = { x: dragX - bone.x, y: dragY - bone.y };
        const dropLen = Math.hypot(dropVec.x, dropVec.y) || 1;
        const normDropX = dropVec.x / dropLen;
        const normDropY = dropVec.y / dropLen;

        // Dot Product with Spine Vector
        // Spine Vector is (0, 20).
        // If I drag to (0, -50) (In front of head), dropVec is (0, -50).
        // NormDrop is (0, -1).
        // Dot = 0*0 + 20*-1 = -20.
        // Wait, dot product usually needs normalized vectors.
        // The code in editor.js:
        // const dot = spineVec.x * normDropX + spineVec.y * normDropY;
        // It does NOT normalize spineVec.

        // Let's normalize spineVec for proper dot product check manually
        const spineLen = Math.hypot(spineVec.x, spineVec.y) || 1;
        const normSpineX = spineVec.x / spineLen;
        const normSpineY = spineVec.y / spineLen;

        // Re-eval using normalized spine for clarity (though code uses raw)
        // Code: const dot = spineVec.x * normDropX + spineVec.y * normDropY;
        // If spineVec = (0, 20) and normDrop = (0, -1). Dot = -20.

        // If index === 0 && dot < -0.7 ...
        // Wait, -20 < -0.7 is TRUE.
        // So placing in front (0, -50) relative to head (0,0) with spine pointing down (0, 20)
        // results in negative dot product.

        // However, the threshold -0.7 suggests it expects a normalized dot product (-1 to 1).
        // If spineVec is NOT normalized (len 20), the dot product is scaled by 20.
        // -20 is indeed < -0.7.
        // But if I drag slightly to side... say (20, 20).
        // dropVec (20, 20), norm (0.7, 0.7).
        // spine (0, 20).
        // dot = 0 + 20 * 0.7 = 14.
        // 14 is not < -0.7.

        // ISSUE: The threshold -0.7 implies normalized comparison, but spineVec is not normalized in code.
        // If spine length is large (e.g. 20), dot product range is -20 to 20.
        // -0.7 is a tiny fraction of that range.
        // Basically ANY angle > 90 degrees + tiny bit will trigger it.
        // Actually, since it's < -0.7 (negative), it requires the vectors to be opposing.
        // If spine is (0, 20) (Down), and drop is (0, -1) (Up).
        // Dot is -20. Correct.

        // BUT what if spine length varies?
        // If I normalize spineVec in the fix, I ensure consistent behavior.

        // Let's see if the code logic holds.
        const dot = spineVec.x * normDropX + spineVec.y * normDropY;

        // Cross product for side
        const cross = spineVec.x * normDropY - spineVec.y * normDropX;

        // Logic
        if (closest.index === 0) {
             // We want "Front" detection.
             // If spine points DOWN (0, 20), FRONT is UP (0, -1).
             // Dot product is negative.
             // If I normalize spine, dot is -1.
             // -1 < -0.7 is true.

             // If I don't normalize, dot is -20.
             // -20 < -0.7 is true.

             // Is there a case where it fails?
             // If I drag to (50, 0) (Right).
             // Drop (50, 0), norm (1, 0).
             // Dot = 0*1 + 20*0 = 0.
             // 0 < -0.7 is FALSE.

             // If I drag to (10, -10).
             // Drop (10, -10). Norm (0.7, -0.7).
             // Dot = 0 + 20 * -0.7 = -14.
             // -14 < -0.7 is TRUE.

             // It seems "Front" is very generous if spine is long.
             // But if I normalize, I get strictly "Cone of front".
        }

        return { dot, cross };
    }
}

// Run test
const test = new EditorTest();
const head = { point: test.clone.points[0], index: 0 }; // (0,0)
const dragPos = { x: 0, y: -50 }; // Front

const result = test.calcSide(head, dragPos.x, dragPos.y);
console.log(`Front Drag: Dot=${result.dot} (Expected < -0.7)`);

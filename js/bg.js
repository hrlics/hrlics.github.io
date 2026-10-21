/* Background: slowly drifting nodes, linked when close; the pointer pushes them aside.
   Draws one static frame when the visitor prefers reduced motion, and pauses in hidden tabs. */
(function () {
    var COLOR = [155, 48, 34];  // #9b3022
    var DENSITY = 0.5;          // nodes per 15000 px² of viewport
    var SPEED = 0.25;           // px per frame at 60 fps
    var SIZE = 2;
    var LINK = 140;             // max distance for a link, px
    var NODE_ALPHA = 0.45;
    var LINE_ALPHA = 0.18;
    var REPEL = 120;            // pointer reach, px

    var canvas = document.createElement('canvas');
    canvas.className = 'bg-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.insertBefore(canvas, document.body.firstChild);
    var ctx = canvas.getContext('2d');
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    var W = 0, H = 0, nodes = [], mouse = null, raf = 0, last = 0;

    function rgba(a) {
        return 'rgba(' + COLOR.join(',') + ',' + a.toFixed(3) + ')';
    }

    function spawn() {
        var a = Math.random() * Math.PI * 2, s = 0.4 + Math.random() * 0.6;
        return {
            x: Math.random() * W, y: Math.random() * H,
            vx: Math.cos(a) * s, vy: Math.sin(a) * s,
            r: 0.6 + Math.random() * 0.8
        };
    }

    function resize() {
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        W = window.innerWidth;
        H = window.innerHeight;
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        canvas.style.width = W + 'px';
        canvas.style.height = H + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        nodes.forEach(function (n) { n.x = Math.min(n.x, W); n.y = Math.min(n.y, H); });
        var target = Math.round(Math.max(24, Math.min(240, W * H / 15000 * DENSITY)));
        while (nodes.length < target) nodes.push(spawn());
        nodes.length = target;
    }

    function step(dt) {
        for (var i = 0; i < nodes.length; i++) {
            var n = nodes[i];
            n.x += n.vx * SPEED * dt;
            n.y += n.vy * SPEED * dt;
            if (n.x < 0) { n.x = 0; n.vx = Math.abs(n.vx); }
            if (n.x > W) { n.x = W; n.vx = -Math.abs(n.vx); }
            if (n.y < 0) { n.y = 0; n.vy = Math.abs(n.vy); }
            if (n.y > H) { n.y = H; n.vy = -Math.abs(n.vy); }
            if (mouse) {
                var dx = n.x - mouse.x, dy = n.y - mouse.y, d = Math.sqrt(dx * dx + dy * dy);
                if (d < REPEL && d > 0.01) {
                    var f = (1 - d / REPEL) * 3 * dt;
                    n.x += dx / d * f;
                    n.y += dy / d * f;
                }
            }
        }
    }

    function draw() {
        ctx.clearRect(0, 0, W, H);
        ctx.lineWidth = 1;
        var i, j, a, b, dx, dy, d2, L2 = LINK * LINK;
        for (i = 0; i < nodes.length; i++) {
            a = nodes[i];
            for (j = i + 1; j < nodes.length; j++) {
                b = nodes[j];
                dx = a.x - b.x; dy = a.y - b.y; d2 = dx * dx + dy * dy;
                if (d2 > L2) continue;
                ctx.strokeStyle = rgba(LINE_ALPHA * (1 - Math.sqrt(d2) / LINK));
                ctx.beginPath();
                ctx.moveTo(a.x, a.y);
                ctx.lineTo(b.x, b.y);
                ctx.stroke();
            }
        }
        ctx.fillStyle = rgba(NODE_ALPHA);
        for (i = 0; i < nodes.length; i++) {
            a = nodes[i];
            ctx.beginPath();
            ctx.arc(a.x, a.y, SIZE * a.r, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function frame(t) {
        var dt = last ? Math.min(3, (t - last) / 16.667) : 1;
        last = t;
        step(dt);
        draw();
        raf = requestAnimationFrame(frame);
    }

    function sync() {
        if (!reduceMotion.matches && !document.hidden) {
            if (!raf) { last = 0; raf = requestAnimationFrame(frame); }
        } else {
            if (raf) cancelAnimationFrame(raf);
            raf = 0;
            draw();
        }
    }

    resize();

    var pending = false;
    window.addEventListener('resize', function () {
        if (pending) return;
        pending = true;
        requestAnimationFrame(function () { pending = false; resize(); if (!raf) draw(); });
    });
    window.addEventListener('pointermove', function (e) { mouse = { x: e.clientX, y: e.clientY }; }, { passive: true });
    window.addEventListener('pointerup', function (e) { if (e.pointerType === 'touch') mouse = null; });
    document.documentElement.addEventListener('pointerleave', function () { mouse = null; });
    window.addEventListener('blur', function () { mouse = null; });
    document.addEventListener('visibilitychange', sync);
    if (reduceMotion.addEventListener) reduceMotion.addEventListener('change', sync);
    sync();
})();

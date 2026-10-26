/* ============================================================
   Laboratorio de Pensamiento Lateral
   Lógica, navegación y 10 desafíos interactivos (JS puro)
   ============================================================ */

(function () {
  "use strict";

  const SVGNS = "http://www.w3.org/2000/svg";

  /* ---------- Utilidades DOM/SVG ---------- */
  function el(tag, attrs, children) {
    const n = document.createElement(tag);
    applyAttrs(n, attrs);
    appendKids(n, children);
    return n;
  }
  function svg(tag, attrs, children) {
    const n = document.createElementNS(SVGNS, tag);
    applyAttrs(n, attrs);
    appendKids(n, children);
    return n;
  }
  function applyAttrs(n, attrs) {
    if (!attrs) return;
    for (const k in attrs) {
      if (k === "class") n.setAttribute("class", attrs[k]);
      else if (k === "text") n.textContent = attrs[k];
      else if (k === "html") n.innerHTML = attrs[k];
      else if (k.slice(0, 2) === "on" && typeof attrs[k] === "function")
        n.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
      else if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    }
  }
  function appendKids(n, children) {
    if (children == null) return;
    (Array.isArray(children) ? children : [children]).forEach(function (c) {
      if (c == null) return;
      n.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
  }
  function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); }

  // Convierte coordenadas de puntero a coordenadas internas del SVG
  function svgPoint(svgEl, evt) {
    const pt = svgEl.createSVGPoint();
    const t = evt.touches ? evt.touches[0] : evt;
    pt.x = t.clientX; pt.y = t.clientY;
    const ctm = svgEl.getScreenCTM();
    return ctm ? pt.matrixTransform(ctm.inverse()) : { x: 0, y: 0 };
  }

  /* ============================================================
     Infraestructura de desafíos
     Cada desafío implementa: { title, objective, build(mount, api) }
     api.solve()  -> marca el desafío como resuelto
     api.flag(msg)-> muestra un mensaje breve de intento (sin pistas)
     ============================================================ */

  const solved = []; // se dimensiona según challenges al final del archivo
  let current = 0;

  const screens = {
    start: document.getElementById("start-screen"),
    challenge: document.getElementById("challenge-screen"),
    final: document.getElementById("final-screen"),
  };
  const sceneEl = document.getElementById("scene");
  const titleEl = document.getElementById("ch-title");
  const objEl = document.getElementById("ch-objective");
  const curEl = document.getElementById("ch-current");
  const badgeEl = document.getElementById("ch-solved-badge");
  const dotsEl = document.getElementById("progress-dots");

  function show(screen) {
    Object.values(screens).forEach((s) => s.classList.remove("active"));
    screen.classList.add("active");
  }

  function markSolved(idx) {
    if (solved[idx]) return;
    solved[idx] = true;
    if (idx === current) {
      badgeEl.classList.add("show");
      sceneEl.classList.add("solved");
      const flag = sceneEl.querySelector(".success-flag");
      if (flag) flag.classList.add("show");
    }
    renderDots();
  }

  function buildApi() {
    return {
      solve: function () { markSolved(current); },
      flag: function (msg) {
        const m = sceneEl.querySelector(".soft-msg");
        if (m) {
          m.textContent = msg || "";
          clearTimeout(m._t);
          m._t = setTimeout(() => { m.textContent = ""; }, 2600);
        }
      },
    };
  }

  function loadChallenge(idx) {
    current = Math.max(0, Math.min(challenges.length - 1, idx));
    const ch = challenges[current];
    clear(sceneEl);
    sceneEl.classList.remove("solved");

    titleEl.textContent = ch.title;
    objEl.textContent = ch.objective || "";
    curEl.textContent = current + 1;

    // Bandera de éxito + mensaje suave (comunes a todas las escenas)
    const flag = el("div", { class: "success-flag" }, el("div", { class: "chip", text: "✓ ¡Resuelto!" }));
    sceneEl.appendChild(flag);

    // Construye la escena
    ch.build(sceneEl, buildApi());

    // Mensaje suave al final (si el build no lo añadió, lo añadimos)
    if (!sceneEl.querySelector(".soft-msg")) {
      sceneEl.appendChild(el("div", { class: "soft-msg" }));
    }

    // Estado de resuelto: al revisitar un desafío ya resuelto, el tablero se
    // reconstruye en su estado inicial, así que solo mostramos la insignia
    // (no el cartel de éxito ni el borde verde, que corresponden a una
    // resolución en vivo dentro de esta sesión del tablero).
    if (solved[current]) {
      badgeEl.classList.add("show");
    } else {
      badgeEl.classList.remove("show");
    }

    document.getElementById("btn-prev").disabled = current === 0;
    renderDots();
  }

  function renderDots() {
    clear(dotsEl);
    for (let i = 0; i < challenges.length; i++) {
      const b = el("button", { class: "pdot", title: "Desafío " + (i + 1) });
      if (i === current) b.classList.add("current");
      if (solved[i]) b.classList.add("solved");
      b.addEventListener("click", () => loadChallenge(i));
      dotsEl.appendChild(b);
    }
  }

  /* ---------- Navegación global ---------- */
  document.getElementById("btn-start").addEventListener("click", function () {
    show(screens.challenge);
    loadChallenge(0);
  });
  document.getElementById("btn-prev").addEventListener("click", function () {
    if (current > 0) loadChallenge(current - 1);
  });
  document.getElementById("btn-next").addEventListener("click", function () {
    if (current < challenges.length - 1) loadChallenge(current + 1);
    else {
      const n = solved.filter(Boolean).length;
      document.getElementById("final-score").textContent =
        "Desafíos resueltos: " + n + " de " + challenges.length;
      show(screens.final);
    }
  });
  document.getElementById("btn-reset").addEventListener("click", function () {
    solved[current] = false;
    loadChallenge(current);
  });
  document.getElementById("btn-restart").addEventListener("click", function () {
    for (let i = 0; i < solved.length; i++) solved[i] = false;
    show(screens.start);
  });

  /* ============================================================
     DESAFÍO 1 — Nueve puntos (pensar fuera de la caja)
     Dibuja una línea continua de 4 segmentos que toque los 9 puntos.
     ============================================================ */
  function ch_nineDots(mount, api) {
    const W = 600, H = 480;
    const s = svg("svg", { class: "scene-svg", viewBox: "0 0 " + W + " " + H });
    mount.appendChild(s);

    // Puntos 3x3 centrados, con amplio margen para salir "de la caja"
    const cx = W / 2, cy = H / 2 - 10, gap = 90;
    const dots = [];
    for (let r = 0; r < 3; r++)
      for (let c = 0; c < 3; c++)
        dots.push({ x: cx + (c - 1) * gap, y: cy + (r - 1) * gap, hit: false });

    const polyline = svg("polyline", {
      fill: "none", stroke: "var(--accent)", "stroke-width": 4,
      "stroke-linecap": "round", "stroke-linejoin": "round",
      filter: "drop-shadow(0 0 6px rgba(90,169,255,.5))",
    });
    s.appendChild(polyline);
    const preview = svg("line", { stroke: "var(--accent)", "stroke-width": 3,
      "stroke-dasharray": "6 6", opacity: ".5" });
    s.appendChild(preview);

    const dotEls = dots.map((d) =>
      s.appendChild(svg("circle", { cx: d.x, cy: d.y, r: 9, fill: "#cfd8ea", stroke: "#2a3650", "stroke-width": 2 }))
    );

    let pts = [];

    function distToSeg(p, a, b) {
      const dx = b.x - a.x, dy = b.y - a.y;
      const len2 = dx * dx + dy * dy || 1;
      let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
      t = Math.max(0, Math.min(1, t));
      const px = a.x + t * dx, py = a.y + t * dy;
      return Math.hypot(p.x - px, p.y - py);
    }

    function redraw() {
      polyline.setAttribute("points", pts.map((p) => p.x + "," + p.y).join(" "));
      // recomputa aciertos
      dots.forEach((d) => (d.hit = false));
      for (let i = 0; i < pts.length - 1; i++) {
        dots.forEach((d) => {
          if (distToSeg(d, pts[i], pts[i + 1]) <= 16) d.hit = true;
        });
      }
      dots.forEach((d, i) => dotEls[i].setAttribute("fill", d.hit ? "var(--accent-2)" : "#cfd8ea"));

      const segments = Math.max(0, pts.length - 1);
      const allHit = dots.every((d) => d.hit);
      pill.innerHTML = "Trazos: <b>" + segments + "</b> / 4 &nbsp;·&nbsp; Puntos tocados: <b>" +
        dots.filter((d) => d.hit).length + "</b> / 9";
      if (allHit && segments > 0 && segments <= 4) api.solve();
    }

    function nearestDot(p) {
      let best = null, bd = 28;
      dots.forEach((d) => { const dd = Math.hypot(p.x - d.x, p.y - d.y); if (dd < bd) { bd = dd; best = d; } });
      return best;
    }

    s.addEventListener("pointerdown", function (e) {
      const p = svgPoint(s, e);
      const nd = nearestDot(p);
      pts.push(nd ? { x: nd.x, y: nd.y } : { x: p.x, y: p.y });
      redraw();
    });
    s.addEventListener("pointermove", function (e) {
      if (!pts.length) { preview.setAttribute("opacity", "0"); return; }
      const p = svgPoint(s, e);
      const last = pts[pts.length - 1];
      preview.setAttribute("x1", last.x); preview.setAttribute("y1", last.y);
      preview.setAttribute("x2", p.x); preview.setAttribute("y2", p.y);
      preview.setAttribute("opacity", ".5");
    });

    const bar = el("div", { class: "toolbar" });
    const pill = el("span", { class: "status-pill", html: "Trazos: <b>0</b> / 4 &nbsp;·&nbsp; Puntos tocados: <b>0</b> / 9" });
    const undo = el("button", { class: "btn btn-mini", text: "Deshacer" });
    undo.addEventListener("click", () => { pts.pop(); redraw(); });
    bar.appendChild(pill); bar.appendChild(undo);
    mount.appendChild(bar);
    mount.appendChild(el("div", { class: "soft-msg" }));
  }

  /* ============================================================
     DESAFÍO 2 — Cerillas: iguala la ecuación (mueve 1 cerilla)
     Display de 7 segmentos. Equación inicial: 6 + 4 = 4 (falsa).
     ============================================================ */
  function ch_matches(mount, api) {
    // Geometría de un dígito de 7 segmentos
    // segmentos: a(top) b(top-right) c(bot-right) d(bottom) e(bot-left) f(top-left) g(middle)
    const DIGW = 70, DIGH = 130, T = 12; // ancho del segmento
    function segRect(seg, ox, oy) {
      const x = ox, y = oy, w = DIGW, h = DIGH;
      // devuelve puntos de un polígono (cerilla) por segmento
      const hpad = T, map = {
        a: poly(x + hpad, y, w - 2 * hpad, T, "h"),
        b: poly(x + w - T, y + hpad, T, h / 2 - hpad, "v"),
        c: poly(x + w - T, y + h / 2 + (hpad - T) + T, T, h / 2 - hpad, "v"),
        d: poly(x + hpad, y + h - T, w - 2 * hpad, T, "h"),
        e: poly(x, y + h / 2 + (hpad - T) + T, T, h / 2 - hpad, "v"),
        f: poly(x, y + hpad, T, h / 2 - hpad, "v"),
        g: poly(x + hpad, y + h / 2 - T / 2, w - 2 * hpad, T, "h"),
      };
      return map[seg];
    }
    function poly(x, y, w, h, dir) {
      // cerilla con puntas en diagonal
      const b = 5;
      if (dir === "h") {
        return [ [x, y + h / 2], [x + b, y], [x + w - b, y], [x + w, y + h / 2],
                 [x + w - b, y + h], [x + b, y + h] ].map((p) => p.join(",")).join(" ");
      }
      return [ [x + w / 2, y], [x + w, y + b], [x + w, y + h - b], [x + w / 2, y + h],
               [x, y + h - b], [x, y + b] ].map((p) => p.join(",")).join(" ");
    }

    const DIGIT_SEGS = {
      0: "abcdef", 1: "bc", 2: "abged", 3: "abgcd", 4: "fgbc",
      5: "afgcd", 6: "afgedc", 7: "abc", 8: "abcdefg", 9: "abcdfg",
    };
    const SEG_TO_DIGIT = {};
    Object.keys(DIGIT_SEGS).forEach((d) => {
      SEG_TO_DIGIT[DIGIT_SEGS[d].split("").sort().join("")] = +d;
    });
    function recognise(set) {
      const key = Object.keys(set).filter((k) => set[k]).sort().join("");
      return SEG_TO_DIGIT.hasOwnProperty(key) ? SEG_TO_DIGIT[key] : null;
    }

    // Estado inicial: 6 + 4 = 4
    const digits = [
      { on: setFrom("afgedc") }, // 6
      { on: setFrom("fgbc") },   // 4
      { on: setFrom("fgbc") },   // 4
    ];
    function setFrom(str) { const o = {}; "abcdefg".split("").forEach((s) => (o[s] = false)); str.split("").forEach((s) => (o[s] = true)); return o; }

    let moves = 0;
    const MAX = 1;
    let selected = null; // {digit, seg}

    const W = 620, H = 300;
    const s = svg("svg", { class: "scene-svg", viewBox: "0 0 " + W + " " + H });
    mount.appendChild(s);

    const positions = [40, 230, 470]; // x de cada dígito
    const opY = H / 2 - 8;
    // signos + y =
    s.appendChild(svg("text", { x: 170, y: opY + 18, class: "op-sign", "font-size": 54, "text-anchor": "middle", text: "+" }));
    s.appendChild(svg("text", { x: 410, y: opY + 18, class: "op-sign", "font-size": 50, "text-anchor": "middle", text: "=" }));

    const groups = [];
    digits.forEach((dig, di) => {
      const g = svg("g", {});
      s.appendChild(g);
      groups.push(g);
      drawDigit(di);
    });

    function drawDigit(di) {
      const g = groups[di];
      clear(g);
      const ox = positions[di], oy = 70, w = DIGW, h = DIGH, hp = T;
      // línea central de cada segmento, para una zona de toque amplia en móvil
      const centers = {
        a: [ox + hp, oy + T / 2, ox + w - hp, oy + T / 2],
        d: [ox + hp, oy + h - T / 2, ox + w - hp, oy + h - T / 2],
        g: [ox + hp, oy + h / 2, ox + w - hp, oy + h / 2],
        b: [ox + w - T / 2, oy + hp, ox + w - T / 2, oy + h / 2],
        c: [ox + w - T / 2, oy + h / 2, ox + w - T / 2, oy + h - hp],
        f: [ox + T / 2, oy + hp, ox + T / 2, oy + h / 2],
        e: [ox + T / 2, oy + h / 2, ox + T / 2, oy + h - hp],
      };
      "abcdefg".split("").forEach((seg) => {
        const on = digits[di].on[seg];
        const cls = "seg " + (on ? "seg-on" : "seg-off") +
          (selected && selected.digit === di && selected.seg === seg ? " selected" : "");
        // forma visible (no captura toques)
        g.appendChild(svg("polygon", { points: segRect(seg, ox, oy), class: cls, "pointer-events": "none" }));
        // zona de toque amplia e invisible
        const cp = centers[seg];
        const hit = svg("line", { x1: cp[0], y1: cp[1], x2: cp[2], y2: cp[3], stroke: "transparent",
          "stroke-width": 34, "stroke-linecap": "round", class: "clickable" });
        hit.addEventListener("click", () => onSegClick(di, seg));
        g.appendChild(hit);
      });
    }

    function onSegClick(di, seg) {
      if (moves >= MAX && !selected) { api.flag("Ya moviste tu cerilla. Pulsa Reiniciar para intentarlo de nuevo."); return; }
      const on = digits[di].on[seg];
      if (selected) {
        // colocar en una ranura vacía
        if (on) { // re-seleccionar otra encendida
          if (selected.digit === di && selected.seg === seg) { selected = null; redrawAll(); return; }
          selected = { digit: di, seg: seg }; redrawAll(); return;
        }
        // mover: apaga la seleccionada, enciende esta
        digits[selected.digit].on[selected.seg] = false;
        digits[di].on[seg] = true;
        selected = null;
        moves++;
        redrawAll();
        check();
      } else {
        if (on) { selected = { digit: di, seg: seg }; redrawAll(); }
      }
    }

    function redrawAll() {
      digits.forEach((_, di) => drawDigit(di));
      pill.innerHTML = "Cerillas movidas: <b>" + moves + "</b> / " + MAX;
    }

    function check() {
      const a = recognise(digits[0].on), b = recognise(digits[1].on), c = recognise(digits[2].on);
      if (a != null && b != null && c != null && a + b === c) { api.solve(); }
      else if (moves >= MAX) { api.flag("La igualdad aún no es correcta. Pulsa Reiniciar."); }
    }

    const bar = el("div", { class: "toolbar" });
    const pill = el("span", { class: "status-pill", html: "Cerillas movidas: <b>0</b> / " + MAX });
    bar.appendChild(pill);
    mount.appendChild(bar);
    mount.appendChild(el("div", { class: "soft-msg" }));
  }

  /* ============================================================
     DESAFÍO 3 — Triángulo de monedas: hazlo apuntar hacia abajo
     Retícula triangular; arrastra monedas para que el conjunto
     ocupado forme un triángulo invertido.
     ============================================================ */
  function ch_coinTriangle(mount, api) {
    const W = 560, H = 460;
    const s = svg("svg", { class: "scene-svg", viewBox: "0 0 " + W + " " + H });
    mount.appendChild(s);

    const R = 26, dx = 64, dy = 60;
    const topY = 70, cx = W / 2;

    // Retícula: 4 filas. Fila r (0..3) tiene r+1 posiciones para triángulo "arriba",
    // y para el invertido usamos filas con 4,3,2,1.
    // Creamos TODAS las posiciones de una malla triangular que contenga ambas.
    // Posiciones triángulo ARRIBA (apex arriba): filas 0..3 con 1,2,3,4 nodos.
    const upSlots = [];
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c <= r; c++) {
        upSlots.push({ x: cx + (c - r / 2) * dx, y: topY + r * dy, key: "U" + r + "_" + c });
      }
    }
    // Posiciones triángulo ABAJO (apex abajo): filas 0..3 con 4,3,2,1 nodos.
    const downSlots = [];
    for (let r = 0; r < 4; r++) {
      const n = 4 - r;
      for (let c = 0; c < n; c++) {
        downSlots.push({ x: cx + (c - (n - 1) / 2) * dx, y: topY + r * dy, key: "D" + r + "_" + c });
      }
    }
    // Unimos slots por posición (redondeando) para permitir solape de retículas
    const slots = [];
    function findSlot(x, y) {
      return slots.find((sl) => Math.hypot(sl.x - x, sl.y - y) < 10);
    }
    function addSlot(p) {
      let sl = findSlot(p.x, p.y);
      if (!sl) { sl = { x: p.x, y: p.y, coin: null, id: slots.length }; slots.push(sl); }
      return sl;
    }
    upSlots.forEach(addSlot);
    const downSet = downSlots.map((p) => addSlot(p)); // slots del objetivo invertido

    // Dibuja ranuras
    slots.forEach((sl) => {
      sl.node = svg("circle", { cx: sl.x, cy: sl.y, r: R, class: "slot" });
      s.appendChild(sl.node);
    });

    // Coloca 10 monedas en el triángulo "arriba"
    const upTargetSlots = upSlots.map((p) => findSlot(p.x, p.y));
    const coins = [];
    upTargetSlots.forEach((sl, i) => {
      sl.coin = i;
      coins.push({ slot: sl, node: null });
    });

    coins.forEach((coin, i) => {
      const c = svg("circle", { cx: coin.slot.x, cy: coin.slot.y, r: R - 3, class: "coin-piece" });
      const g = svg("g", {});
      g.appendChild(c);
      g.appendChild(svg("circle", { cx: coin.slot.x, cy: coin.slot.y, r: R - 11, fill: "none", stroke: "#a8821f", "stroke-width": 1.5, "pointer-events": "none" }));
      s.appendChild(g);
      coin.node = g; coin.circle = c;
      enableDrag(coin, i);
    });

    let dragInfo = null;
    function enableDrag(coin) {
      coin.circle.addEventListener("pointerdown", function (e) {
        e.preventDefault();
        try { s.setPointerCapture(e.pointerId); } catch (_) {}
        const p = svgPoint(s, e);
        dragInfo = { coin: coin, from: coin.slot, offx: p.x - coin.slot.x, offy: p.y - coin.slot.y };
        coin.circle.classList.add("dragging");
        coin.node.parentNode.appendChild(coin.node); // traer al frente
      });
    }
    s.addEventListener("pointermove", function (e) {
      if (!dragInfo) return;
      const p = svgPoint(s, e);
      moveCoin(dragInfo.coin, p.x - dragInfo.offx, p.y - dragInfo.offy);
      // resaltar slot bajo el puntero
      slots.forEach((sl) => sl.node.classList.remove("hover"));
      const target = nearestFreeSlot(p, dragInfo.coin);
      if (target) target.node.classList.add("hover");
    });
    s.addEventListener("pointerup", function (e) {
      if (!dragInfo) return;
      const p = svgPoint(s, e);
      const coin = dragInfo.coin;
      coin.circle.classList.remove("dragging");
      slots.forEach((sl) => sl.node.classList.remove("hover"));
      const target = nearestFreeSlot(p, coin);
      if (target) {
        dragInfo.from.coin = null;
        target.coin = coinIndex(coin);
        coin.slot = target;
      }
      placeCoin(coin, coin.slot.x, coin.slot.y);
      dragInfo = null;
      check();
    });

    function coinIndex(coin) { return coins.indexOf(coin); }
    function moveCoin(coin, x, y) {
      coin.node.querySelectorAll("circle").forEach((c, idx) => {
        c.setAttribute("cx", x); c.setAttribute("cy", y);
      });
    }
    function placeCoin(coin, x, y) { moveCoin(coin, x, y); }
    function nearestFreeSlot(p, coin) {
      let best = null, bd = R + 14;
      slots.forEach((sl) => {
        if (sl.coin != null && sl.coin !== coinIndex(coin)) return;
        const d = Math.hypot(p.x - sl.x, p.y - sl.y);
        if (d < bd) { bd = d; best = sl; }
      });
      return best;
    }

    function check() {
      const occupied = new Set(slots.filter((sl) => sl.coin != null).map((sl) => sl.id));
      const target = new Set(downSet.map((sl) => sl.id));
      if (occupied.size === target.size && [...target].every((id) => occupied.has(id))) {
        api.solve();
      }
    }

    mount.appendChild(el("div", { class: "toolbar" },
      el("span", { class: "status-pill", html: "Arrastra las monedas. 10 en total." })));
    mount.appendChild(el("div", { class: "soft-msg" }));
  }

  /* ============================================================
     DESAFÍO 4 — El río (lobo, cabra, lechuga + granjero)
     La barca lleva al granjero + 1. Sin el granjero: lobo come cabra,
     cabra come lechuga. Lleva a todos al otro lado.
     ============================================================ */
  function ch_river(mount, api) {
    const W = 640, H = 440;
    const s = svg("svg", { class: "scene-svg", viewBox: "0 0 " + W + " " + H });
    mount.appendChild(s);

    // Orillas y río
    s.appendChild(svg("rect", { x: 0, y: 0, width: 200, height: H, fill: "rgba(70,120,80,.18)" }));
    s.appendChild(svg("rect", { x: W - 200, y: 0, width: 200, height: H, fill: "rgba(70,120,80,.18)" }));
    s.appendChild(svg("rect", { x: 200, y: 0, width: W - 400, height: H, fill: "rgba(60,120,200,.14)" }));
    for (let i = 0; i < 6; i++)
      s.appendChild(svg("path", { d: "M" + (220 + i * 35) + " " + (60 + i * 55) + " q 15 -10 30 0",
        fill: "none", stroke: "rgba(140,180,240,.3)", "stroke-width": 3 }));

    // Estado: side 'L' o 'R' para cada actor; boat side; cargo
    const actors = {
      granjero: { label: "🧑‍🌾", side: "L" },
      lobo: { label: "🐺", side: "L" },
      cabra: { label: "🐐", side: "L" },
      lechuga: { label: "🥬", side: "L" },
    };
    let boat = "L";
    let cargo = null; // nombre del actor en la barca (además del granjero)

    const boatG = svg("g", { class: "clickable" });
    s.appendChild(boatG);
    const nodes = {};
    Object.keys(actors).forEach((k) => {
      const g = svg("g", { class: "clickable" });
      g.appendChild(svg("circle", { r: 30, fill: "var(--panel-2)", stroke: "var(--line)", "stroke-width": 2 }));
      g.appendChild(svg("text", { "text-anchor": "middle", y: 11, "font-size": 30, text: actors[k].label }));
      g.addEventListener("click", () => toggleActor(k));
      s.appendChild(g);
      nodes[k] = g;
    });

    function landSlot(side, idx) {
      const baseX = side === "L" ? 90 : W - 90;
      const ys = [70, 150, 230, 310, 390];
      return { x: baseX, y: ys[idx] };
    }
    function boatPos() {
      const x = boat === "L" ? 250 : W - 250;
      return { x: x, y: 250 };
    }

    function layout() {
      // Barca
      const bp = boatPos();
      boatG.setAttribute("transform", "translate(" + bp.x + "," + bp.y + ")");
      clear(boatG);
      boatG.appendChild(svg("path", { d: "M-70 0 q 70 40 140 0 l -18 34 q -52 20 -104 0 z",
        fill: "#6b4b2a", stroke: "#3e2a16", "stroke-width": 3 }));
      boatG.addEventListener("click", cross, { once: true });

      // Coloca actores
      const landIdx = { L: 0, R: 0 };
      Object.keys(actors).forEach((k) => {
        const a = actors[k];
        if ((k === "granjero" && onBoat("granjero")) || cargo === k) {
          // en la barca
          const slot = k === "granjero" ? { x: bp.x - 28, y: bp.y - 6 } : { x: bp.x + 28, y: bp.y - 6 };
          nodes[k].setAttribute("transform", "translate(" + slot.x + "," + slot.y + ")");
        } else {
          const sidePos = landSlot(a.side, landIdx[a.side]++);
          nodes[k].setAttribute("transform", "translate(" + sidePos.x + "," + sidePos.y + ")");
        }
      });
    }

    function onBoat(k) { return k === "granjero" ? granjeroOnBoat : cargo === k; }
    let granjeroOnBoat = true; // el granjero siempre viaja con la barca cuando cruza

    function toggleActor(k) {
      if (k === "granjero") { api.flag("El granjero siempre conduce la barca."); return; }
      const a = actors[k];
      if (a.side !== boat) { api.flag("Ese pasajero no está en la orilla de la barca."); return; }
      if (cargo === k) { cargo = null; }
      else if (cargo == null) { cargo = k; }
      else { api.flag("La barca solo lleva un pasajero."); return; }
      layout();
    }

    function cross() {
      // mover barca y pasajeros a la otra orilla
      boat = boat === "L" ? "R" : "L";
      actors.granjero.side = boat;
      if (cargo) actors[cargo].side = boat;
      cargo = null;
      layout();
      // comprobar peligro en la orilla que queda sin granjero
      const danger = checkDanger();
      if (danger) {
        api.flag(danger);
        setTimeout(reset, 900);
        return;
      }
      checkWin();
    }

    function checkDanger() {
      // orilla sin granjero
      const freeSide = actors.granjero.side === "L" ? "R" : "L";
      const here = Object.keys(actors).filter((k) => k !== "granjero" && actors[k].side === freeSide);
      if (here.includes("lobo") && here.includes("cabra")) return "¡El lobo se quedó con la cabra!";
      if (here.includes("cabra") && here.includes("lechuga")) return "¡La cabra se comió la lechuga!";
      return null;
    }
    function checkWin() {
      if (Object.keys(actors).every((k) => actors[k].side === "R")) api.solve();
    }

    function reset() {
      Object.keys(actors).forEach((k) => (actors[k].side = "L"));
      boat = "L"; cargo = null; layout();
    }

    layout();
    mount.appendChild(el("div", { class: "toolbar" },
      el("span", { class: "status-pill", html: "Pulsa un pasajero para subirlo · pulsa la barca para cruzar" })));
    mount.appendChild(el("div", { class: "soft-msg" }));
  }

  /* ============================================================
     DESAFÍO 5 — Luces (Lights Out). Apaga todas las luces.
     Clic alterna la celda y sus vecinas ortogonales.
     ============================================================ */
  function ch_lightsOut(mount, api) {
    const N = 4;
    const W = 440, H = 440, pad = 20;
    const cell = (W - pad * 2) / N;
    const s = svg("svg", { class: "scene-svg", viewBox: "0 0 " + W + " " + H });
    mount.appendChild(s);

    // Estado inicial resoluble: parte de apagado y aplica clics aleatorios
    const grid = Array.from({ length: N }, () => new Array(N).fill(false));
    function toggle(r, c) {
      [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dr, dc]) => {
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < N && nc >= 0 && nc < N) grid[nr][nc] = !grid[nr][nc];
      });
    }
    // mezcla determinista-ish con varios clics
    const seed = [[0, 1], [2, 2], [3, 0], [1, 3], [0, 3], [2, 0]];
    seed.forEach(([r, c]) => toggle(r, c));

    const rects = [];
    for (let r = 0; r < N; r++) {
      rects[r] = [];
      for (let c = 0; c < N; c++) {
        const rect = svg("rect", {
          x: pad + c * cell + 4, y: pad + r * cell + 4,
          width: cell - 8, height: cell - 8, rx: 12, class: "clickable",
        });
        rect.addEventListener("click", () => { toggle(r, c); draw(); check(); });
        s.appendChild(rect);
        rects[r][c] = rect;
      }
    }
    function draw() {
      for (let r = 0; r < N; r++)
        for (let c = 0; c < N; c++) {
          const on = grid[r][c];
          rects[r][c].setAttribute("fill", on ? "var(--warn)" : "#0e1524");
          rects[r][c].setAttribute("stroke", on ? "#b87420" : "var(--line)");
          rects[r][c].setAttribute("stroke-width", 2);
          rects[r][c].style.filter = on ? "drop-shadow(0 0 10px rgba(255,180,84,.6))" : "none";
        }
      const left = grid.flat().filter(Boolean).length;
      pill.innerHTML = "Luces encendidas: <b>" + left + "</b>";
    }
    function check() { if (grid.flat().every((v) => !v)) api.solve(); }

    const bar = el("div", { class: "toolbar" });
    const pill = el("span", { class: "status-pill" });
    bar.appendChild(pill);
    mount.appendChild(bar);
    mount.appendChild(el("div", { class: "soft-msg" }));
    draw();
  }

  /* ============================================================
     DESAFÍO 6 — Jarras de agua. Consigue exactamente 4 litros.
     Jarras de 5 L y 3 L.
     ============================================================ */
  function ch_waterJugs(mount, api) {
    const CAP = [5, 3], TARGET = 4;
    let vol = [0, 0];

    const W = 460, H = 360;
    const s = svg("svg", { class: "scene-svg", viewBox: "0 0 " + W + " " + H });
    mount.appendChild(s);

    const jugs = [{ x: 110, w: 150, h: 240 }, { x: 300, w: 110, h: 170 }];
    const parts = [];
    jugs.forEach((j, i) => {
      const y = H - 40 - j.h;
      s.appendChild(svg("rect", { x: j.x, y: y, width: j.w, height: j.h, rx: 10,
        fill: "rgba(255,255,255,.03)", stroke: "var(--line)", "stroke-width": 3 }));
      const water = svg("rect", { x: j.x + 3, width: j.w - 6, rx: 6,
        fill: "rgba(90,169,255,.55)", stroke: "rgba(140,200,255,.6)" });
      s.appendChild(water);
      const label = svg("text", { x: j.x + j.w / 2, y: H - 12, "text-anchor": "middle",
        fill: "var(--muted)", "font-size": 16, text: CAP[i] + " L" });
      s.appendChild(label);
      const vlabel = svg("text", { x: j.x + j.w / 2, y: y - 12, "text-anchor": "middle",
        fill: "var(--text)", "font-size": 22, "font-weight": 700 });
      s.appendChild(vlabel);
      parts.push({ water: water, vlabel: vlabel, baseY: y, h: j.h });
    });

    function draw() {
      vol.forEach((v, i) => {
        const h = (v / CAP[i]) * (parts[i].h - 6);
        parts[i].water.setAttribute("y", parts[i].baseY + parts[i].h - 3 - h);
        parts[i].water.setAttribute("height", Math.max(0, h));
        parts[i].vlabel.textContent = v + " L";
      });
      if (vol.includes(TARGET)) api.solve();
    }

    function fill(i) { vol[i] = CAP[i]; draw(); }
    function empty(i) { vol[i] = 0; draw(); }
    function pour(from, to) {
      const space = CAP[to] - vol[to];
      const amt = Math.min(vol[from], space);
      vol[from] -= amt; vol[to] += amt; draw();
    }

    const ops = el("div", { class: "op-grid" }, [
      opBtn("Llenar 5 L", () => fill(0)),
      opBtn("Llenar 3 L", () => fill(1)),
      opBtn("Vaciar 5 L", () => empty(0)),
      opBtn("Vaciar 3 L", () => empty(1)),
      opBtn("Verter 5 L → 3 L", () => pour(0, 1)),
      opBtn("Verter 3 L → 5 L", () => pour(1, 0)),
    ]);
    function opBtn(t, fn) { const b = el("button", { class: "btn btn-mini", text: t }); b.addEventListener("click", fn); return b; }
    mount.appendChild(ops);
    mount.appendChild(el("div", { class: "soft-msg" }));
    draw();
  }

  /* ============================================================
     DESAFÍO 7 — Espejos y láser. Lleva el haz al objetivo.
     Arrastra espejos a la retícula; clic para girarlos (/ o \).
     ============================================================ */
  function ch_laser(mount, api) {
    const N = 5, cell = 78, pad = 30;
    const W = pad * 2 + N * cell, H = pad * 2 + N * cell + 10;
    const s = svg("svg", { class: "scene-svg", viewBox: "0 0 " + W + " " + H });
    mount.appendChild(s);

    // retícula
    for (let i = 0; i <= N; i++) {
      s.appendChild(svg("line", { x1: pad, y1: pad + i * cell, x2: pad + N * cell, y2: pad + i * cell, stroke: "var(--line-soft)", "stroke-width": 1 }));
      s.appendChild(svg("line", { x1: pad + i * cell, y1: pad, x2: pad + i * cell, y2: pad + N * cell, stroke: "var(--line-soft)", "stroke-width": 1 }));
    }
    function cc(c) { return pad + c * cell + cell / 2; } // centro de celda

    const walls = [{ c: 2, r: 0 }];
    walls.forEach((w) => s.appendChild(svg("rect", { x: pad + w.c * cell + 6, y: pad + w.r * cell + 6, width: cell - 12, height: cell - 12, rx: 8, fill: "#3a4156", stroke: "#505a74", "stroke-width": 2 })));

    // Emisor: entra por la izquierda de la fila 0, dirección Este
    const entry = { r: 0, dir: [1, 0] };
    s.appendChild(svg("circle", { cx: pad - 8, cy: cc(entry.r), r: 10, fill: "var(--bad)", stroke: "#fff", "stroke-width": 2 }));
    // Objetivo: salida por la derecha de la fila 2
    const target = { r: 2, edge: "R" };
    const tx = pad + N * cell + 8, ty = cc(target.r);
    s.appendChild(svg("circle", { cx: tx, cy: ty, r: 12, fill: "none", stroke: "var(--good)", "stroke-width": 3 }));
    s.appendChild(svg("circle", { cx: tx, cy: ty, r: 5, fill: "var(--good)" }));

    // Espejos colocables (2). mirror.cell=null si está en el almacén
    const mirrors = [{ type: "\\", c: null, r: null }, { type: "\\", c: null, r: null }];
    const mirrorEls = [];

    const beam = svg("polyline", { fill: "none", stroke: "var(--bad)", "stroke-width": 4, "stroke-linecap": "round", opacity: ".9", filter: "drop-shadow(0 0 6px rgba(255,107,107,.6))" });
    s.appendChild(beam);

    // almacén
    const trayY = H - 4;
    function mirrorAt(c, r) { return mirrors.find((m) => m.c === c && m.r === r); }

    function drawMirrors() {
      mirrorEls.forEach((g) => g.remove());
      mirrorEls.length = 0;
      mirrors.forEach((m, i) => {
        const g = svg("g", { class: "clickable" });
        let x, y;
        if (m.c == null) { x = pad + 20 + i * 44; y = trayY - 20; }
        else { x = cc(m.c); y = cc(m.r); }
        g.appendChild(svg("rect", { x: x - 24, y: y - 24, width: 48, height: 48, rx: 8, fill: "rgba(124,240,208,.12)", stroke: "var(--accent-2)", "stroke-width": 2 }));
        let lx1, ly1, lx2, ly2;
        if (m.type === "/") { lx1 = x - 16; ly1 = y + 16; lx2 = x + 16; ly2 = y - 16; }
        else { lx1 = x - 16; ly1 = y - 16; lx2 = x + 16; ly2 = y + 16; }
        g.appendChild(svg("line", { x1: lx1, y1: ly1, x2: lx2, y2: ly2, stroke: "var(--accent-2)", "stroke-width": 5, "stroke-linecap": "round" }));
        s.appendChild(g);
        mirrorEls.push(g);
        attachMirror(g, m);
      });
    }

    let drag = null;
    function attachMirror(g, m) {
      g.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        try { g.setPointerCapture(e.pointerId); } catch (_) {}
        const p = svgPoint(s, e);
        drag = { m: m, moved: false, sx: p.x, sy: p.y };
      });
      g.addEventListener("pointermove", (e) => {
        if (!drag || drag.m !== m) return;
        const p = svgPoint(s, e);
        // umbral: un toque pequeño cuenta como clic (girar), no como arrastre
        if (Math.hypot(p.x - drag.sx, p.y - drag.sy) > 6) drag.moved = true;
        if (drag.moved) g.setAttribute("transform", "translate(" + (p.x - drag.sx) + "," + (p.y - drag.sy) + ")");
      });
      g.addEventListener("pointerup", (e) => {
        if (!drag || drag.m !== m) return;
        const p = svgPoint(s, e);
        const c = Math.floor((p.x - pad) / cell), r = Math.floor((p.y - pad) / cell);
        const inside = c >= 0 && c < N && r >= 0 && r < N;
        if (!drag.moved) {
          // toque: girar el espejo
          m.type = m.type === "/" ? "\\" : "/";
        } else if (inside && !isWall(c, r) && !(mirrorAt(c, r) && mirrorAt(c, r) !== m)) {
          m.c = c; m.r = r;
        } else if (!inside) {
          m.c = null; m.r = null; // devolver al almacén
        }
        g.removeAttribute("transform");
        drag = null;
        drawMirrors();
        computeBeam();
      });
    }
    function isWall(c, r) { return walls.some((w) => w.c === c && w.r === r); }

    function computeBeam() {
      // avanza por celdas desde la entrada
      let c = 0, r = entry.r, dir = entry.dir.slice();
      const pts = [[pad, cc(entry.r)], [cc(0), cc(entry.r)]];
      let steps = 0, win = false;
      while (steps++ < 100) {
        if (isWall(c, r)) break;
        const m = mirrorAt(c, r);
        if (m) {
          dir = reflect(dir, m.type);
          pts.push([cc(c), cc(r)]);
        }
        // avanza una celda
        const nc = c + dir[0], nr = r + dir[1];
        // ¿sale del tablero?
        if (nc < 0 || nc >= N || nr < 0 || nr >= N) {
          // punto de salida en el borde
          const ex = cc(c) + dir[0] * (cell / 2 + 10);
          const ey = cc(r) + dir[1] * (cell / 2 + 10);
          pts.push([ex, ey]);
          // ¿coincide con el objetivo?
          if (dir[0] === 1 && r === target.r && target.edge === "R" && c === N - 1) win = true;
          break;
        }
        c = nc; r = nr;
        pts.push([cc(c), cc(r)]);
      }
      beam.setAttribute("points", pts.map((p) => p[0] + "," + p[1]).join(" "));
      if (win) api.solve();
    }
    function reflect(dir, type) {
      const [x, y] = dir;
      if (type === "/") return [-y, -x];   // E<->N, W<->S
      return [y, x];                        // "\\": E<->S, W<->N
    }

    drawMirrors();
    computeBeam();
    mount.appendChild(el("div", { class: "toolbar" },
      el("span", { class: "status-pill", html: "Arrastra los espejos a la cuadrícula · pulsa un espejo para girarlo" })));
    mount.appendChild(el("div", { class: "soft-msg" }));
  }

  /* ============================================================
     DESAFÍO 8 — Balanza. Encuentra la moneda más pesada.
     9 monedas, una más pesada. Solo 2 pesadas. Luego marca la moneda.
     ============================================================ */
  function ch_balance(mount, api) {
    const N = 9;
    const heavy = Math.floor(Math.random() * N);
    let weighs = 0; const MAX = 2;
    const left = new Set(), right = new Set();
    let marking = false;

    const W = 620, H = 460;
    const s = svg("svg", { class: "scene-svg", viewBox: "0 0 " + W + " " + H });
    mount.appendChild(s);

    // Balanza
    const pivot = { x: W / 2, y: 70 };
    const beamG = svg("g", {});
    s.appendChild(beamG);
    const panL = { x: pivot.x - 150, y: 0 }, panR = { x: pivot.x + 150, y: 0 };

    function drawBalance(tilt) {
      clear(beamG);
      const t = tilt * 14;
      beamG.appendChild(svg("line", { x1: pivot.x, y1: pivot.y + 120, x2: pivot.x, y2: pivot.y, stroke: "#7a869e", "stroke-width": 6 }));
      beamG.appendChild(svg("line", { x1: pivot.x - 150, y1: pivot.y + t, x2: pivot.x + 150, y2: pivot.y - t, stroke: "#aab4cc", "stroke-width": 6, "stroke-linecap": "round" }));
      drawPan(pivot.x - 150, pivot.y + t + 8, "L");
      drawPan(pivot.x + 150, pivot.y - t + 8, "R");
    }
    function drawPan(x, y, side) {
      beamG.appendChild(svg("line", { x1: x, y1: y, x2: x, y2: y + 46, stroke: "#8793ab", "stroke-width": 2 }));
      beamG.appendChild(svg("path", { d: "M" + (x - 46) + " " + (y + 46) + " q 46 40 92 0 z", fill: "rgba(170,180,204,.25)", stroke: "#aab4cc", "stroke-width": 2 }));
      const set = side === "L" ? left : right;
      [...set].forEach((id, i) => {
        beamG.appendChild(coinMini(x - 30 + (i % 3) * 30, y + 40 - Math.floor(i / 3) * 16, id, "pan"));
      });
    }

    // Monedas en la mesa
    const tableG = svg("g", {});
    s.appendChild(tableG);
    function coinMini(x, y, id, where) {
      const g = svg("g", { class: "clickable" });
      g.appendChild(svg("circle", { cx: x, cy: y, r: 16, fill: "var(--coin)", stroke: "#a8821f", "stroke-width": 2 }));
      g.appendChild(svg("text", { x: x, y: y + 5, "text-anchor": "middle", "font-size": 14, "font-weight": 700, fill: "#5a4410", text: id + 1 }));
      g.addEventListener("click", () => onCoin(id));
      if (where === "mark") g.querySelector("circle").setAttribute("stroke-width", 3);
      return g;
    }

    function drawTable() {
      clear(tableG);
      for (let i = 0; i < N; i++) {
        if (left.has(i) || right.has(i)) continue;
        const x = 120 + (i % 5) * 95, y = 300 + Math.floor(i / 5) * 70;
        tableG.appendChild(coinMini(x, y, i, "table"));
      }
    }

    function onCoin(id) {
      if (marking) {
        if (id === heavy) api.solve();
        else api.flag("Esa no es. Pulsa Reiniciar para probar otra vez.");
        return;
      }
      // mover entre mesa / platillo izquierdo / derecho (ciclo)
      if (left.has(id)) { left.delete(id); right.add(id); }
      else if (right.has(id)) { right.delete(id); }
      else { left.add(id); }
      drawBalance(0);
      drawTable();
    }

    function doWeigh() {
      if (weighs >= MAX) { api.flag("Ya usaste las 2 pesadas disponibles."); return; }
      let wl = 0, wr = 0;
      left.forEach((i) => (wl += i === heavy ? 1.3 : 1));
      right.forEach((i) => (wr += i === heavy ? 1.3 : 1));
      const tilt = wl > wr ? 1 : wl < wr ? -1 : 0;
      drawBalance(tilt);
      weighs++;
      pill.innerHTML = "Pesadas: <b>" + weighs + "</b> / " + MAX;
    }

    const bar = el("div", { class: "toolbar" });
    const pill = el("span", { class: "status-pill", html: "Pesadas: <b>0</b> / " + MAX });
    const bw = el("button", { class: "btn btn-mini", text: "Pesar" });
    bw.addEventListener("click", doWeigh);
    const bc = el("button", { class: "btn btn-mini", text: "Quitar del platillo" });
    bc.addEventListener("click", () => { left.clear(); right.clear(); drawBalance(0); drawTable(); });
    const bm = el("button", { class: "btn btn-mini", text: "Marcar la más pesada" });
    bm.addEventListener("click", () => { marking = !marking; bm.textContent = marking ? "Cancelar marca" : "Marcar la más pesada"; api.flag(marking ? "Pulsa la moneda que creas más pesada." : ""); });
    bar.appendChild(pill); bar.appendChild(bw); bar.appendChild(bc); bar.appendChild(bm);
    mount.appendChild(bar);
    mount.appendChild(el("div", { class: "soft-msg" }));

    drawBalance(0);
    drawTable();
  }

  /* ============================================================
     DESAFÍO 9 — Cuadrado mágico 3x3. Todas las líneas suman igual.
     Arrastra los números 1..9 a las celdas.
     ============================================================ */
  function ch_magicSquare(mount, api) {
    const W = 520, H = 460, cell = 100, pad = 70;
    const s = svg("svg", { class: "scene-svg", viewBox: "0 0 " + W + " " + H });
    mount.appendChild(s);

    const gx = (W - 3 * cell) / 2, gy = 20;
    const cells = []; // {r,c,x,y,val,node}
    for (let r = 0; r < 3; r++)
      for (let c = 0; c < 3; c++) {
        const x = gx + c * cell, y = gy + r * cell;
        s.appendChild(svg("rect", { x: x + 4, y: y + 4, width: cell - 8, height: cell - 8, rx: 10, class: "slot", "stroke-dasharray": "none", fill: "rgba(255,255,255,.03)" }));
        cells.push({ r: r, c: c, cx: x + cell / 2, cy: y + cell / 2, val: null });
      }

    // bandeja de números 1..9
    const tray = [];
    const trayY = gy + 3 * cell + 40;
    for (let i = 1; i <= 9; i++) {
      tray.push({ val: i, x: 34 + (i - 1) * ((W - 68) / 8), y: trayY, placedCell: null });
    }

    const tileG = svg("g", {});
    s.appendChild(tileG);
    const tileEls = {};

    function drawTiles() {
      clear(tileG);
      tray.forEach((t) => {
        let x, y;
        if (t.placedCell) { x = t.placedCell.cx; y = t.placedCell.cy; }
        else { x = t.x; y = t.y; }
        const g = svg("g", { class: "clickable" });
        g.appendChild(svg("circle", { cx: x, cy: y, r: 26, class: "coin-piece" }));
        g.appendChild(svg("text", { x: x, y: y + 7, "text-anchor": "middle", "font-size": 24, "font-weight": 800, fill: "#5a4410", text: t.val }));
        tileG.appendChild(g);
        tileEls[t.val] = g;
        attachDrag(g, t);
      });
    }

    let drag = null;
    function attachDrag(g, t) {
      const circle = g.querySelector("circle"), txt = g.querySelector("text");
      g.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        try { s.setPointerCapture(e.pointerId); } catch (_) {}
        const p = svgPoint(s, e);
        drag = { t: t, offx: p.x - +circle.getAttribute("cx"), offy: p.y - +circle.getAttribute("cy") };
        tileG.appendChild(g);
      });
    }
    s.addEventListener("pointermove", (e) => {
      if (!drag) return;
      const p = svgPoint(s, e);
      const g = tileEls[drag.t.val];
      const x = p.x - drag.offx, y = p.y - drag.offy;
      g.querySelector("circle").setAttribute("cx", x);
      g.querySelector("circle").setAttribute("cy", y);
      g.querySelector("text").setAttribute("x", x);
      g.querySelector("text").setAttribute("y", y + 7);
    });
    s.addEventListener("pointerup", (e) => {
      if (!drag) return;
      const p = svgPoint(s, e);
      const t = drag.t;
      // celda más cercana libre
      let best = null, bd = 55;
      cells.forEach((cl) => {
        const occupied = tray.find((tt) => tt !== t && tt.placedCell === cl);
        if (occupied) return;
        const d = Math.hypot(p.x - cl.cx, p.y - cl.cy);
        if (d < bd) { bd = d; best = cl; }
      });
      t.placedCell = best; // puede ser null -> vuelve a bandeja
      drag = null;
      drawTiles();
      check();
    });

    function valAt(r, c) {
      const t = tray.find((tt) => tt.placedCell && tt.placedCell.r === r && tt.placedCell.c === c);
      return t ? t.val : null;
    }
    function lineSum(coords) {
      let sum = 0;
      for (const [r, c] of coords) { const v = valAt(r, c); if (v == null) return null; sum += v; }
      return sum;
    }
    function check() {
      const lines = [
        [[0,0],[0,1],[0,2]], [[1,0],[1,1],[1,2]], [[2,0],[2,1],[2,2]],
        [[0,0],[1,0],[2,0]], [[0,1],[1,1],[2,1]], [[0,2],[1,2],[2,2]],
        [[0,0],[1,1],[2,2]], [[0,2],[1,1],[2,0]],
      ];
      const sums = lines.map(lineSum);
      if (sums.some((x) => x == null)) return;
      if (sums.every((x) => x === sums[0])) api.solve();
    }

    drawTiles();
    mount.appendChild(el("div", { class: "toolbar" },
      el("span", { class: "status-pill", html: "Arrastra cada número a una casilla" })));
    mount.appendChild(el("div", { class: "soft-msg" }));
  }

  /* ============================================================
     DESAFÍO 10 — Seis vasos. Deja llenos y vacíos alternados
     tocando un solo vaso. (3 llenos a la izquierda, 3 vacíos a la derecha.)
     ============================================================ */
  function ch_glasses(mount, api) {
    const W = 660, H = 380;
    const s = svg("svg", { class: "scene-svg", viewBox: "0 0 " + W + " " + H });
    mount.appendChild(s);

    // estado: full[i] boolean. inicio: 1 1 1 0 0 0
    const glasses = [true, true, true, false, false, false];
    let touches = 0;
    let picked = null; // índice de vaso levantado para verter

    const gw = 80, gap = 24, baseY = 260;
    const startX = (W - (6 * gw + 5 * gap)) / 2;
    const groups = [];

    function draw() {
      groups.forEach((g) => g.remove());
      groups.length = 0;
      glasses.forEach((full, i) => {
        const x = startX + i * (gw + gap);
        const g = svg("g", { class: "clickable" });
        // vaso (trapecio)
        g.appendChild(svg("path", { d: "M" + x + " " + (baseY - 130) + " L" + (x + gw) + " " + (baseY - 130) + " L" + (x + gw - 10) + " " + baseY + " L" + (x + 10) + " " + baseY + " z",
          fill: "rgba(255,255,255,.05)", stroke: picked === i ? "var(--accent)" : "var(--line)", "stroke-width": picked === i ? 4 : 3 }));
        if (full) {
          g.appendChild(svg("path", { d: "M" + (x + 6) + " " + (baseY - 95) + " L" + (x + gw - 6) + " " + (baseY - 95) + " L" + (x + gw - 11) + " " + (baseY - 3) + " L" + (x + 11) + " " + (baseY - 3) + " z",
            fill: "rgba(90,169,255,.55)", stroke: "rgba(140,200,255,.5)" }));
        }
        g.appendChild(svg("text", { x: x + gw / 2, y: baseY + 26, "text-anchor": "middle", fill: "var(--muted)", "font-size": 15, text: i + 1 }));
        g.addEventListener("click", () => onClick(i));
        s.appendChild(g);
        groups.push(g);
      });
      pill.innerHTML = "Vasos tocados: <b>" + touches + "</b>";
    }

    function onClick(i) {
      if (picked == null) {
        if (!glasses[i]) { api.flag("Ese vaso está vacío; no hay nada que verter."); return; }
        picked = i;
        draw();
      } else {
        if (i === picked) { picked = null; draw(); return; }
        if (glasses[i]) { api.flag("Ese vaso ya está lleno."); return; }
        // verter picked -> i  (cuenta como UN vaso tocado: el que levantas)
        glasses[picked] = false;
        glasses[i] = true;
        touches++;
        picked = null;
        draw();
        check();
      }
    }

    function check() {
      // alternancia lleno/vacío (cualquiera de las dos fases)
      const a = glasses.every((v, i) => v === (i % 2 === 0));
      const b = glasses.every((v, i) => v === (i % 2 === 1));
      if ((a || b) && touches <= 1) api.solve();
      else if ((a || b) && touches > 1) api.flag("¡Alternan! Pero tocaste más de un vaso. Pulsa Reiniciar.");
    }

    const bar = el("div", { class: "toolbar" });
    const pill = el("span", { class: "status-pill" });
    bar.appendChild(pill);
    mount.appendChild(bar);
    mount.appendChild(el("div", { class: "soft-msg" }));
    draw();
  }

  /* ============================================================
     DESAFÍO 11 — Laberinto. Lleva el punto hasta la salida.
     Laberinto "perfecto" generado al azar (recursive backtracker),
     distinto en cada reinicio. Muévete con las flechas del teclado
     (o WASD) o pulsando una casilla contigua.
     ============================================================ */
  function ch_maze(mount, api) {
    const cols = 9, rows = 9, cell = 42, pad = 26;
    const W = pad * 2 + cols * cell, H = pad * 2 + rows * cell;
    const s = svg("svg", { class: "scene-svg", viewBox: "0 0 " + W + " " + H, tabindex: "0" });
    mount.appendChild(s);

    // walls[r][c] = { N, E, S, W } (true = hay muro)
    const walls = [];
    for (let r = 0; r < rows; r++) {
      walls[r] = [];
      for (let c = 0; c < cols; c++) walls[r][c] = { N: true, E: true, S: true, W: true };
    }

    // Generación: recursive backtracker (garantiza camino único inicio→salida)
    const visited = Array.from({ length: rows }, () => new Array(cols).fill(false));
    const stack = [[0, 0]]; visited[0][0] = true;
    const DIRS = [["N", 0, -1, "S"], ["E", 1, 0, "W"], ["S", 0, 1, "N"], ["W", -1, 0, "E"]];
    while (stack.length) {
      const [c, r] = stack[stack.length - 1];
      const opts = DIRS.filter(([, dc, dr]) => {
        const nc = c + dc, nr = r + dr;
        return nc >= 0 && nc < cols && nr >= 0 && nr < rows && !visited[nr][nc];
      });
      if (!opts.length) { stack.pop(); continue; }
      const [d, dc, dr, opp] = opts[Math.floor(Math.random() * opts.length)];
      const nc = c + dc, nr = r + dr;
      walls[r][c][d] = false; walls[nr][nc][opp] = false;
      visited[nr][nc] = true; stack.push([nc, nr]);
    }

    function cx(c) { return pad + c * cell + cell / 2; }
    function cy(r) { return pad + r * cell + cell / 2; }

    // Fondo y casillas de inicio / salida
    s.appendChild(svg("rect", { x: pad, y: pad, width: cols * cell, height: rows * cell, fill: "rgba(255,255,255,.02)", rx: 6 }));
    s.appendChild(svg("rect", { x: pad + 3, y: pad + 3, width: cell - 6, height: cell - 6, rx: 6, fill: "rgba(90,169,255,.18)", stroke: "var(--accent)", "stroke-width": 1.5 }));
    const exitC = cols - 1, exitR = rows - 1;
    s.appendChild(svg("rect", { x: pad + exitC * cell + 3, y: pad + exitR * cell + 3, width: cell - 6, height: cell - 6, rx: 6, fill: "rgba(70,214,160,.18)", stroke: "var(--good)", "stroke-width": 1.5 }));
    s.appendChild(svg("text", { x: cx(exitC), y: cy(exitR) + 8, "text-anchor": "middle", "font-size": 22, text: "🏁" }));

    // Rastro + muros
    const trail = svg("polyline", { fill: "none", stroke: "rgba(90,169,255,.3)", "stroke-width": 7, "stroke-linecap": "round", "stroke-linejoin": "round" });
    s.appendChild(trail);
    const trailPts = [[cx(0), cy(0)]];

    const wallG = svg("g", {});
    s.appendChild(wallG);
    function wallLine(x1, y1, x2, y2) {
      wallG.appendChild(svg("line", { x1: x1, y1: y1, x2: x2, y2: y2, stroke: "#6b7694", "stroke-width": 3, "stroke-linecap": "round" }));
    }
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        const x = pad + c * cell, y = pad + r * cell, w = walls[r][c];
        if (w.N) wallLine(x, y, x + cell, y);
        if (w.W) wallLine(x, y, x, y + cell);
        if (w.E) wallLine(x + cell, y, x + cell, y + cell);
        if (w.S) wallLine(x, y + cell, x + cell, y + cell);
      }

    // Ficha del jugador
    let pc = 0, pr = 0, finished = false;
    const token = svg("circle", { cx: cx(0), cy: cy(0), r: cell * 0.28, fill: "var(--accent)", stroke: "#fff", "stroke-width": 2, filter: "drop-shadow(0 0 6px rgba(90,169,255,.6))" });
    s.appendChild(token);

    function move(dir) {
      if (finished || walls[pr][pc][dir]) return;
      const map = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] };
      pc += map[dir][0]; pr += map[dir][1];
      token.setAttribute("cx", cx(pc)); token.setAttribute("cy", cy(pr));
      trailPts.push([cx(pc), cy(pr)]);
      trail.setAttribute("points", trailPts.map((p) => p.join(",")).join(" "));
      if (pc === exitC && pr === exitR) { finished = true; api.solve(); }
    }

    // Clic en casilla contigua
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        const rect = svg("rect", { x: pad + c * cell, y: pad + r * cell, width: cell, height: cell, fill: "transparent", class: "clickable" });
        rect.addEventListener("click", () => {
          if (c === pc && r === pr - 1) move("N");
          else if (c === pc + 1 && r === pr) move("E");
          else if (c === pc && r === pr + 1) move("S");
          else if (c === pc - 1 && r === pr) move("W");
        });
        s.appendChild(rect);
      }

    // Teclado
    s.addEventListener("keydown", function (e) {
      const k = { ArrowUp: "N", ArrowRight: "E", ArrowDown: "S", ArrowLeft: "W",
        w: "N", W: "N", d: "E", D: "E", s: "S", S: "S", a: "W", A: "W" }[e.key];
      if (k) { e.preventDefault(); move(k); }
    });
    setTimeout(function () { try { s.focus(); } catch (err) {} }, 0);

    mount.appendChild(el("div", { class: "toolbar" },
      el("span", { class: "status-pill", html: "Usa las flechas del teclado o pulsa una casilla contigua" })));
    mount.appendChild(el("div", { class: "soft-msg" }));
  }

  /* ============================================================
     Registro de desafíos
     ============================================================ */
  const challenges = [
    { title: "Nueve puntos", objective: "Une los 9 puntos con una línea continua de 4 trazos.", build: ch_nineDots },
    { title: "La igualdad rota", objective: "Mueve una sola cerilla para que la operación sea correcta.", build: ch_matches },
    { title: "El triángulo de monedas", objective: "Haz que el triángulo apunte hacia abajo.", build: ch_coinTriangle },
    { title: "El río", objective: "Lleva al granjero, el lobo, la cabra y la lechuga a la otra orilla.", build: ch_river },
    { title: "Apágalas todas", objective: "Apaga todas las luces.", build: ch_lightsOut },
    { title: "Cuatro litros", objective: "Consigue exactamente 4 litros en una jarra.", build: ch_waterJugs },
    { title: "El haz de luz", objective: "Haz que el láser alcance el objetivo verde.", build: ch_laser },
    { title: "La moneda pesada", objective: "Encuentra la moneda más pesada. Solo puedes usar la balanza 2 veces.", build: ch_balance },
    { title: "Líneas iguales", objective: "Coloca los números para que todas las líneas sumen lo mismo.", build: ch_magicSquare },
    { title: "Seis vasos", objective: "Deja los vasos alternando lleno y vacío tocando un solo vaso.", build: ch_glasses },
    { title: "El laberinto", objective: "Lleva el punto hasta la salida.", build: ch_maze },
  ];

  // Dimensiona el estado y el contador total según el número de desafíos
  challenges.forEach(function () { solved.push(false); });
  const totalEl = document.getElementById("ch-total");
  if (totalEl) totalEl.textContent = challenges.length;

  // expone para depuración ligera
  window.__lab = { challenges: challenges };
})();

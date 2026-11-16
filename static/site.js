/* Cyclindex: theme toggle, rider search, timeline tooltip. */
(function () {
  "use strict";
  var root = document.documentElement;

  // ---- theme ---------------------------------------------------------------
  function currentTheme() {
    if (root.dataset.theme) return root.dataset.theme;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }
  var themeBtn = document.getElementById("theme");
  if (themeBtn) themeBtn.addEventListener("click", function () {
    var next = currentTheme() === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    try { localStorage.setItem("cx-theme", next); } catch (e) {}
  });

  // ---- rider search ----------------------------------------------------------
  var q = document.getElementById("q"), list = document.getElementById("q-results"), index = null, active = -1;
  function norm(s) { return (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase(); }
  function load() {
    if (index) return Promise.resolve(index);
    return fetch("/data/search.json").then(function (r) { return r.json(); }).then(function (d) {
      index = d.map(function (x) { x.q = norm(x.n); return x; });
      return index;
    });
  }
  function render(items) {
    list.innerHTML = "";
    active = -1;
    if (!items.length) { list.hidden = true; return; }
    items.forEach(function (x) {
      var li = document.createElement("li"), a = document.createElement("a");
      a.href = x.u;
      a.innerHTML = "<span><em></em></span><small></small>";
      a.firstChild.firstChild.textContent = x.k;
      a.firstChild.appendChild(document.createTextNode(x.n));
      a.lastChild.textContent = x.x;
      li.appendChild(a); list.appendChild(li);
    });
    list.hidden = false;
  }
  if (q) {
    q.addEventListener("focus", load);
    q.addEventListener("input", function () {
      var v = norm(q.value.trim());
      if (v.length < 2) { render([]); return; }
      load().then(function (idx) {
        // names that start with the query first, then the rest
        var hits = idx.filter(function (x) { return x.q.indexOf(v) !== -1; });
        hits.sort(function (a, b) { return (b.q.indexOf(v) === 0) - (a.q.indexOf(v) === 0); });
        render(hits.slice(0, 10));
      });
    });
    q.addEventListener("keydown", function (e) {
      var links = list.querySelectorAll("a");
      if (!links.length) return;
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        active = (active + (e.key === "ArrowDown" ? 1 : -1) + links.length) % links.length;
        links.forEach(function (l, i) { l.classList.toggle("is-active", i === active); });
      } else if (e.key === "Enter") {
        window.location.href = links[Math.max(active, 0)].href;
      } else if (e.key === "Escape") { render([]); }
    });
    document.addEventListener("click", function (e) { if (!e.target.closest(".search")) list.hidden = true; });
  }

  // ---- phone menu ---------------------------------------------------------------
  var menuBtn = document.getElementById("menu"), nav = document.getElementById("nav");
  if (menuBtn) menuBtn.addEventListener("click", function () {
    var open = menuBtn.getAttribute("aria-expanded") !== "true";
    menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
    nav.classList.toggle("is-open", open);
  });

  // ---- timeline tooltip --------------------------------------------------------
  document.querySelectorAll(".tl").forEach(function (fig) {
    var pts = JSON.parse(fig.dataset.points), svg = fig.querySelector("svg"), hover = fig.querySelector(".tl__hover");
    var cross = fig.querySelector(".tl__cross"), dot = fig.querySelector(".tl__dot"), tip = fig.querySelector(".tl__tip");
    var vb = svg.viewBox.baseVal;
    var months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    function show(evt) {
      var r = svg.getBoundingClientRect(), x = (evt.clientX - r.left) / r.width * vb.width;
      var best = pts[0];
      pts.forEach(function (p) { if (Math.abs(p.x - x) < Math.abs(best.x - x)) best = p; });
      hover.removeAttribute("hidden"); tip.hidden = false;   // SVG elements have no .hidden property
      cross.setAttribute("x1", best.x); cross.setAttribute("x2", best.x);
      dot.setAttribute("cx", best.x); dot.setAttribute("cy", best.y);
      var d = best.d.split("-");
      tip.innerHTML = "<b></b> &nbsp;" + (+d[2]) + " " + months[+d[1] - 1] + " " + d[0];
      tip.firstChild.textContent = best.v.toFixed(2);
      tip.style.left = (best.x / vb.width * r.width) + "px";
      tip.style.top = (best.y / vb.height * r.height) + "px";
    }
    function hide() { hover.setAttribute("hidden", ""); tip.hidden = true; }
    svg.addEventListener("pointermove", show);
    svg.addEventListener("pointerdown", show);
    svg.addEventListener("pointerleave", hide);
  });
})();

/* Pulse: switch between riders, teams and nations (the first one is picked at random in home.html). */
(function () {
  "use strict";
  var root = document.documentElement;
  var btns = Array.prototype.slice.call(document.querySelectorAll(".pulse-seg button"));
  if (!btns.length) return;
  function show(kind) {
    root.dataset.pulse = kind;
    btns.forEach(function (b) { b.setAttribute("aria-selected", b.dataset.pulse === kind ? "true" : "false"); });
  }
  show(root.dataset.pulse || "riders");
  btns.forEach(function (b) { b.addEventListener("click", function () { show(b.dataset.pulse); }); });
})();

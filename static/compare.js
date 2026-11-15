/* Compare up to 3 riders: DNA radar overlay, spec table, Overall Index timelines.
   Data: /data/riders.json (who can be picked) and /data/riders/<slug>.json. */
(function () {
  "use strict";
  var SPECS = window.CX_SPECS, LO = 40, HI = 100, MAX = 3;
  var slots = Array.prototype.slice.call(document.querySelectorAll(".cmp-slot"));
  var chosen = [null, null, null], data = {}, index = null;
  var out = document.getElementById("cmp-out"), empty = document.getElementById("cmp-empty");
  var NS = "http://www.w3.org/2000/svg";

  function norm(s) { return (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase(); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function loadIndex() {
    if (index) return Promise.resolve(index);
    return fetch("/data/riders.json").then(function (r) { return r.json(); }).then(function (d) {
      index = d.map(function (x) { x.k = norm(x.n + " " + (x.t || "")); return x; }); return index;
    });
  }
  function loadRider(slug) {
    if (data[slug]) return Promise.resolve(data[slug]);
    return fetch("/data/riders/" + slug + ".json").then(function (r) { if (!r.ok) throw r; return r.json(); })
      .then(function (d) { data[slug] = d; return d; });
  }

  // ---- slot pickers -----------------------------------------------------------
  slots.forEach(function (slot, i) {
    var input = slot.querySelector("input"), list = slot.querySelector(".search__results"), x = slot.querySelector(".cmp-slot__x");
    input.addEventListener("focus", loadIndex);
    input.addEventListener("input", function () {
      var v = norm(input.value.trim());
      list.innerHTML = "";
      if (v.length < 2) { list.hidden = true; return; }
      loadIndex().then(function (idx) {
        var hits = idx.filter(function (r) { return r.k.indexOf(v) !== -1 && chosen.indexOf(r.s) === -1; }).slice(0, 8);
        list.innerHTML = "";
        hits.forEach(function (h) {
          var li = document.createElement("li"), a = document.createElement("a");
          a.href = "#"; a.innerHTML = "<span></span><small></small>";
          a.firstChild.textContent = h.n; a.lastChild.textContent = "#" + h.r + " · " + h.i.toFixed(1);
          a.addEventListener("click", function (e) { e.preventDefault(); pick(i, h.s); list.hidden = true; });
          li.appendChild(a); list.appendChild(li);
        });
        list.hidden = !hits.length;
      });
    });
    x.addEventListener("click", function () { chosen[i] = null; sync(); });
  });
  document.addEventListener("click", function (e) {
    if (!e.target.closest(".cmp-slot")) slots.forEach(function (s) { s.querySelector(".search__results").hidden = true; });
  });

  function pick(i, slug) { chosen[i] = slug; sync(); }

  function sync() {
    var list = chosen.filter(Boolean);
    chosen = list.concat([null, null, null]).slice(0, MAX);
    history.replaceState(null, "", list.length ? "?r=" + list.join(",") : location.pathname);
    Promise.all(list.map(loadRider)).then(function (riders) {
      slots.forEach(function (slot, i) {
        var r = chosen[i] ? data[chosen[i]] : null, input = slot.querySelector("input");
        input.value = r ? r.name : "";
        slot.classList.toggle("is-set", !!r);
        slot.querySelector(".cmp-slot__x").hidden = !r;
        slot.hidden = i > list.length;              // show one empty slot after the chosen ones
      });
      out.hidden = !riders.length; empty.hidden = !!riders.length;
      if (riders.length) { radar(riders); table(riders); timeline(riders); legend(riders); }
    }).catch(function () { empty.hidden = false; });
  }

  // ---- radar --------------------------------------------------------------------
  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function radar(riders) {
    var svg = document.getElementById("cmp-radar"), size = 340, c = size / 2, R = size / 2 - 44, n = SPECS.length;
    svg.innerHTML = "";
    for (var v = 50; v <= 100; v += 10) {
      el("circle", { "class": "radar__ring", cx: c, cy: c, r: R * (v - LO) / (HI - LO) }, svg);
      var t = el("text", { "class": "radar__scale", x: c + 4, y: c - R * (v - LO) / (HI - LO) - 3 }, svg); t.textContent = v;
    }
    SPECS.forEach(function (s, i) {
      var a = -Math.PI / 2 + 2 * Math.PI * i / n;
      el("line", { "class": "radar__axis", x1: c, y1: c, x2: c + R * Math.cos(a), y2: c + R * Math.sin(a) }, svg);
      var anchor = Math.abs(Math.cos(a)) < 0.3 ? "middle" : (Math.cos(a) > 0 ? "start" : "end");
      var l = el("text", { "class": "radar__lbl", x: c + (R + 22) * Math.cos(a), y: c + (R + 22) * Math.sin(a) + 4, "text-anchor": anchor }, svg);
      l.textContent = s.short;
    });
    riders.forEach(function (r, k) {
      var pts = SPECS.map(function (s, i) {
        var a = -Math.PI / 2 + 2 * Math.PI * i / n, v = Math.min(Math.max(r.specs[s.name].index, LO), HI), f = (v - LO) / (HI - LO);
        return (c + R * f * Math.cos(a)).toFixed(1) + "," + (c + R * f * Math.sin(a)).toFixed(1);
      });
      el("polygon", { "class": "cmp-shape cmp-c" + k, points: pts.join(" ") }, svg);
    });
  }

  // ---- table --------------------------------------------------------------------
  function table(riders) {
    var h = '<thead><tr><th scope="col">Specialty</th>' + riders.map(function (r, k) {
      return '<th scope="col"><span class="cmp-sw cmp-bg' + k + '"></span>' + esc(r.name.split(" ").slice(-1)[0]) + "</th>";
    }).join("") + "</tr></thead><tbody>";
    SPECS.forEach(function (s) {
      var vals = riders.map(function (r) { return r.specs[s.name].index; }), best = Math.max.apply(null, vals);
      h += '<tr><th scope="row"><span class="specs__code">' + s.short + "</span> " + esc(s.name) + "</th>" + riders.map(function (r, k) {
        var v = r.specs[s.name];
        return '<td class="' + (riders.length > 1 && v.index === best && best > LO ? "is-best cmp-t" + k : "") + '">' + v.index.toFixed(1) +
          '<small>#' + v.rank + "</small></td>";
      }).join("") + "</tr>";
    });
    document.getElementById("cmp-table").innerHTML = h + "</tbody>";
  }

  // ---- timeline -----------------------------------------------------------------
  function timeline(riders) {
    var svg = document.getElementById("cmp-tl"), w = 720, h = 240, pl = 36, pb = 22, pt = 10, iw = w - pl - 6, ih = h - pb - pt;
    svg.innerHTML = "";
    var all = []; riders.forEach(function (r) { r.timeline.forEach(function (p) { all.push(p[1]); }); });
    var lo = Math.max(LO, Math.floor((Math.min.apply(null, all) - 2) / 5) * 5), hi = Math.min(HI, Math.ceil((Math.max.apply(null, all) + 2) / 5) * 5);
    var step = hi - lo <= 30 ? 5 : 10;
    function y(v) { return pt + ih - (v - lo) / (hi - lo) * ih; }
    for (var g = lo; g <= hi; g += step) {
      el("line", { "class": "tl__grid", x1: pl, x2: w - 6, y1: y(g), y2: y(g) }, svg);
      var t = el("text", { "class": "tl__y", x: pl - 8, y: y(g) + 4, "text-anchor": "end" }, svg); t.textContent = g;
    }
    var pts = riders[0].timeline, n = pts.length, last = null;
    pts.forEach(function (p, i) {
      var m = p[0].slice(0, 7);
      if (m !== last && +p[0].slice(8, 10) <= 7) {
        var t = el("text", { "class": "tl__x", x: pl + i * iw / (n - 1), y: h - 4, "text-anchor": "middle" }, svg);
        t.textContent = new Date(p[0] + "T12:00:00").toLocaleString("en", { month: "short" }).toUpperCase();
      }
      last = m;
    });
    riders.forEach(function (r, k) {
      var d = r.timeline.map(function (p, i) { return (i ? "L" : "M") + (pl + i * iw / (n - 1)).toFixed(1) + "," + y(p[1]).toFixed(1); }).join(" ");
      el("path", { "class": "cmp-line cmp-c" + k, d: d }, svg);
      var lp = r.timeline[n - 1];
      el("circle", { "class": "cmp-end cmp-f" + k, cx: pl + iw, cy: y(lp[1]), r: 4 }, svg);
    });
  }
  function legend(riders) {
    document.getElementById("cmp-legend").innerHTML = riders.map(function (r, k) {
      return '<li><span class="cmp-sw cmp-bg' + k + '"></span><a href="/rider/' + esc(r.slug) + '/">' + esc(r.name) + "</a> <b>" +
        r.specs.OVERALL.index.toFixed(2) + "</b> <small>#" + r.specs.OVERALL.rank + "</small></li>";
    }).join("");
  }

  var q = new URLSearchParams(location.search).get("r");
  chosen = (q ? q.split(",") : []).filter(Boolean).slice(0, MAX).concat([null, null, null]).slice(0, MAX);
  sync();
})();

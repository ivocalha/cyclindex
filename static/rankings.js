/* Rankings: riders / teams / nations x 14 specs. Data: /data/rankings/<spec>.json */
(function () {
  "use strict";
  var body = document.getElementById("rk-body"), more = document.getElementById("rk-more");
  var title = document.getElementById("rk-title"), about = document.getElementById("rk-about");
  var filter = document.getElementById("rk-filter");
  var chips = Array.prototype.slice.call(document.querySelectorAll(".chip"));
  var kinds = Array.prototype.slice.call(document.querySelectorAll(".seg button[data-kind]"));
  var seasons = Array.prototype.slice.call(document.querySelectorAll("#rk-season button"));
  var chg = document.getElementById("rk-chg"), asof = document.getElementById("rk-asof");
  var cache = {}, state = { spec: "overall", kind: "riders", season: "", shown: 50 }, since = "in 4 weeks";
  var PAGE = 50;

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function norm(s) { return (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase(); }

  function spark(vals) {
    var w = 110, h = 28, p = 2, lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals);
    if (hi - lo < 4) { var m = (hi + lo) / 2; lo = m - 2; hi = m + 2; }
    var pts = vals.map(function (v, i) {
      return (p + i * (w - 2 * p) / (vals.length - 1)).toFixed(1) + "," + (p + (h - 2 * p) * (1 - (v - lo) / (hi - lo))).toFixed(1);
    }).join(" ");
    return '<svg class="spark" viewBox="0 0 ' + w + " " + h + '" preserveAspectRatio="none" aria-hidden="true"><polyline points="' + pts + '" fill="none" vector-effect="non-scaling-stroke"/></svg>';
  }
  function move(m) {
    if (m === null || m === undefined) return '<span class="mv mv--new" title="Not ranked ' + esc(since) + '">NEW</span>';
    if (m > 0) return '<span class="mv mv--up" title="Up ' + m + " places " + esc(since) + '">▲' + m + "</span>";
    if (m < 0) return '<span class="mv mv--down" title="Down ' + (-m) + " places " + esc(since) + '">▼' + (-m) + "</span>";
    return '<span class="mv mv--flat" title="Same place, ' + esc(since) + '">–</span>';
  }
  function cc(c, name) {
    if (!c) return "";
    var label = esc(name || (c === "rf" ? "Neutral" : c.toUpperCase()));
    var cls = c === "rf" ? "flag flag--neutral" : "fi fi-" + esc(c) + " flag";   // 'rf' = neutral riders
    return '<span class="' + cls + '" role="img" aria-label="' + label + '" title="' + label + '"></span> ';
  }
  function riderName(r) {
    return r.p ? '<a href="/rider/' + esc(r.slug) + '/">' + esc(r.name) + "</a>" : "<span>" + esc(r.name) + "</span>";
  }

  function row(kind, r) {
    var who;
    if (kind === "riders") {
      who = riderName(r) + "<small>" + cc(r.cc, r.cn) + esc(r.team || "") + "</small>";
    } else {
      var names = r.top.map(function (t) { return esc(t.name); }).join(", ");
      var href = "/" + (kind === "teams" ? "team" : "nation") + "/" + esc(r.page) + "/";
      var name = r.page ? '<a href="' + href + '">' + esc(r.name) + "</a>" : esc(r.name);
      who = "<span>" + (kind === "nations" ? cc(r.cc, r.cn) : "") + name + "</span><small>Best: " + names + "</small>";
    }
    // the three yearly Scores behind the Index (teams / nations: the average over their best riders) (columns on wide screens, a small line on phones)
    var per = "";
    if (r.period != null) {
      var v = [r.period, r.prior, r.two].map(function (x) { return x == null ? "–" : x.toFixed(1); });
      per = '<span class="num rk-per">' + v[0] + '</span><span class="num rk-per">' + v[1] + '</span><span class="num rk-per">' + v[2] + "</span>";
      who += '<small class="rk-per-m">' + v[0] + " · " + v[1] + " · " + v[2] + " <i>(×1 · ×½ · ×¼)</i></small>";
    }
    return '<div class="rk-row"><span class="rk-rank">' + r.rank + "</span>" + move(r.move) +
      '<span class="rk-who">' + who + "</span>" + spark(r.spark) +
      '<span class="rk-idx">' + r.index.toFixed(2) + "</span>" + per + "</div>";
  }

  function rows() {
    var d = cache[key()], list = d[state.kind], f = norm(filter.value.trim());
    if (f) list = list.filter(function (r) {
      return norm(r.name + " " + (r.team || "") + " " + (r.top ? r.top.map(function (t) { return t.name; }).join(" ") : "")).indexOf(f) !== -1;
    });
    return list;
  }

  // the change column: 4 weeks in season, the whole season off-season and for a past season's final ranking
  function show(d) {
    if (d.change) {
      since = d.change.since;
      chg.textContent = d.change.label; chg.title = "Change " + since;
    }
    asof.textContent = state.season ? "final ranking, 31 Dec " + state.season : asof.dataset.today;
    draw();
  }
  function draw() {
    var list = rows();
    if (!list.length) { body.innerHTML = '<p class="rk-empty">Nobody matches that filter.</p>'; more.hidden = true; return; }
    body.innerHTML = list.slice(0, state.shown).map(function (r) { return row(state.kind, r); }).join("");
    more.hidden = list.length <= state.shown;
    more.textContent = "Show more (" + (list.length - state.shown) + " left)";
  }

  function key() { return (state.season ? state.season + "/" : "") + state.spec; }
  function select(spec, kind, push, season) {
    if (season !== undefined) state.season = season;
    state.spec = spec; state.kind = kind; state.shown = PAGE;
    seasons.forEach(function (b) { b.setAttribute("aria-selected", b.dataset.season === state.season ? "true" : "false"); });
    chips.forEach(function (c) { c.setAttribute("aria-selected", c.dataset.spec === spec ? "true" : "false"); });
    kinds.forEach(function (b) { b.setAttribute("aria-selected", b.dataset.kind === kind ? "true" : "false"); });
    document.getElementById("rk-table").classList.toggle("rk-table--riders", true);
    var chip = chips.filter(function (c) { return c.dataset.spec === spec; })[0] || chips[0];
    var label = { riders: "", teams: " · Teams", nations: " · Nations" }[kind];
    title.textContent = (chip.dataset.name === "OVERALL" ? "Overall" : chip.dataset.name) + " Index" + label;
    about.textContent = chip.dataset.about;
    document.title = title.textContent + " · Cyclindex";
    if (push) {
      var url = "?spec=" + spec + (kind !== "riders" ? "&kind=" + kind : "") + (state.season ? "&season=" + state.season : "");
      history.replaceState(null, "", url);
    }
    var k = key();
    if (cache[k]) { show(cache[k]); return; }
    body.innerHTML = '<p class="rk-loading">Loading ranking…</p>';
    more.hidden = true;
    fetch("/data/rankings/" + k + ".json").then(function (r) { return r.json(); }).then(function (d) {
      cache[k] = d;
      if (key() === k) show(d);
    }).catch(function () { body.innerHTML = '<p class="rk-empty">Could not load this ranking.</p>'; });
  }

  chips.forEach(function (c) { c.addEventListener("click", function () { select(c.dataset.spec, state.kind, true); c.scrollIntoView({ block: "nearest", inline: "nearest" }); }); });
  kinds.forEach(function (b) { b.addEventListener("click", function () { select(state.spec, b.dataset.kind, true); }); });
  seasons.forEach(function (b) { b.addEventListener("click", function () { select(state.spec, state.kind, true, b.dataset.season); }); });
  more.addEventListener("click", function () { state.shown += PAGE * 2; draw(); });
  filter.addEventListener("input", function () { state.shown = PAGE; if (cache[state.spec]) draw(); });

  var params = new URLSearchParams(location.search);
  var spec = params.get("spec"), kind = params.get("kind"), season = params.get("season") || "";
  if (!seasons.some(function (b) { return b.dataset.season === season; })) season = "";
  if (!chips.some(function (c) { return c.dataset.spec === spec; })) spec = "overall";
  if (["riders", "teams", "nations"].indexOf(kind) === -1) kind = "riders";
  select(spec, kind, false, season);
  var sel = chips.filter(function (c) { return c.dataset.spec === spec; })[0];
  if (sel && spec !== "overall") sel.scrollIntoView({ block: "nearest", inline: "center" });
})();

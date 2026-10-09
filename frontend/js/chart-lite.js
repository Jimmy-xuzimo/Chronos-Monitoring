/* ============================================================
   CHRONOS — chart-lite.js
   轻量级 canvas 曲线图（替代 Chart.js，零依赖 ~2KB）
   - 固定长度环形缓冲（默认 40 点）
   - 中点二次贝塞尔平滑曲线
   - devicePixelRatio 高清渲染（上限 2，兼顾 2 核 2G 服务器）
   - 每次 render 前自动检查尺寸变化，免 ResizeObserver
   ============================================================ */

(function () {
  "use strict";

  var MAX_POINTS = 40;

  function create(canvas, opts) {
    opts = opts || {};
    var ctx = canvas.getContext("2d");
    var datasets = opts.datasets || [{ color: "#ff4500", fill: true }];
    var n = datasets.length;
    var fixedMin = opts.yMin || 0;
    var fixedMax = opts.yMax || 0; // 0 → 自动量程

    // 数据缓冲：points[k][d] = 第 k 个采样的第 d 条曲线值
    var points = [];
    for (var i = 0; i < MAX_POINTS; i++) {
      var row = new Array(n);
      for (var j = 0; j < n; j++) row[j] = fixedMin;
      points.push(row);
    }

    var theme = {
      grid: "rgba(43,58,66,0.08)",
      text: "rgba(43,58,66,0.55)"
    };

    var cssW = -1;
    var cssH = -1;
    var dpr = 1;

    function fit() {
      var w = canvas.clientWidth || 0;
      var h = canvas.clientHeight || 0;
      if (w === cssW && h === cssH) return false;
      cssW = w;
      cssH = h;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      return true;
    }

    function fmtY(v) {
      if (v >= 1024 * 1024) return (v / 1024 / 1024).toFixed(1) + "G";
      if (v >= 1024) return (v / 1024).toFixed(1) + "M";
      if (v >= 10) return v.toFixed(0);
      return v.toFixed(1);
    }

    function render() {
      fit();
      var W = cssW;
      var H = cssH;
      if (!W || !H) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      // 量程：固定或自适应（取历史峰值 + 15% 顶部留白）
      var vmin = fixedMin;
      var vmax = fixedMax;
      if (!fixedMax) {
        vmax = 0;
        for (var a = 0; a < MAX_POINTS; a++) {
          for (var b = 0; b < n; b++) {
            if (points[a][b] > vmax) vmax = points[a][b];
          }
        }
        if (vmax <= 0) vmax = 1;
        vmax = vmax * 1.15;
      }
      var span = vmax - vmin || 1;

      var padT = 5;
      var padB = 14;
      var padL = 30;
      var padR = 4;
      var plotW = W - padL - padR;
      var plotH = H - padT - padB;

      // 网格（3 条横线）+ y 轴刻度
      ctx.lineWidth = 1;
      ctx.font = "9px " + '"Share Tech Mono", monospace';
      ctx.textBaseline = "middle";
      for (var g = 0; g <= 2; g++) {
        var gy = padT + (plotH * g) / 2;
        var gv = vmax - (span * g) / 2;
        ctx.strokeStyle = theme.grid;
        ctx.beginPath();
        ctx.moveTo(padL, gy + 0.5);
        ctx.lineTo(W - padR, gy + 0.5);
        ctx.stroke();
        ctx.fillStyle = theme.text;
        ctx.textAlign = "right";
        ctx.fillText(fmtY(gv), padL - 4, gy);
      }

      var stepX = plotW / (MAX_POINTS - 1);

      function yOf(v) {
        return padT + plotH * (1 - (v - vmin) / span);
      }

      for (var d = 0; d < n; d++) {
        var ds = datasets[d];

        // 中点二次贝塞尔平滑路径
        var xs = [];
        var ys = [];
        for (var k = 0; k < MAX_POINTS; k++) {
          xs.push(padL + stepX * k);
          ys.push(yOf(points[k][d]));
        }

        var path = function () {
          ctx.beginPath();
          ctx.moveTo(xs[0], ys[0]);
          for (var m = 1; m < MAX_POINTS - 1; m++) {
            var xc = (xs[m] + xs[m + 1]) / 2;
            var yc = (ys[m] + ys[m + 1]) / 2;
            ctx.quadraticCurveTo(xs[m], ys[m], xc, yc);
          }
          ctx.lineTo(xs[MAX_POINTS - 1], ys[MAX_POINTS - 1]);
        };

        // 填充（曲线下方到底边）
        if (ds.fill) {
          path();
          ctx.lineTo(xs[MAX_POINTS - 1], padT + plotH);
          ctx.lineTo(xs[0], padT + plotH);
          ctx.closePath();
          ctx.globalAlpha = 0.08;
          ctx.fillStyle = ds.color;
          ctx.fill();
          ctx.globalAlpha = 1;
        }

        // 描线
        path();
        ctx.strokeStyle = ds.color;
        ctx.lineWidth = 1.6;
        ctx.stroke();
      }
    }

    function onResize() {
      render();
    }
    window.addEventListener("resize", onResize, { passive: true });

    render();

    return {
      push: function (values) {
        points.push(values);
        if (points.length > MAX_POINTS) points.shift();
        render();
      },
      setTheme: function (t) {
        if (t) theme = t;
        render();
      },
      render: render,
      destroy: function () {
        window.removeEventListener("resize", onResize);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };
  }

  window.CHRONOS_CHART = { create: create };
})();

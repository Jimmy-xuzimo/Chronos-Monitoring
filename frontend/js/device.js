/* ============================================================
   CHRONOS — device.js
   通过浏览器标识（User-Agent / User-Agent Client Hints）判定设备类型，
   结合屏幕朝向，将结果写入 <html> 供 CSS 布局使用。
   ============================================================ */

(function () {
  "use strict";

  var CFG = window.CHRONOS_CONFIG || {};

  function hasTouch() {
    return (
      (navigator.maxTouchPoints || 0) > 0 ||
      "ontouchstart" in window ||
      (navigator.msMaxTouchPoints || 0) > 0
    );
  }

  function detectDevice() {
    if (CFG.DEVICE_OVERRIDE) {
      return CFG.DEVICE_OVERRIDE;
    }
    var ua = navigator.userAgent || "";
    var uaData = navigator.userAgentData;
    var touch = hasTouch();

    // iPad：iOS 13+ 的 Safari 会伪装成 Macintosh，需借助触点数判断
    var isIPad =
      /iPad/i.test(ua) ||
      (navigator.platform === "MacIntel" && touch && (navigator.maxTouchPoints || 0) > 1);

    // 平板：iPad / Android 无 Mobile 标识 / 明确的平板关键字
    var isTablet =
      isIPad ||
      /Tablet|PlayBook|Silk|Kindle/i.test(ua) ||
      (/Android/i.test(ua) && !/Mobile/i.test(ua));

    // 手机
    var isMobile =
      !isTablet &&
      (/iPhone|iPod|Android|Windows Phone|BlackBerry|webOS|Opera Mini|IEMobile|Mobile/i.test(ua) ||
        (uaData && uaData.mobile === true));

    if (isTablet) return "tablet";
    if (isMobile) return "mobile";
    return "desktop";
  }

  function detectOrient() {
    if (window.matchMedia) {
      if (window.matchMedia("(orientation: portrait)").matches) return "portrait";
      if (window.matchMedia("(orientation: landscape)").matches) return "landscape";
    }
    return window.innerHeight >= window.innerWidth ? "portrait" : "landscape";
  }

  function apply() {
    var html = document.documentElement;
    var touch = hasTouch();
    var device = detectDevice();
    var orient = detectOrient();

    html.setAttribute("data-device", device);
    html.setAttribute("data-orient", orient);
    html.setAttribute("data-touch", touch ? "true" : "false");

    window.CHRONOS_DEVICE = { device: device, orient: orient, touch: touch };
    document.dispatchEvent(
      new CustomEvent("chronos:device", { detail: window.CHRONOS_DEVICE })
    );
  }

  // 尽早执行，避免布局闪动
  apply();

  // 视口 / 朝向变化时重新判定（防抖）
  var timer = null;
  function onResize() {
    clearTimeout(timer);
    timer = setTimeout(apply, 120);
  }

  window.addEventListener("resize", onResize, { passive: true });
  window.addEventListener("orientationchange", onResize, { passive: true });
  if (window.screen && screen.orientation && screen.orientation.addEventListener) {
    screen.orientation.addEventListener("change", onResize);
  }

  // 暴露给其它模块 / 调试用
  window.CHRONOS_DEVICE_APPLY = apply;
})();
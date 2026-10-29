import { writeFileSync } from "node:fs";
for (const [file, target] of [
  ["login.html", "/"],
  ["settings.html", "/#settings"],
]) {
  writeFileSync(
    "dist/" + file,
    `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=${target}"><title>我的工作台</title><a href="${target}">打开工作台</a></html>`,
  );
}

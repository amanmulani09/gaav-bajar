const { copyFileSync, mkdirSync } = require("node:fs");

mkdirSync("public", { recursive: true });
for (const name of ["privacy", "terms", "delete-account"]) {
  copyFileSync(`site/${name}.html`, `public/${name}.html`);
}

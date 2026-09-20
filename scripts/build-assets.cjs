const sharp = require("sharp");
(async () => {
  for (const [name, size] of [
    ["icon", 1024],
    ["favicon", 64],
  ]) {
    await sharp("assets/icon.svg")
      .resize(size, size)
      .png()
      .toFile(`assets/${name}.png`);
  }
})();

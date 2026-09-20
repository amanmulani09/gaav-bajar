const sharp = require("sharp");
(async () => {
  for (const [name, size] of [
    ["icon", 1024],
    ["favicon", 256],
    ["google-brand", 120],
  ]) {
    await sharp("assets/icon.svg")
      .resize(size, size)
      .png()
      .toFile(`assets/${name}.png`);
  }
  const socialIcon = await sharp("assets/icon.svg").resize(116, 116).png().toBuffer();
  await sharp("assets/social-preview.svg")
    .composite([{ input: socialIcon, left: 542, top: 67 }])
    .png()
    .toFile("public/social-preview-v1.png");
})();

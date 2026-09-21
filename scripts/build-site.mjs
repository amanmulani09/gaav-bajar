import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
const email = process.env.SUPPORT_EMAIL;
const operator = process.env.APP_OPERATOR;
if (
  !email ||
  !/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(email) ||
  !operator?.trim()
) {
  throw new Error(
    "Set SUPPORT_EMAIL and APP_OPERATOR before generating publishable policy pages.",
  );
}
const escape = (value) =>
  value.replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ],
  );
const data = JSON.parse(readFileSync("src/data/legal.json", "utf8"));
const style =
  "body{max-width:760px;margin:auto;padding:32px 22px;font:17px/1.8 system-ui,sans-serif;background:#f7f6ee;color:#173b2b}h1{font-size:32px}h2{font-size:23px;margin-top:32px}a{color:#214f37}nav{display:flex;gap:18px;flex-wrap:wrap;border-bottom:1px solid #dce2d5;padding-bottom:16px}.contact{background:#ebf1e6;padding:20px;border-radius:16px}";
const contact = `<p class="contact">${escape(operator)} · <a href="mailto:${escape(email)}">${escape(email)}</a></p>`;
function page(title, content) {
  return `<!doctype html><html lang="mr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} | Gaav Bajar</title><style>${style}</style><body><nav><a href="index.html">Gaav Bajar</a><a href="privacy.html">Privacy</a><a href="terms.html">Terms</a><a href="delete-account.html">Delete account</a></nav><main><h1>${title}</h1>${content}</main><footer>${contact}</footer></body></html>`;
}
mkdirSync("site", { recursive: true });
for (const [kind, title] of [
  ["privacy", "गोपनीयता धोरण / गोपनीयता नीति / Privacy policy"],
  ["terms", "वापराच्या अटी / उपयोग की शर्तें / Terms of use"],
]) {
  const sections = ["mr", "hi", "en"]
    .map(
      (lang) =>
        `<section lang="${lang}"><h2>${lang === "mr" ? "मराठी" : lang === "hi" ? "हिन्दी" : "English"}</h2>${data[lang][kind].map(([h, b]) => `<h3>${escape(h)}</h3><p>${escape(b)}</p>`).join("")}</section>`,
    )
    .join("<hr>");
  writeFileSync(`site/${kind}.html`, page(title, sections));
}
const subject = encodeURIComponent("Gaav Bajar account deletion request");
writeFileSync(
  "site/delete-account.html",
  page(
    "खाते हटवा / खाता हटाएँ / Delete account",
    `
<section lang="mr"><p>ॲप नसले तरी Google लॉगिनसाठी वापरलेल्या ईमेलवरून खाते हटवण्याची विनंती पाठवा. ईमेलचा विषय: Gaav Bajar account deletion request. Aadhaar, पासवर्ड किंवा OTP पाठवू नका.</p><p>ओळख पुष्टी झाल्यावर ७ दिवसांत खाते, जाहिराती, बोली, फोटो, संपर्क आणि संबंधित तक्रार/ब्लॉक नोंदी कार्यरत प्रणालीतून हटवू. सेवा पुरवठादाराच्या बॅकअप प्रती त्यांच्या कालावधीनुसार संपतात. पुष्टी मिळाल्याशिवाय विनंती पूर्ण झाली असे समजू नका.</p></section>
<section lang="hi"><p>ऐप के बिना भी Google लॉगिन वाले ईमेल से खाता हटाने का अनुरोध भेजें। विषय: Gaav Bajar account deletion request. Aadhaar, पासवर्ड या OTP न भेजें।</p><p>पहचान की पुष्टि के बाद ७ दिनों में चालू प्रणाली से खाता, विज्ञापन, बोलियाँ, फोटो, संपर्क और संबंधित शिकायत/ब्लॉक रिकॉर्ड हटाएँगे। सेवा प्रदाता के बैकअप उनकी अवधि के अनुसार समाप्त होते हैं। पुष्टि मिलने तक अनुरोध पूरा न मानें।</p></section>
<section lang="en"><p>Without the app, send an account deletion request from the email used for Google sign-in. Subject: Gaav Bajar account deletion request. Do not send Aadhaar, passwords, or OTPs.</p><p>After identity confirmation, we will delete the account, listings, offers, photos, contacts, and related report/block records from active systems within seven days. Provider backups expire under their retention schedules. The request is not complete until you receive confirmation.</p></section>
<p><a href="mailto:${escape(email)}?subject=${subject}">ईमेलद्वारे विनंती करा / ईमेल से अनुरोध करें / Request by email</a></p>
<p>Email: ${escape(email)}</p>`,
  ),
);
writeFileSync(
  "site/index.html",
  page(
    "गाव बाजार / गाँव बाजार / Gaav Bajar",
    '<p>महाराष्ट्रातील स्थानिक खरेदीदार आणि विक्रेत्यांना जोडणारा बाजार.</p><p lang="hi">महाराष्ट्र के स्थानीय खरीदारों और विक्रेताओं को जोड़ने वाला बाजार।</p><p lang="en">A local marketplace connecting buyers and sellers across Maharashtra.</p><p>Google email verified. Identity and transactions are not guaranteed.</p>',
  ),
);
console.log(
  "Generated four policy/support pages in site/. Review owner details before hosting.",
);

const fs = require("node:fs");

const SOURCE_FILE = "./iem-list.md";
const OUT_MD = "./iem-yangkeduo-prices.md";
const OUT_JSON = "./iem-yangkeduo-prices.json";

const rawList = fs.readFileSync(SOURCE_FILE, "utf8");
const lines = rawList
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean);

const products = [];
let category = "IEM";
const seen = new Set();
for (const line of lines) {
  if (/^dac:?$/i.test(line)) {
    category = "DAC";
    continue;
  }
  const key = line.toLowerCase().replace(/\s+/g, " ");
  if (seen.has(key)) continue;
  seen.add(key);
  products.push({ query: line, category });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cleanText(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanUrl(url) {
  try {
    const u = new URL(url);
    const goodsId = u.searchParams.get("goods_id");
    if (goodsId) return `${u.origin}${u.pathname}?goods_id=${goodsId}`;
    return `${u.origin}${u.pathname}${u.search}`;
  } catch {
    return url;
  }
}

function parsePriceFromText(text) {
  const s = String(text || "").replace(/\s+/g, "");
  const preferred = s.match(/券后¥([0-9]+(?:\.[0-9]+)?)/);
  if (preferred) return preferred[1];
  const any = s.match(/¥([0-9]+(?:\.[0-9]+)?)/);
  return any ? any[1] : "";
}

async function getSearchCards() {
  return await state.page.evaluate(() => {
    function priceFromText(text) {
      const s = String(text || "").replace(/\s+/g, "");
      const m = s.match(/(?:券后|限1件)?¥([0-9]+(?:\.[0-9]+)?)/);
      return m ? m[1] : "";
    }
    function clean(text) {
      return String(text || "")
        .replace(/\s+/g, " ")
        .trim();
    }
    const els = Array.from(document.querySelectorAll("[data-uniqid]"));
    return els
      .map((el) => {
        const text = clean(el.innerText || el.textContent || "");
        const lines = (el.innerText || el.textContent || "")
          .split(/\n+/)
          .map(clean)
          .filter(Boolean);
        const title =
          lines.find(
            (line) =>
              line.length >= 8 &&
              !/[¥￥]/.test(line) &&
              !/^(商品|综合|销量|价格|品牌|筛选|是)$/.test(line),
          ) || "";
        return {
          uniqid: el.getAttribute("data-uniqid"),
          text,
          title,
          price: priceFromText(text),
        };
      })
      .filter((x) => x.uniqid && x.price && x.title && x.text.length < 700)
      .slice(0, 12);
  });
}

async function navigateSearch(query) {
  const url = `https://mobile.yangkeduo.com/search_result.html?search_key=${encodeURIComponent(query)}`;
  await state.page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
  await waitForPageLoad({ page: state.page, timeout: 8000 }).catch(() => null);
  for (let i = 0; i < 12; i++) {
    const cards = await getSearchCards();
    if (cards.length) return cards;
    await sleep(700);
  }
  return [];
}

function auditTerms(query) {
  const q = query.toLowerCase();
  const terms = q
    .replace(/[^a-z0-9]+/g, " ")
    .split(/\s+/)
    .filter((x) => x.length > 1);
  const aliasesByNeedle = [
    [/tangzu|waner|wanger/, ["tangzu", "唐族", "上官婉儿"]],
    [/red\s*lion/, ["red lion", "赤狮", "低音版"]],
    [/truthear/, ["truthear", "初耳"]],
    [/moondrop/, ["moondrop", "水月雨"]],
    [/chu\s*2/, ["chu", "竹2", "竹二", "chu2"]],
    [/gk|gunten|kunten/, ["gk", "kunten", "gunten", "昆腾"]],
    [/duonic/, ["duonic"]],
    [/tanchjim/, ["tanchjim", "天使吉米"]],
    [/bunny/, ["bunny"]],
    [/7hz/, ["7hz", "七赫兹"]],
    [/zero\s*2/, ["zero 2", "zero2", "zero ii", "零点", "二代"]],
    [/edx/, ["edx"]],
    [/pro\s*x/, ["pro x", "prox"]],
    [/kiwi/, ["kiwi", "kiwi ears"]],
    [/cadenza/, ["cadenza"]],
    [/edc/, ["edc"]],
    [/simgot/, ["simgot", "兴戈"]],
    [/ew100p/, ["ew100p"]],
    [/space\s*travel/, ["space travel", "太空漫游"]],
    [/kbear/, ["kbear"]],
    [/rosefinch/, ["rosefinch", "玫瑰雀"]],
    [/dunu/, ["dunu", "达音科"]],
    [/titan\s*x/, ["titan x", "titans"]],
    [/kefine/, ["kefine"]],
    [/klean/, ["klean"]],
    [/j?cally/, ["jcally", "cally"]],
    [/jm12/, ["jm12"]],
    [/jm6\s*pro\s*ii/, ["jm6 pro ii", "jm6proii", "jm6pro2", "jm6 pro2", "jm6 pro二代"]],
    [/jm6\s*pro(?!\s*ii)/, ["jm6 pro", "jm6pro"]],
    [/keyx/, ["keyx"]],
  ];
  const aliases = [];
  for (const [needle, values] of aliasesByNeedle) if (needle.test(q)) aliases.push(...values);
  return [...new Set([...terms, ...aliases].map((x) => x.toLowerCase()))];
}

function requiredAuditTerms(query) {
  const q = query.toLowerCase();
  const required = [];
  if (/jm12/.test(q)) required.push(["jm12"]);
  if (/jm6\s*pro\s*ii/.test(q)) required.push(["jm6"], ["pro"], ["ii", "pro2", "jm6pro2"]);
  else if (/jm6\s*pro/.test(q)) required.push(["jm6", "pro"]);
  if (/keyx/.test(q)) required.push(["keyx"]);
  if (/cadenza/.test(q)) required.push(["cadenza"]);
  if (/rosefinch/.test(q)) required.push(["rosefinch"]);
  if (/klean/.test(q)) required.push(["klean"]);
  if (/ew100p/.test(q)) required.push(["ew100p"]);
  if (/duonic/.test(q)) required.push(["duonic"]);
  return required;
}

function scoreText(query, text) {
  const t = String(text || "")
    .toLowerCase()
    .replace(/\s+/g, " ");
  const terms = auditTerms(query);
  const hits = terms.filter((part) => t.includes(part));
  const requiredMissing = requiredAuditTerms(query).filter(
    (group) => !group.some((part) => t.includes(part)),
  );
  return { score: hits.length, hits, terms, requiredMissing };
}

function searchVariants(query) {
  const q = query.toLowerCase();
  const variants = [query];
  if (/jcally.*jm12|jm12/.test(q)) variants.push("JCALLY JM12 解码耳放", "杰仕声 JM12");
  if (/jm6\s*pro\s*ii/.test(q))
    variants.push("JCALLY JM6 Pro II", "JCALLY JM6PRO2 解码耳放", "杰仕声 JM6PRO2");
  else if (/jm6\s*pro/.test(q)) variants.push("JCALLY JM6 Pro 解码耳放", "杰仕声 JM6 Pro");
  if (/keyx/.test(q)) variants.push("TRUTHEAR KEYX", "初耳 KEYX");
  if (/rosefinch/.test(q)) variants.push("KBEAR Rosefinch 玫瑰雀");
  if (/cadenza/.test(q)) variants.push("Kiwi Ears Cadenza 耳机", "kiwiears cadenza");
  return [...new Set(variants)];
}

function minimumScore(query) {
  const q = query.toLowerCase();
  if (/^truthear$/.test(q)) return 1;
  if (/dac|jm12|jm6|keyx|portable/.test(q)) return 2;
  return 2;
}

async function openBestResult(query, cards) {
  const ranked = [...cards]
    .map((card) => ({ ...card, audit: scoreText(query, `${card.title} ${card.text || ""}`) }))
    .sort(
      (a, b) =>
        a.audit.requiredMissing.length - b.audit.requiredMissing.length ||
        b.audit.score - a.audit.score,
    );
  const card = ranked[0];
  if (!card) throw new Error("No search result card");
  const hasRequiredModel = requiredAuditTerms(query).length > 0;
  if (
    card.audit.requiredMissing.length ||
    (!hasRequiredModel && card.audit.score < minimumScore(query))
  ) {
    throw new Error(
      `No verified product match in search results. Best candidate: "${card.title}" (hits: ${card.audit.hits.join(", ") || "none"}; missing required: ${card.audit.requiredMissing.map((x) => x.join("/")).join(", ") || "none"})`,
    );
  }
  const before = state.page.url();
  const loc = state.page.locator(`[data-uniqid="${card.uniqid}"]`).first();
  await loc.scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => null);
  await Promise.all([
    state.page.waitForURL(/goods\.html.*goods_id=/, { timeout: 25000 }).catch(() => null),
    loc.click({ timeout: 15000 }),
  ]);
  // Yangkeduo sometimes dispatches card navigation late; wait briefly before deciding it failed.
  if (!/goods\.html.*goods_id=/.test(state.page.url())) {
    await state.page.waitForTimeout(3000);
  }
  await state.page.waitForLoadState("domcontentloaded", { timeout: 15000 }).catch(() => null);
  await waitForPageLoad({ page: state.page, timeout: 8000 }).catch(() => null);
  if (!/goods\.html.*goods_id=/.test(state.page.url())) {
    throw new Error(
      `Click did not open a goods page (before: ${before}, after: ${state.page.url()})`,
    );
  }
  return card;
}

async function extractTitle(query) {
  const title = await state.page.evaluate((q) => {
    const bad =
      /商品详情|评价|退货|收藏|客服|单独购买|发起拼单|扫码|顶部|平台券|这些人已拼|预计|已选|颜色|套餐/;
    const qParts = String(q).toLowerCase().split(/\s+/).filter(Boolean);
    const candidates = Array.from(document.querySelectorAll("div,span"))
      .map((el) =>
        String(el.innerText || el.textContent || "")
          .replace(/\s+/g, " ")
          .trim(),
      )
      .filter(
        (txt) => txt.length >= 8 && txt.length <= 160 && !bad.test(txt) && !/[¥￥]/.test(txt),
      );
    const scored = candidates.map((txt) => {
      const lower = txt.toLowerCase();
      const score = qParts.reduce((n, p) => n + (lower.includes(p) ? 1 : 0), 0);
      return { txt, score };
    });
    scored.sort((a, b) => b.score - a.score || b.txt.length - a.txt.length);
    return scored[0]?.txt || "";
  }, query);
  return cleanText(title);
}

async function openSkuDialog() {
  const before = await state.page
    .locator('[role="dialog"]')
    .count()
    .catch(() => 0);
  if (before > 0) return true;
  const buttons = [
    "role=button[name=/发起拼单/]",
    "role=button[name=/单独购买/]",
    "role=button[name=/立即购买/]",
  ];
  for (const sel of buttons) {
    const loc = state.page.locator(sel).last();
    if ((await loc.count().catch(() => 0)) > 0) {
      try {
        await loc.click({ timeout: 8000 });
        await state.page.locator('[role="dialog"]').waitFor({ timeout: 8000 });
        return true;
      } catch {}
    }
  }
  return (
    (await state.page
      .locator('[role="dialog"]')
      .count()
      .catch(() => 0)) > 0
  );
}

async function getDialogInfo() {
  return await state.page.evaluate(() => {
    function clean(text) {
      return String(text || "")
        .replace(/\s+/g, " ")
        .trim();
    }
    function parsePriceFromDom(dialog, text) {
      const priceLabel = Array.from(dialog.querySelectorAll("[aria-label]"))
        .map((el) => el.getAttribute("aria-label") || "")
        .find((label) => /^券后¥[0-9]/.test(label));
      if (priceLabel) return (priceLabel.match(/券后¥([0-9]+(?:\.[0-9]+)?)/) || [])[1] || "";
      const line =
        String(text || "")
          .split(/\n+/)
          .find((x) => /券后\s*¥/.test(x)) || "";
      return (line.replace(/\s+/g, "").match(/券后¥([0-9]+(?:\.[0-9]+)?)/) || [])[1] || "";
    }
    function leafTexts(dialog) {
      return Array.from(dialog.querySelectorAll("*"))
        .map((el) => clean(el.innerText || el.textContent || ""))
        .filter(Boolean)
        .sort((a, b) => a.length - b.length);
    }
    function parsePromoPriceFromDom(dialog) {
      const label = leafTexts(dialog).find((x) => /^大促价\s*¥[0-9]/.test(x)) || "";
      return (label.replace(/\s+/g, "").match(/^大促价¥([0-9]+(?:\.[0-9]+)?)/) || [])[1] || "";
    }
    function parseSelectedFromDom(dialog, rawText) {
      const label = leafTexts(dialog).find((x) => /^已选[:：]/.test(x)) || "";
      if (label) return clean((label.match(/^已选[:：]\s*(.+)$/) || [])[1] || "");
      const selectedLine =
        String(rawText || "")
          .split(/\n+/)
          .find((line) => /已选[:：]/.test(line)) || "";
      return clean((selectedLine.match(/已选[:：]\s*(.+)$/) || [])[1] || "");
    }
    const dialog = document.querySelector('[role="dialog"]');
    if (!dialog) return null;
    const rawText = dialog.innerText || dialog.textContent || "";
    const text = clean(rawText);
    const sections = Array.from(dialog.querySelectorAll(".bIhLWVqm"))
      .map((sec) => ({
        label: clean(sec.querySelector(".sku-specs-key")?.textContent || ""),
        options: Array.from(sec.querySelectorAll('[role="button"][aria-label]'))
          .map((btn) => ({
            name: clean(btn.getAttribute("aria-label")),
            text: clean(btn.innerText || btn.textContent || ""),
            className: btn.className || "",
            disabled:
              /disable|disabled|sold|stock/i.test(btn.className || "") ||
              btn.getAttribute("aria-disabled") === "true",
          }))
          .filter((opt) => opt.name && !/关闭弹窗|减少数量|增加数量|确定/.test(opt.name)),
      }))
      .filter((section) => section.label || section.options.length);
    return {
      text,
      price: parsePriceFromDom(dialog, rawText),
      promo_price: parsePromoPriceFromDom(dialog),
      selected: parseSelectedFromDom(dialog, rawText),
      sections,
    };
  });
}

async function clickDialogOption(name) {
  try {
    const escaped = String(name).replace(/"/g, '\\"');
    let loc = state.page
      .locator(`[role="dialog"] [role="button"][aria-label="${escaped}"]`)
      .first();
    if ((await loc.count().catch(() => 0)) === 0) {
      loc = state.page
        .locator('[role="dialog"] [role="button"][aria-label]')
        .filter({ hasText: name })
        .first();
    }
    await loc.scrollIntoViewIfNeeded({ timeout: 2500 }).catch(() => null);
    await loc.waitFor({ state: "visible", timeout: 2500 }).catch(() => null);
    const box = await loc.boundingBox().catch(() => null);
    if (!box) {
      const domClicked = await state.page
        .evaluate((targetName) => {
          const norm = (x) =>
            String(x || "")
              .replace(/\s+/g, " ")
              .trim();
          const dialog = document.querySelector('[role="dialog"]');
          const el =
            dialog &&
            Array.from(dialog.querySelectorAll('[role="button"][aria-label]')).find(
              (node) => norm(node.getAttribute("aria-label")) === norm(targetName),
            );
          if (!el) return false;
          el.click();
          return true;
        }, name)
        .catch(() => false);
      await sleep(700);
      if (domClicked) return true;
      state.clickErrors = state.clickErrors || [];
      state.clickErrors.push({
        name,
        error: "no bounding box",
        count: await loc.count().catch(() => -1),
      });
      return false;
    }
    // Some Yangkeduo SKU buttons fire the UI update but keep Playwright's locator.click waiting.
    // A real mouse click at the element center reliably triggers the same handler and returns.
    await state.page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await sleep(700);
    return true;
  } catch (error) {
    state.clickErrors = state.clickErrors || [];
    state.clickErrors.push({ name, error: String(error && error.message ? error.message : error) });
    return false;
  }
}

function cartesian(groups, max = 80) {
  let combos = [[]];
  for (const group of groups) {
    const opts = group.options.filter((opt) => opt.name && !opt.disabled);
    if (!opts.length) continue;
    const next = [];
    for (const combo of combos) {
      for (const opt of opts) {
        next.push([...combo, { label: group.label, name: opt.name }]);
        if (next.length >= max) break;
      }
      if (next.length >= max) break;
    }
    combos = next;
    if (combos.length >= max) break;
  }
  return combos;
}

async function extractVariations() {
  const opened = await openSkuDialog();
  if (!opened) return { variations: [], note: "Could not open SKU dialog" };

  let info = await getDialogInfo();
  if (!info) return { variations: [], note: "SKU dialog not found after opening" };

  const groups = info.sections || [];
  const combos = cartesian(groups, 80);
  const seen = new Set();
  const variations = [];

  async function record(combo = []) {
    const current = await getDialogInfo();
    if (!current) return;
    const selected = current.selected || combo.map((x) => x.name).join(" / ") || "default";
    const key = `${selected}|${current.price}`;
    if (seen.has(key)) return;
    seen.add(key);
    variations.push({
      selected,
      price_yuan: current.price,
      promo_price_before_coupon_yuan: current.promo_price,
      chosen_options: combo,
    });
  }

  if (combos.length === 0) {
    await record([]);
  } else {
    for (const combo of combos) {
      const clicked = [];
      for (const opt of combo) {
        const ok = await clickDialogOption(opt.name);
        clicked.push({ ...opt, clicked: ok });
      }
      await record(clicked);
    }
  }

  return { variations, groups };
}

async function scrapeOne(product, index, total) {
  // Use a fresh page per product so delayed Yangkeduo card navigations cannot race into the next product.
  state.page = await context.newPage();
  await state.page.setViewportSize({ width: 390, height: 844 }).catch(() => null);
  console.log(`\n[${index + 1}/${total}] ${product.query}`);
  const result = {
    ...product,
    status: "ok",
    search_url: `https://mobile.yangkeduo.com/search_result.html?search_key=${encodeURIComponent(product.query)}`,
    search_results: [],
    matched_search_result: null,
    product_title: "",
    product_url: "",
    base_price_yuan: "",
    variations: [],
    notes: [],
  };
  try {
    let cards = [];
    let chosenCard = null;
    let lastError = null;
    for (const searchQuery of searchVariants(product.query)) {
      result.search_url = `https://mobile.yangkeduo.com/search_result.html?search_key=${encodeURIComponent(searchQuery)}`;
      cards = await navigateSearch(searchQuery);
      result.search_results = cards
        .slice(0, 5)
        .map(({ title, price }) => ({ title, price_yuan: price }));
      if (!cards.length) {
        lastError = new Error(`No search cards found for ${searchQuery}`);
        continue;
      }
      try {
        chosenCard = await openBestResult(product.query, cards);
        if (searchQuery !== product.query)
          result.notes.push(`Used alternate search query: ${searchQuery}`);
        break;
      } catch (error) {
        lastError = error;
      }
    }
    if (!chosenCard) throw lastError || new Error("No verified product match in search results");
    result.matched_search_result = {
      title: chosenCard.title,
      price_yuan: chosenCard.price,
      audit: chosenCard.audit,
    };
    result.product_url = cleanUrl(state.page.url());
    result.product_title = await extractTitle(product.query);
    result.product_audit = scoreText(product.query, `${result.product_title} ${chosenCard.title}`);
    const hasRequiredModel = requiredAuditTerms(product.query).length > 0;
    if (
      result.product_audit.requiredMissing.length ||
      (!hasRequiredModel && result.product_audit.score < minimumScore(product.query))
    ) {
      throw new Error(
        `Opened product title failed verification: "${result.product_title}" (hits: ${result.product_audit.hits.join(", ") || "none"}; missing required: ${result.product_audit.requiredMissing.map((x) => x.join("/")).join(", ") || "none"})`,
      );
    }
    result.base_price_yuan =
      chosenCard.price ||
      parsePriceFromText(
        await state.page
          .locator("body")
          .innerText({ timeout: 5000 })
          .catch(() => ""),
      );
    state.clickErrors = [];
    const sku = await extractVariations();
    result.variations = sku.variations || [];
    if (state.clickErrors?.length)
      result.notes.push(`SKU click issues: ${JSON.stringify(state.clickErrors.slice(0, 5))}`);
    if (sku.note) result.notes.push(sku.note);
    if (!result.variations.length && result.base_price_yuan) {
      result.variations.push({
        selected: "default / listed price",
        price_yuan: result.base_price_yuan,
        chosen_options: [],
      });
    }
    console.log(
      `  -> ${result.product_title || result.matched_search_result.title} | ${result.product_url}`,
    );
    console.log(`  -> ${result.variations.length} variation(s)`);
  } catch (error) {
    result.status = "error";
    result.error = String(error && error.message ? error.message : error);
    console.log(`  !! ${result.error}`);
  } finally {
    if (fileConfig.verboseLogs) {
      try {
        console.log("  logs:", await getLatestLogs({ page: state.page, sinceLastCall: true }));
      } catch {}
    } else {
      try {
        await getLatestLogs({ page: state.page, sinceLastCall: true });
      } catch {}
    }
    try {
      await state.page.close();
    } catch {}
  }
  return result;
}

function formatMarkdown(results) {
  const now = new Date().toISOString();
  const lines = [];
  lines.push("# Yangkeduo / Pinduoduo IEM and DAC prices");
  lines.push("");
  lines.push(`Source list: \`${SOURCE_FILE}\``);
  lines.push(`Captured: ${now}`);
  lines.push("");
  lines.push(
    "Notes: prices are in Chinese yuan (¥/CNY) as shown by the mobile Yangkeduo page. Products are audited against the source query; unrelated first search results are rejected instead of saved.",
  );
  lines.push("");
  for (const category of new Set(results.map((r) => r.category))) {
    lines.push(`## ${category}`);
    lines.push("");
    for (const r of results.filter((x) => x.category === category)) {
      lines.push(`### ${r.query}`);
      lines.push("");
      if (r.status !== "ok") {
        lines.push(`- Status: **${r.status}** — ${r.error || "unknown error"}`);
        lines.push(`- Search URL: ${r.search_url}`);
        lines.push("");
        continue;
      }
      lines.push(`- Product: ${r.product_title || r.matched_search_result?.title || ""}`);
      lines.push(`- URL: ${r.product_url}`);
      lines.push(
        `- Verification hits: ${(r.product_audit?.hits || r.matched_search_result?.audit?.hits || []).join(", ")}`,
      );
      lines.push(
        `- Search listing price: ¥${r.base_price_yuan || r.matched_search_result?.price_yuan || ""}`,
      );
      if (r.notes?.length) lines.push(`- Notes: ${r.notes.join("; ")}`);
      lines.push("");
      lines.push(
        "| Variation / selected options | Coupon price (¥ CNY) | Promo price before coupon (¥ CNY) |",
      );
      lines.push("| --- | ---: | ---: |");
      for (const v of r.variations || []) {
        const name = (
          v.selected ||
          v.chosen_options?.map((x) => x.name).join(" / ") ||
          "default"
        ).replace(/\|/g, "\\|");
        lines.push(
          `| ${name} | ${v.price_yuan || ""} | ${v.promo_price_before_coupon_yuan || ""} |`,
        );
      }
      lines.push("");
    }
  }
  return lines.join("\n");
}

let fileConfig = {};
try {
  fileConfig = JSON.parse(fs.readFileSync("./scrape-pdd-config.json", "utf8"));
} catch {}

const startIndex = Number(fileConfig.start ?? process.env.PRODUCT_START ?? 0);
const limit = fileConfig.limit
  ? Number(fileConfig.limit)
  : process.env.PRODUCT_LIMIT
    ? Number(process.env.PRODUCT_LIMIT)
    : products.length;
const append = fileConfig.append ?? process.env.PRODUCT_APPEND !== "0";
const selectedProducts = products.slice(startIndex, startIndex + limit);
console.log(
  `Batch config: start=${startIndex}, limit=${limit}, append=${append}, selected=${selectedProducts.length}`,
);

let results = [];
if (append) {
  try {
    results = JSON.parse(fs.readFileSync(OUT_JSON, "utf8")).results || [];
  } catch {}
}

function upsertResult(result) {
  const idx = results.findIndex((x) => x.query === result.query);
  if (idx >= 0) results[idx] = result;
  else results.push(result);
  const order = new Map(products.map((p, i) => [p.query, i]));
  results.sort((a, b) => (order.get(a.query) ?? 9999) - (order.get(b.query) ?? 9999));
}

for (let i = 0; i < selectedProducts.length; i++) {
  const res = await scrapeOne(selectedProducts[i], startIndex + i, products.length);
  upsertResult(res);
  fs.writeFileSync(
    OUT_JSON,
    JSON.stringify(
      { captured_at: new Date().toISOString(), source_file: SOURCE_FILE, results },
      null,
      2,
    ),
  );
  fs.writeFileSync(OUT_MD, formatMarkdown(results));
  await sleep(900);
}

fs.writeFileSync(
  OUT_JSON,
  JSON.stringify(
    { captured_at: new Date().toISOString(), source_file: SOURCE_FILE, results },
    null,
    2,
  ),
);
fs.writeFileSync(OUT_MD, formatMarkdown(results));
console.log(
  `\nSaved ${OUT_MD} and ${OUT_JSON} (${results.length}/${products.length} products in aggregate)`,
);

/**
 * Offline checks for RSS ingestion — `npm run check:rss`.
 *
 * Feeds differ wildly in what they provide: full article text, a teaser, or nothing but a
 * headline; images in `enclosure`, in `media:*`, inside the HTML, or absent; HTML entities
 * that survive CDATA; and occasionally XML that simply does not parse. Each case below is
 * taken from a feed this project actually pulls, so a regression here means real articles
 * silently lose their text or their picture.
 *
 * Parses XML directly instead of serving it over HTTP: the SSRF guard blocks localhost,
 * and weakening a security control to make a test pass is the wrong trade.
 */
import { parseFeedXml } from "@/lib/rss";

const feed = (items: string, extraNs = "") =>
  `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:media="http://search.yahoo.com/mrss/" xmlns:dc="http://purl.org/dc/elements/1.1/" ${extraNs}>
<channel><title>Test</title><link>https://example.org</link><description>d</description>
${items}
</channel></rss>`;

const checks: Array<[string, boolean]> = [];
const check = (name: string, ok: boolean) => checks.push([name, ok]);

const load = async (xml: string) => {
  try {
    return { items: await parseFeedXml(xml), error: undefined as string | undefined };
  } catch (error) {
    return { items: [], error: error instanceof Error ? error.message : String(error) };
  }
};

// 1) Gazeta.uz shape: HTML entities inside CDATA, image in a typeless enclosure.
{
  const r = await load(
    feed(`<item>
      <title>Iyul&nbsp;fotosuratlarda</title>
      <description><![CDATA[Anomal issiq va&nbsp;elektr uzilishlari, &laquo;Gazeta&raquo; oylik to&mdash;plami.]]></description>
      <link>https://example.org/a</link>
      <pubDate>Fri, 31 Jul 2026 19:10:00 GMT</pubDate>
      <enclosure url="https://example.org/img/photo_b.webp" length="174234"/>
      <guid>https://example.org/a</guid>
    </item>`),
  );
  const item = r.items[0];
  check("entities decoded in the title", item?.title === "Iyul fotosuratlarda");
  check("entities decoded in the description", (item?.description || "").includes("«Gazeta»"));
  check("no literal &nbsp; survives", !(item?.description || "").includes("&nbsp;"));
  check("em dash decoded", (item?.description || "").includes("to—plami"));
  check("typeless image enclosure accepted", item?.imageUrl === "https://example.org/img/photo_b.webp");
}

// 2) RIA shape: no description at all, image enclosure with an explicit type.
{
  const r = await load(
    feed(`<item>
      <title>Zakon vstupil v silu</title>
      <link>https://example.org/b</link>
      <guid>https://example.org/b</guid>
      <pubDate>Sat, 01 Aug 2026 00:14:46 +0300</pubDate>
      <enclosure url="https://cdn.example.org/pic.jpg" type="image/jpeg"/>
    </item>`),
  );
  const item = r.items[0];
  check("headline-only item still ingested", item?.title === "Zakon vstupil v silu");
  check("headline-only item has no description", item?.description === null);
  check("headline-only item has no full text", item?.fullContent === null);
  check("typed image enclosure accepted", item?.imageUrl === "https://cdn.example.org/pic.jpg");
}

// 3) Feeds that ship the whole article: content:encoded and yandex:full-text.
{
  const long = "Bu to'liq maqola matni. ".repeat(30);
  const r = await load(
    feed(
      `<item>
        <title>Full text item</title>
        <link>https://example.org/c</link>
        <description>Short teaser only.</description>
        <content:encoded><![CDATA[<p>${long}</p><p>Ikkinchi abzas.</p>]]></content:encoded>
      </item>
      <item>
        <title>Yandex full text</title>
        <link>https://example.org/d</link>
        <yandex:full-text>${long}</yandex:full-text>
      </item>`,
      'xmlns:yandex="http://news.yandex.ru"',
    ),
  );
  const [encoded, yandex] = r.items;
  check("content:encoded captured as full text", (encoded?.fullContent || "").length > 400);
  check("full text is plain text, not HTML", !(encoded?.fullContent || "").includes("<p>"));
  check("paragraph breaks preserved in full text", (encoded?.fullContent || "").includes("\n\n"));
  check("teaser kept separate from full text", encoded?.description === "Short teaser only.");
  check("yandex:full-text captured", (yandex?.fullContent || "").length > 400);
  check(
    "full text is stored in rawJson for the pipeline",
    (() => {
      try {
        return JSON.parse(encoded?.rawJson || "{}").fullContent?.length > 400;
      } catch {
        return false;
      }
    })(),
  );
}

// 4) Images: a podcast enclosure is not a picture; media:* comes in several shapes.
{
  const r = await load(
    feed(`<item>
      <title>Audio enclosure</title><link>https://example.org/e</link>
      <enclosure url="https://example.org/episode.mp3" type="audio/mpeg"/>
    </item>
    <item>
      <title>Media content</title><link>https://example.org/f</link>
      <media:content url="https://example.org/m.jpg" type="image/jpeg" medium="image"/>
    </item>
    <item>
      <title>Media thumbnail</title><link>https://example.org/g</link>
      <media:thumbnail url="https://example.org/t.png"/>
    </item>
    <item>
      <title>Image inside the body</title><link>https://example.org/h</link>
      <description><![CDATA[<p>Text</p><img src="https://example.org/inline.jpg" alt=""/>]]></description>
    </item>`),
  );
  const [audio, mediaContent, thumb, inline] = r.items;
  check("audio enclosure rejected as an image", audio?.imageUrl === null);
  check("media:content image accepted", mediaContent?.imageUrl === "https://example.org/m.jpg");
  check("media:thumbnail accepted", thumb?.imageUrl === "https://example.org/t.png");
  check("inline <img> used as a last resort", inline?.imageUrl === "https://example.org/inline.jpg");
  check("HTML stripped from the description", inline?.description === "Text");
}

// 5) Invalid XML: a bare ampersand aborts the parse and would lose every item.
{
  const r = await load(
    feed(`<item>
      <title>Q&A with the rector</title>
      <link>https://example.org/i</link>
      <description>Talks about R&D funding.</description>
    </item>
    <item><title>Second item</title><link>https://example.org/j</link></item>`),
  );
  check("malformed XML is repaired rather than dropped", r.items.length === 2);
  check("no error reported after repair", !r.error);
  check("repaired title is intact", r.items[0]?.title === "Q&A with the rector");
}

// 6) An item with no link or no title cannot be stored, and must not crash the feed.
{
  const r = await load(
    feed(`<item><description>orphan</description></item>
    <item><title>Valid</title><link>https://example.org/k</link></item>`),
  );
  check("items without a link are skipped", r.items.length === 1 && r.items[0]?.title === "Valid");
}

console.log("--- assertions ---");
for (const [name, ok] of checks) console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
console.log(`\n${checks.filter(([, ok]) => ok).length}/${checks.length} passed`);

process.exit(checks.every(([, ok]) => ok) ? 0 : 1);

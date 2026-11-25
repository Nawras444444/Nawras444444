#!/usr/bin/env python3
"""Add synced English + Arabic subtitles to data.js.

Usage: python3 build_subs.py [--lead 0.3]   (run after make_data.py)

audio/words.json holds word timestamps transcribed from the narration (faster-whisper).
The transcriber misspells names (Rigsthula, Yarls, Carl's), so the screen shows the
script's own words: each chunk below names a range of transcribed words for its timing
and the script text for its display. When the two word counts differ, display words are
spread evenly across the range's time span.

Times become clip-relative: the narration is delayed by --lead seconds in the mix, and
each clip starts where data.js durations put it.
"""
import argparse, json, re

# (panel, first transcribed word, last transcribed word, script text, Arabic translation)
CHUNKS = [
    ("vk_1", 0, 6, "Every Viking was born into a rank.", "وُلد كلُّ فايكنغ في مرتبةٍ اجتماعية."),
    ("vk_1", 7, 14, "Family, land and weapons decided where you stood.", "العائلة والأرض والسلاح حدّدت مكانتك."),
    ("vk_2", 15, 22, "In the Rígsþula, a god visits three households", "في قصيدة «ريغسثولا» يزور إلهٌ ثلاثة بيوت"),
    ("vk_2", 23, 26, "and names three classes:", "ويُسمّي ثلاث طبقات:"),
    ("vk_2", 27, 29, "thrall, freeman, noble.", "عبد، حُرّ، نبيل."),
    ("vk_3", 30, 34, "At the top, the jarls:", "في القمّة: اليارلات"),
    ("vk_3", 35, 39, "big estate holders who led war bands", "كبار ملّاك الأراضي الذين قادوا فرق المحاربين"),
    ("vk_3", 40, 42, "and collected tribute.", "وجمعوا الجزية."),
    ("vk_4", 43, 46, "Most people were karls:", "معظم الناس كانوا من «الكارل»:"),
    ("vk_4", 47, 53, "free farmers who owned land, carried arms,", "مزارعون أحرار يملكون الأرض ويحملون السلاح،"),
    ("vk_4", 54, 58, "and voted at the assembly.", "ويصوّتون في المجلس العام."),
    ("vk_5", 59, 63, "Your life had a price.", "كان لحياتك ثمن."),
    ("vk_5", 64, 70, "The wergild, the compensation for a killing,", "«الويرغيلد»، أي تعويض القتل،"),
    ("vk_5", 71, 73, "scaled with rank.", "كان يرتفع بارتفاع المرتبة."),
    ("vk_6", 74, 77, "At the bottom, thralls:", "في القاع: العبيد"),
    ("vk_6", 78, 82, "war captives and their children,", "أسرى الحروب وأبناؤهم،"),
    ("vk_6", 83, 87, "working farms, mills, and homes.", "يعملون في المزارع والطواحين والبيوت."),
    ("vk_7", 88, 92, "The ladder was not fixed.", "لم يكن السُّلّم ثابتاً."),
    ("vk_7", 93, 96, "Thralls could win freedom,", "كان بوسع العبيد نيلُ حريتهم،"),
    ("vk_7", 97, 102, "and wealth could lift a family.", "وكانت الثروة ترفع شأن العائلة."),
    ("vk_8", 103, 107, "Women held the household keys", "حملت النساء مفاتيح البيت"),
    ("vk_8", 108, 112, "and much of its wealth.", "والكثير من ثروته."),
    ("vk_8", 113, 117, "Many laws protected their property.", "وحمت قوانين كثيرة ممتلكاتهن."),
    ("vk_9", 118, 123, "Ranks were rigid, but never still.", "كانت المراتب صارمة، لكنها لم تكن جامدة."),
    ("vk_9", 124, 129, "Every class depended on the others,", "اعتمدت كل طبقة على الأخرى،"),
    ("vk_9", 130, 134, "and fought over its place.", "وتنازعت على مكانتها."),
]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--lead", type=float, default=0.3)
    a = ap.parse_args()
    src = open("data.js").read()
    P = json.loads(re.sub(r"^const PANELS\s*=\s*", "", src).rstrip().rstrip(";"))
    W = json.load(open("audio/words.json"))
    starts, t = {}, 0.0
    for p in P:
        starts[p["id"]] = t
        p["subs"] = []
        t += p["dur"]
    byid = {p["id"]: p for p in P}
    for pid, i0, i1, text, arabic in CHUNKS:
        off = a.lead - starts[pid]
        span = W[i0:i1 + 1]
        disp = text.split()
        if len(disp) == len(span):
            times = [w["s"] for w in span]
        else:
            s0, s1 = span[0]["s"], span[-1]["e"]
            times = [s0 + (s1 - s0) * k / len(disp) for k in range(len(disp))]
        byid[pid]["subs"].append({
            "t0": round(span[0]["s"] + off, 3), "t1": round(span[-1]["e"] + off, 3), "ar": arabic,
            "words": [{"w": w, "t": round(tt + off, 3)} for w, tt in zip(disp, times)],
        })
    for p in P:
        for c in p["subs"]:
            assert -0.05 <= c["t0"] and c["t1"] <= p["dur"], (p["id"], c["t0"], c["t1"], p["dur"])
    open("data.js", "w").write("const PANELS = " + json.dumps(P, ensure_ascii=False, indent=0) + ";\n")
    print("subtitles:", {p["id"]: len(p["subs"]) for p in P})


if __name__ == "__main__":
    main()

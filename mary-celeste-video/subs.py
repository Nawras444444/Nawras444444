"""French captions synced to the voiceover pauses -> assets/subs.js  [[start, end, text], ...]"""
import json
LEAD = 0.4
# speech segments (start, end) from silencedetect on src/voice.mp3
B = [0.1, 7.79, 8.60, 11.52, 12.44, 15.72, 16.46, 17.95, 18.50, 22.76, 23.47, 24.40, 25.16, 28.10,
     28.63, 31.16, 31.94, 33.88, 34.78, 39.14, 40.01, 43.73, 44.58, 45.59, 46.17, 47.63, 48.10, 49.37,
     50.42, 53.68, 54.42, 56.30, 56.99, 58.61, 59.20, 62.9]
SEG = ["Le 4 décembre 1872, un navire britannique repère un bateau qui dérive étrangement au milieu de l'océan Atlantique.",
       "C'était le Mary Celeste, un navire marchand américain.",
       "Quand les marins montent à bord pour vérifier, ils restent sous le choc.",
       "Le bateau est en parfait état.",
       "Ses voiles sont levées, et la cale est pleine de 1 700 barils d'alcool.",
       "Rien n'a été volé.",
       "Dans les cabines, toutes les affaires personnelles sont à leur place.",
       "Même l'argent et la pipe du capitaine sont encore là.",
       "Mais il n'y a absolument personne.",
       "Le capitaine, sa femme, leur petite fille et sept marins expérimentés…",
       "Dix personnes ont disparu sans laisser la moindre trace de lutte.",
       "Le seul indice bizarre :",
       "le canot de sauvetage a disparu,",
       "et neuf barils sont vides.",
       "Les enquêteurs pensent qu'une fuite de gaz a provoqué une panique soudaine.",
       "Mais la vraie question reste sans réponse :",
       "s'ils ont fui dans un petit bateau,",
       "pourquoi n'a-t-on jamais retrouvé leurs corps depuis plus de 150 ans ?"]
MAXC = 34  # max characters per caption chunk
out = []
for k, text in enumerate(SEG):
    s, e = B[2 * k] + LEAD, B[2 * k + 1] + LEAD
    words = text.replace("1 700", "1 700").split()
    chunks, cur = [], []
    for w in words:
        if cur and len(" ".join(cur + [w])) > MAXC:
            chunks.append(cur); cur = []
        cur.append(w)
    chunks.append(cur)
    if len(chunks) > 1 and len(" ".join(chunks[-1])) < 10:  # avoid orphan tail
        tail = chunks.pop(); chunks[-1] += tail
    total = sum(len(" ".join(c)) for c in chunks); t = s
    for c in chunks:
        d = (e - s) * len(" ".join(c)) / total
        out.append([round(t, 2), round(t + d, 2), " ".join(c)]); t += d
open("assets/subs.js", "w").write("window.SUBS=" + json.dumps(out, ensure_ascii=False) + ";")
print(len(out), "captions")

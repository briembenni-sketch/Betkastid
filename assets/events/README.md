# Viðburðir — myndbönd

Þessi mappa geymir myndbandið fyrir hlutann **„Viðburðir betkastins“** á
forsíðunni (`index.html`).

Núverandi skrár:
- `afmaeli-betkastid.mp4` — afmælismyndbandið (lóðrétt 9:16, H.264, vef-bjartsýnt).
- `afmaeli-betkastid.jpg` — plakat (fyrsti rammi sem birtist áður en spilun hefst).

Myndbandið rúllar sjálfkrafa í lúppu, hljóðlaust þar til gestur kveikir á
hljóði með hnappnum neðst í hægra horni.

## Að skipta um myndband
Settu nýju skrána hér með sama nafni (`afmaeli-betkastid.mp4`) svo ekkert þurfi
að breyta í `index.html`. Ráðlagt að umkóða í vef-vænt snið fyrst — t.d. með
[ffmpeg](https://ffmpeg.org/):

    # Lóðrétt myndband → 720x1280 H.264, hljóðlátt nettengt niðurhal
    ffmpeg -i INNTAK.mov -vf "scale=720:1280:flags=lanczos" \
      -c:v libx264 -profile:v high -preset slow -crf 26 -pix_fmt yuv420p \
      -c:a aac -b:a 128k -movflags +faststart afmaeli-betkastid.mp4

    # Nýtt plakat (rammi á 2. sekúndu)
    ffmpeg -ss 2 -i afmaeli-betkastid.mp4 -frames:v 1 -q:v 3 afmaeli-betkastid.jpg

## Ráð
- Helst **.mp4 (H.264 + AAC)** svo það spilist í öllum vöfrum og snjallsímum.
- Haltu skránni undir ~15 MB svo forsíðan hlaðist hratt (myndbandið spilast
  sjálfkrafa, svo stór skrá eyðir gögnum gesta).
- Fyrir lárétt myndband myndi 9:16 ramminn í `styles.css` (`.eventvideo`) þurfa
  að breytast í `16 / 9`.

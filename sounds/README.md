# Phoneme Sound Files

Place MP3 files in this directory to override the browser's text-to-speech
for individual phoneme sounds. The app will automatically detect and use them.

## Naming convention

Each file should be named `{phoneme}.mp3` where `{phoneme}` is the sound
label shown beneath each chunk chip in the Assist panel.

## Phonemes used by the app

| File name       | Sound          | Example word    |
|-----------------|----------------|-----------------|
| `n.mp3`         | n              | **n**ight       |
| `t.mp3`         | t              | nigh**t**       |
| `b.mp3`         | b              | **b**at         |
| `d.mp3`         | d              | **d**og         |
| `f.mp3`         | f              | **f**ish        |
| `g.mp3`         | g              | **g**oat        |
| `hh.mp3`        | h              | **h**at         |
| `k.mp3`         | k              | **c**at         |
| `l.mp3`         | l              | **l**amp        |
| `m.mp3`         | m              | **m**at         |
| `p.mp3`         | p              | **p**en         |
| `r.mp3`         | r              | **r**ed         |
| `s.mp3`         | s              | **s**un         |
| `v.mp3`         | v              | **v**an         |
| `w.mp3`         | w              | **w**et         |
| `y.mp3`         | y              | **y**es         |
| `z.mp3`         | z              | **z**oo         |
| `sh.mp3`        | sh             | **sh**ip        |
| `ch.mp3`        | ch             | **ch**ip        |
| `th.mp3`        | th (unvoiced)  | **th**ink       |
| `dh.mp3`        | th (voiced)    | **th**is        |
| `ng.mp3`        | ng             | si**ng**        |
| `jh.mp3`        | j              | **j**am         |
| `zh.mp3`        | zh             | vi**s**ion      |
| `ay.mp3`        | long i         | n**igh**t       |
| `iy.mp3`        | long e         | s**ee**         |
| `uw.mp3`        | oo             | m**oo**n        |
| `uh.mp3`        | short oo       | b**oo**k        |
| `ow.mp3`        | long o         | b**oa**t        |
| `ey.mp3`        | long a         | r**ai**n        |
| `ao.mp3`        | aw             | l**aw**         |
| `aw.mp3`        | ou             | h**ou**se       |
| `oy.mp3`        | oy             | b**oy**         |
| `ae.mp3`        | short a        | c**a**t         |
| `ah.mp3`        | uh             | c**u**p         |
| `ih.mp3`        | short i        | s**i**t         |
| `eh.mp3`        | short e        | b**e**d         |
| `er.mp3`        | er             | h**er**         |
| `aa.mp3`        | ah             | f**a**ther      |

### Multi-phoneme clusters

| File name       | Sound          | Example word    |
|-----------------|----------------|-----------------|
| `sh ah n.mp3`   | shun           | sta**tion**     |
| `zh ah n.mp3`   | zhun           | vi**sion**      |
| `k s.mp3`       | ks             | bo**x**         |
| `k w.mp3`       | kw             | **qu**een       |
| `aa r.mp3`      | ar             | c**ar**         |
| `ao r.mp3`      | or             | f**or**         |
| `ih r.mp3`      | ear            | **ear**         |
| `eh r.mp3`      | air            | f**air**        |

## Tips

- Record short, clear pronunciations (~0.5–1 second each).
- Use a consistent voice across all files.
- MP3 format, any bitrate (128 kbps recommended).
- Files that don't exist will fall back to browser text-to-speech.

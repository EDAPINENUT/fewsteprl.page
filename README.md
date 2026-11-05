# fewsteprl.github.io — FewStepRL project page

Static site (HTML + CSS + vanilla JS, no build step, 33 MB), hosted with GitHub Pages from the repository
[`EDAPINENUT/fewsteprl.page`](https://github.com/EDAPINENUT/fewsteprl.page) (default branch, root); it is served at
`https://edapinenut.github.io/fewsteprl.page/`. `.nojekyll` makes Pages serve the files as they are.
All paths are relative, so the folder also works from any sub-path or a local server.

Local preview (any static server with HTTP Range, which video seeking and Safari need):

```bash
python ../demo_task/page_build/serve.py --dir . --port 8080
```

Code: `fewsteprl-sd35` (images) and `fewsteprl-wan21` (videos). The scripts that build this site's data and media
live outside it, in `demo_task/page_build/` (they read the paper source and the demo candidates).

## Structure

One page at a time, switched from the table of contents (hash routes, ←/→ keys):

| group | routes |
|---|---|
| Overview | `#home` — hero with two scrolling film strips, TL;DR, the narrated explainer of the three phases (3 min), how FlowGRPO / AWM / DiffusionNFT / DiffusionOPSD enter the phases (linked), findings |
| The framework (blog) | `#framework` (why few-step RL, Fig. 1/2), `#phase-1` x-space, `#phase-2` decomposition, `#phase-3` few-step adaptation |
| Methods in the framework | `#methods` (family map, Tab. 2 components, Tab. 4 cost), `#m-fewstepgrpo` … `#m-refl` — each page walks phase 1 → 2 → 3 for that trainer, code, results, samples, AnyFlow-vs-trainer video |
| Experiments | `#exp-mix`, `#exp-ocr`, `#exp-video`, `#exp-tts`, `#guidance` |
| More | `#gallery` (four film strips), `#cite` |

Film strips: scroll continuously with a muted tint; on hover the strip stops and every frame shows its true
colours; a click opens the trainer, prompt, seed and a one-line reproduction command.

## Where every number comes from

- **Tables** (Tab. 6(a), 6(b), 7, 8, S2, S3) are parsed from the paper source `demo_task/paper/rpd/rpd_hy_version.tex`
  by `demo_task/page_build/build_data.py` → `data/paper.json`, with the numbers as printed (trailing zeros kept) and the
  paper's bold cells. Nothing is retyped.
- **Curves** (Fig. 3/4) come from `git_projects/MeanFlowNFT/outputs/all_metrics.csv`, the table the paper's figures
  are plotted from, with the same arm selection and iteration cut as `figures/plot_paper_figures.py`.
  Some Tab. 6(a) cells are read from these curves and agree to ±0.01 (e.g. MeanFlowNFT OCR at it. 100: 0.850 in the
  table, 0.845 logged).
- **Test-time scaling** (Fig. 7) comes from `demo_task/paper/rpd/trends/multistep_metrics.csv`.
- **Prose numbers** are transcribed from the paper text; each carries its source tag (Tab. / Fig. / §).
  Section and table numbers follow the current build (§6.3 image results, §6.4 video, §6.5 TTS, §6.6 guidance).
- **Interactive figures** on the framework pages are schematic (labelled "not data").
- **Media** (`demo_task/page_build/build_media.py` → `data/media.json`, `assets/`): released checkpoints only, 4 steps, no CFG.
  Showcase images use only DMDNFT / MeanFlowNFT / MeanFlowAWM / FewStepGRPO samples with grid score < 1.5
  (the grid rule of demo_task/PLAN.md §4); comparisons keep all trainers, with DMDAWM blurred (σ = 2 px) as in the README.

## Explainer video

`js/explainer.js` draws the overview video on a canvas with KaTeX overlays from one animation timeline (88 s):
every frame is a pure function of the time, so the page plays it live and the same code exports it. The 1D flow
is exact (two-component Gaussian mixture, closed-form velocity, RK4); the 2D scenes are schematic.

**Narration** (`demo_task/page_build/build_narration.py`, run in the separate conda env `tts`): the script is a list of beats,
each tied to an interval of the animation. Kokoro-82M (Apache-2.0, local) reads it; the builder writes
`assets/audio/narration_en.{m4a,ogg}` and `data/narration.js` with the subtitles (from the TTS token timestamps)
and the time warp video-time → animation-time (the picture slows down or holds while the narrator finishes).
The player autoplays silently with subtitles; "Play with narration" turns the sound on, and then the audio clock
drives the picture. Without `data/narration.js` the player falls back to the 88-s silent version with captions.

```bash
# from demo_task/
/opt/conda/envs/tts/bin/python page_build/build_narration.py --voice af_bella   # ~20 s, writes into this folder
node tools/shot/xpframes.js 12 40 70                      # check frames at animation times -> /tmp/xp/
node tools/shot/xpnarr.js                                  # autoplay, narration on, audio/picture sync, seek
node tools/shot/xpexport.js ../fewsteprl.github.io/assets/video/explainer.mp4 25 1.5 \
     ../fewsteprl.github.io/assets/audio/narration_en.m4a
```

## Rebuild

```bash
# from demo_task/; both write into ../fewsteprl.github.io
python page_build/build_data.py            # tables, bold marks, curves, TTS
python page_build/build_media.py --keep    # webp thumbnails, H.264 clips, media.json (--keep: encode new files only)
```

Open items: the Code buttons point to `coming-soon.html` and the Paper button to the citation page until public
URLs exist (`data-todo` in `index.html`); the BibTeX entry is a placeholder `@misc` until there is an arXiv id.

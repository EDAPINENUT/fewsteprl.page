# FewStepRL — project page

Project page of **FewStepRL: Fine-tuning Few-step Diffusion Models with Reinforcement Learning**, served at
<https://edapinenut.github.io/fewsteprl.page/>.

Static site (HTML + CSS + vanilla JS, no build step). All paths are relative; `.nojekyll` makes GitHub Pages serve
the files as they are. A basic page preview can use:

```bash
python3 -m http.server 8080
```

Video chapter seeking needs an HTTP server that supports byte-range requests (`206 Partial Content`), as GitHub Pages does. Python's basic server does not support those requests, so use a range-capable static server when checking chapter playback.

Paper: [arXiv:2611.08240](https://arxiv.org/abs/2611.08240).
Code: [fewsteprl-sd35](https://github.com/EDAPINENUT/fewsteprl-sd35) (images) and
[fewsteprl-wan21](https://github.com/EDAPINENUT/fewsteprl-wan21) (videos).
Checkpoints: [Delcher/fewsteprl-sd35](https://huggingface.co/Delcher/fewsteprl-sd35) and
[Delcher/fewsteprl-wan21](https://huggingface.co/Delcher/fewsteprl-wan21).

## Structure

One page at a time, switched from the table of contents (hash routes, ←/→ keys):

| group | routes |
|---|---|
| Overview | `#home` — hero with two scrolling film strips, TL;DR, the narrated explainer of the three phases, how FlowGRPO / AWM / DiffusionNFT / DiffusionOPSD enter the phases, findings |
| The framework (blog) | `#framework` (why few-step RL), `#phase-1` x-space, `#phase-2` decomposition, `#phase-3` few-step adaptation |
| Methods in the framework | `#methods` (family map, components, cost), `#m-fewstepgrpo` … `#m-refl` — each page walks phase 1 → 2 → 3 for that trainer, code, results, samples |
| Experiments | `#exp-mix`, `#exp-ocr`, `#exp-video`, `#exp-tts`, `#guidance` |
| More | `#gallery`, `#cite` |

Tables and curves follow the paper (`data/paper.json`); every sample comes from a released checkpoint, 4 steps,
no CFG (`data/media.json`, `assets/`).

## Animated whiteboard

The overview contains the 2:34 whiteboard video, divided into twelve selectable chapters: background, the three phases, the adapted methods, four findings with evidence, the video gallery, and the closing. A selected chapter stops at its boundary; **Play all** continues through the full video. Article pages link directly to their matching chapter. The original interactive explainer remains available under **Explore the interactive diagrams**.

`data/whiteboard-chapters.json` stores the chapter times and article links. `js/whiteboard.js` and `css/whiteboard.css` provide the chapter player and opt-in pixel typography, plus the small animated presenter in the three interactive phase diagrams. The curves and KaTeX formulas retain their original rendering. `assets/video/whiteboard-explainer.mp4` is the video source; the adjacent VTT files provide English/Chinese subtitle and chapter tracks. Font licensing is in `fonts/FusionPixel-LICENSE.txt`; synthesized Japanese voice attribution is in `assets/video/whiteboard-voice-attribution.txt`.

The presenter stays at the same bottom-right position throughout every video chapter; the phase explanations and chart labels wrap or shift to keep all text visible.

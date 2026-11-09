# FewStepRL — project page

Project page of **FewStepRL: Fine-tuning Few-step Diffusion Models with Reinforcement Learning**, served at
<https://edapinenut.github.io/fewsteprl.page/>.

Static site (HTML + CSS + vanilla JS, no build step). All paths are relative; `.nojekyll` makes GitHub Pages serve
the files as they are. Local preview with any static server that supports HTTP Range (needed for video seeking):

```bash
python3 -m http.server 8080
```

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

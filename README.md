# Praxish
Steps toward an open-source reimplementation of the [Praxis](https://versu.com/wp-content/uploads/2014/05/praxis.pdf) logic language, which was used for content authoring in the ambitious interactive drama framework [Versu](https://versu.com/about/how-versu-works/).

## What's in this repo?
The contents of this repo are described primarily in our [AIIDE 2023 paper](https://ojs.aaai.org/index.php/AIIDE/article/view/27537):

```bibtex
@inproceedings{dameris2023praxish,
  title={Praxish: a rational reconstruction of a logic-based DSL for modeling social practices},
  author={Dameris, James and Roman, Rosaura Hernandez and Kreminski, Max},
  booktitle={Proceedings of the AAAI Conference on Artificial Intelligence and Interactive Digital Entertainment},
  volume={19},
  pages={407--415},
  year={2023}
}
```

The [artifact](https://github.com/mkremins/praxish/releases/tag/aiide-23) associated with this paper is probably the best place to get started.

## What else is out there?
More recently, Praxish development has continued in the [mkremins/pwim](https://github.com/mkremins/pwim) repo, which offers several improvements over the version of Praxish we initially released:

- An [interactive demo project](https://mkremins.github.io/pwim/) that allows you to explore a small storyworld simulated by Praxish
- A more modularized codebase, with key Praxish functions mostly attached to a top-level `Praxish` module object rather than dumped unceremoniously into the global JavaScript namespace
- A [planner module](https://github.com/mkremins/pwim/blob/master/planner.js) that allows non-player characters to act with greater foresight

For a bit more on PWIM, see our [FDG 2024 demo paper](https://arxiv.org/abs/2406.00942):

```bibtex
@article{kreminski2024cheap,
  title={Cheap and Easy Open-Ended Text Input for Interactive Emergent Narrative},
  author={Kreminski, Max},
  journal={arXiv preprint arXiv:2406.00942},
  year={2024}
}
```

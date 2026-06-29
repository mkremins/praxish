# Praxish
Steps toward an open-source reimplementation of the [Praxis](https://versu.com/wp-content/uploads/2014/05/praxis.pdf) logic language, which was used for content authoring in the ambitious interactive drama framework [Versu](https://versu.com/about/how-versu-works/).

## Usage
To use Praxish in your own project, you'll first want to import the core library files in the following order:

- `util.js` – General-purpose utility functions employed by the other files
- `db.js` – Exclusion logic database
- `praxish.js` – Functions for defining social practices, querying for possible actions, etc.

We also provide a couple of (optional, experimental) core modules that implement different decision-making strategies for autonomous characters:

- `planner.js` – Forward-looking agents that use planning for goal-directed action selection
- `swaygent.js` – "Swayable agents" that use [Ensemble-like](https://github.com/ensemble-engine/ensemble) volition and influence rules to choose desirable actions opportunistically

Then you can look at the various *demos* for examples of how to integrate Praxish functionality into a game loop:

- [`demos/test`](https://mkremins.github.io/praxish/demos/test) – Basic functionality tests, which demonstrate the gradual build-up of a social world
- [`demos/pwim`](https://mkremins.github.io/praxish/demos/pwim) – A slightly more complicated example game that allows the player to pick actions for their character to perform, while other characters act autonomously
- [`demos/sway`](https://mkremins.github.io/praxish/demos/sway) – An interactive example project that demonstrates Swaygent decision-making logic
- [Bauprobe](https://mkremins.github.io/bauprobe) – Praxish-driven agents in continuous time and (user-editable) space

## Development history

### Phase 1
The [original Praxish paper](https://ojs.aaai.org/index.php/AIIDE/article/view/27537), published at AIIDE 2023, is probably the best starting point if you want to read more:

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

We archived the version of Praxish described in this paper as a [GitHub release](https://github.com/mkremins/praxish/releases/tag/aiide-23), then continued developing new features atop the basic Praxish substrate.

### Phase 2
Our next major Praxish-based project (intended to demonstrate an interaction technique called "play what I mean", or "PWIM" for short) introduced several improvements to the Praxish library:

- An [interactive demo project](https://mkremins.github.io/praxish/demos/pwim/) that allows you to explore a small storyworld simulated by Praxish
- A more modularized codebase, with key Praxish functions mostly attached to a top-level `Praxish` module object rather than dumped unceremoniously into the global JavaScript namespace
- A [planner module](https://github.com/mkremins/praxish/blob/master/planner.js) that allows non-player characters to act with greater foresight

For a bit more on PWIM, see our [FDG 2024 demo paper](https://arxiv.org/abs/2406.00942); the [`demos/pwim` subfolder](https://github.com/mkremins/praxish/blob/master/demos/pwim) of this repo; or the [separate repo](https://github.com/mkremins/pwim) that we used for PWIM development:

```bibtex
@article{kreminski2024cheap,
  title={Cheap and Easy Open-Ended Text Input for Interactive Emergent Narrative},
  author={Kreminski, Max},
  journal={arXiv preprint arXiv:2406.00942},
  year={2024}
}
```

### Phase 3
After the PWIM release, Praxish development paused for a couple of years, then resumed in 2026. So far, this latest wave of development has introduced:

- The [Swaygent module](https://github.com/mkremins/praxish/blob/master/swaygent.js), which allows practices to be augmented with [Ensemble-like](https://github.com/ensemble-engine/ensemble) *influence rules* and *volition rules* that drive a smarter form of reactive utility-based decision-making for NPCs
- Basic arithmetic in queries, via numeric comparators (`gt`, `gte`, `lt`, `lte`) and the `calc` operator
- Experimental support for *subqueries*, which enable both aggregates (e.g., `count`) and compound negation (similar to [`not`](https://docs.datomic.com/query/query-data-reference.html#not-clauses) in Datomic)
- A new debugging affordance (`impossibleActions`) that makes it easier to determine what Praxish actions are currently *impossible* for a particular actor and why
- Another new debugging affordance (`DB.diff`) that makes it easier to figure out what changed between two different versions of an exclusion logic database
- An [interactive demo project](https://mkremins.github.io/praxish/demos/sway) that shows off Swaygents, weighted random NPC action selection, new debugging features, and allows player control of any character to be toggled on and off
- [Bauprobe](https://mkremins.github.io/bauprobe), a Praxish-based social simulation environment that demonstrates agents wandering around user-created settings in continuous time and space

Praxish development continues today! Stay tuned for more...

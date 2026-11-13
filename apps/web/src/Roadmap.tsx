import { Fragment } from "react";
import { Icon, Lines, Manicule, vars } from "./ui";

const roadmap = [
  {
    phase: "02",
    label: "Spec library",
    title: "A home for every spec.",
    status: "PLANNED · PHASE 02",
    description:
      "Versioned API specifications and documentation, together in one place. Ownership, permissions, and safe ingestion come before implementation.",
  },
  {
    phase: "03",
    label: "Grounded scenarios",
    title: "Put understanding to the test.",
    status: "PLANNED · PHASE 03",
    description:
      "Tasks grounded in known-correct requests, so the difference between understanding and guessing can be measured. No agent runs are available today.",
  },
  {
    phase: "Later",
    label: "Documentation insights",
    title: "Make every miss mean something.",
    status: "PLANNED",
    description:
      "Turn future failures into specific documentation improvements worth testing again. There are no benchmark results or scores in this prototype.",
  },
];

export function Roadmap() {
  return (
    <section className="roadmap" id="roadmap" aria-labelledby="roadmap-title">
      <div className="section-head label" data-reveal="up">
        <span>(03) — What’s next</span>
        <span>A direction. Not a done list.</span>
      </div>
      <div className="roadmap-intro">
        <h2 id="roadmap-title" className="display" data-reveal="lines">
          <Lines>
            {[
              "The bigger",
              <Fragment key="picture">
                <em>picture.</em>
              </Fragment>,
            ]}
          </Lines>
        </h2>
        <p data-reveal="up">
          Good things take a little building. These are future ideas, not live features.
          No benchmarks have been run.
        </p>
      </div>
      <div className="roadmap-list">
        {roadmap.map((item, index) => (
          <details
            className="roadmap-item"
            name="roadmap"
            key={item.phase}
            data-reveal="up"
            style={vars({ "--d": `${index * 0.08}s` })}
          >
            <summary data-cursor="Open" data-cursor-open="Close">
              <span className="roadmap-phase label">{item.phase}</span>
              <span className="roadmap-title">
                <small className="label">{item.label}</small>
                <span>{item.title}</span>
              </span>
              <span className="roadmap-status label">{item.status}</span>
              <span className="roadmap-toggle">
                <Icon name="plus" />
              </span>
            </summary>
            <div className="roadmap-detail">
              <p>{item.description}</p>
              <span className="label">
                Not implemented · Separate phase approval required
              </span>
            </div>
          </details>
        ))}
      </div>
      <div className="roadmap-foot" data-reveal="up">
        <p>For now, a good place to start.</p>
        <a className="text-link" href="#workspace">
          Back to the playground <Icon name="arrowUp" size={16} />
        </a>
      </div>
    </section>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer" data-scrub="enter">
      <div className="footer-top">
        <p>
          Let’s make things
          <br />
          make <em>sense.</em>
        </p>
        <a
          className="footer-up"
          href="#home"
          aria-label="Back to the beginning"
          data-magnetic
        >
          <Icon name="arrowUp" size={26} />
        </a>
      </div>
      <a className="footer-wordmark" href="#home" aria-label="Manicule — back to top">
        <span className="kinetic" data-kinetic>
          {Array.from("manicule", (letter, index) => (
            <span key={index} style={vars({ "--i": index })}>
              {letter}
            </span>
          ))}
        </span>
        <Manicule className="footer-mark" />
      </a>
      <div className="footer-base label">
        <span>An independent local prototype.</span>
        <span>Synthetic data. Real curiosity.</span>
        <span>Phase 01 / The beginning</span>
      </div>
    </footer>
  );
}

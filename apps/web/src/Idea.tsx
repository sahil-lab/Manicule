import { Fragment, type ReactNode } from "react";
import { Icon, Lines, Manicule, vars } from "./ui";

// "_word_" gets a marker highlight and "*word*" the italic accent.
const STATEMENT =
  "A good API is only half the conversation. When the docs leave a _gap,_ an agent fills it with a *guess.* We’re building toward making that gap visible — and the next call _obvious._";

const words = STATEMENT.split(" ").map((raw) => {
  const marked = raw.startsWith("_") && raw.endsWith("_");
  const accent = raw.startsWith("*") && raw.endsWith("*");
  return {
    text: marked || accent ? raw.slice(1, -1) : raw,
    kind: marked ? "word is-mark" : accent ? "word is-accent" : "word",
  };
});

const marqueeRows = [
  ["Read the docs", "Make the call", "Find the gap", "Fix the words"],
  ["Less guess", "More yes", "Less noise", "More signal"],
];

const moves: Array<{
  index: string;
  tag: string;
  title: string;
  copy: string;
  tone: string;
  snippet: ReactNode;
}> = [
  {
    index: "01",
    tag: "The input",
    title: "Start with the source.",
    copy: "The words an agent actually reads: the reference, the guides, the examples.",
    tone: "is-dark",
    snippet: (
      <>
        <figcaption>pets.md</figcaption>
        <code>
          <b>GET</b> /pets/{"{id}"}
        </code>
        <span>Returns a pet.</span>
        <i className="snippet-scan" />
      </>
    ),
  },
  {
    index: "02",
    tag: "The question",
    title: "Find the missing link.",
    copy: "The exact spot where understanding quietly turns into a guess.",
    tone: "is-acid",
    snippet: (
      <>
        <figcaption>an agent, reading</figcaption>
        <code>
          <b>GET</b> /pets/<mark>?</mark>
        </code>
        <span>id: a string? a number? from where?</span>
      </>
    ),
  },
  {
    index: "03",
    tag: "The ambition",
    title: "Make the next call clear.",
    copy: "Sharper documentation and less ambiguity. Then test it again.",
    tone: "is-paper",
    snippet: (
      <>
        <figcaption>pets.md, revised</figcaption>
        <code>
          <b>GET</b> /pets/{"{id}"}
        </code>
        <span>
          <b>id</b> integer, required
        </span>
        <span>The pet’s numeric ID.</span>
        <span className="snippet-ok">
          <Icon name="check" size={14} /> Nothing left to guess
        </span>
      </>
    ),
  },
];

export function Idea() {
  return (
    <section className="idea" id="idea" aria-labelledby="idea-title">
      <div className="idea-intro">
        <div className="section-head label" data-reveal="up">
          <span>(01) — The idea</span>
          <span>Good docs leave less to the imagination.</span>
        </div>
        <h2 id="idea-title" className="display idea-title" data-reveal="lines">
          <Lines>
            {[
              "Between the docs",
              <Fragment key="aha">
                and the <em>aha.</em>
              </Fragment>,
            ]}
          </Lines>
        </h2>
        <div className="idea-body">
          <div className="idea-aside" data-reveal="up">
            <span className="label">That’s where we come in</span>
            <p>
              Manicule is an experiment in agent-readable API documentation. Today it is a
              small, honest foundation. The rest is a direction.
            </p>
          </div>
          <p
            className="statement"
            data-scrub="words"
            style={vars({ "--n": words.length })}
          >
            {words.map((word, index) => (
              <Fragment key={index}>
                <span className={word.kind} style={vars({ "--i": index })}>
                  {word.text}
                </span>{" "}
              </Fragment>
            ))}
          </p>
        </div>
      </div>

      <div className="marquee" aria-hidden="true">
        {marqueeRows.map((row, rowIndex) => (
          <div
            className={rowIndex ? "marquee-row is-outline" : "marquee-row"}
            key={rowIndex}
          >
            <div className="marquee-track" data-marquee={rowIndex ? -1 : 1}>
              {[0, 1].map((copy) => (
                <div className="marquee-group" key={copy}>
                  {row.map((phrase) => (
                    <span className="marquee-item" key={phrase}>
                      {phrase}
                      <Manicule className="marquee-mark" />
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="loop">
        <div className="loop-head">
          <h3 className="display loop-title" data-reveal="lines">
            <Lines>
              {[
                "Three moves.",
                <Fragment key="loop">
                  <em>One loop.</em>
                </Fragment>,
              ]}
            </Lines>
          </h3>
          <p className="loop-note" data-reveal="up">
            <span className="label">The vision, not a live workflow.</span>
            Today’s working slice: local health checks and metadata validation.
          </p>
        </div>
        <div className="stack">
          {moves.map((move, index) => (
            <article
              className="stack-card"
              key={move.index}
              data-scrub="cover"
              style={vars({ "--i": index })}
            >
              <div className={`stack-card-inner ${move.tone}`}>
                <div className="card-top label">
                  <span>
                    {move.index} / {move.tag}
                  </span>
                  <span>Illustration</span>
                </div>
                <div className="card-main">
                  <h4>{move.title}</h4>
                  <p>{move.copy}</p>
                </div>
                <figure className="snippet" aria-hidden="true">
                  {move.snippet}
                </figure>
                <span className="card-number" aria-hidden="true">
                  {move.index}
                </span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

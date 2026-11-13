import { useEffect, useRef, useState } from "react";
import { holdIntroFor } from "./boot";
import { createLens, type LensController } from "./lens";
import type { Readiness } from "./types";
import { Icon, vars } from "./ui";

const STATUS_COPY: Record<Readiness["state"], string> = {
  loading: "Connecting to your local foundation",
  ready: "Local foundation connected",
  error: "Local connection needs attention",
};

export function Hero({ motion, stack }: { motion: boolean; stack: Readiness["state"] }) {
  const heroRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lensRef = useRef<LensController | null>(null);
  const initialMotion = useRef(motion);
  const [lens, setLens] = useState<"pending" | "on" | "off">("pending");

  useEffect(() => {
    const hero = heroRef.current;
    const canvas = canvasRef.current;
    if (!hero || !canvas) return;
    const controller = createLens(canvas, hero, initialMotion.current);
    lensRef.current = controller;
    holdIntroFor(controller ? controller.ready : Promise.resolve());
    if (!controller) {
      setLens("off");
      return;
    }
    // The shader links in the background, so whether the lens works is only known later.
    let current = true;
    void controller.ready.then((usable) => {
      if (current) setLens(usable ? "on" : "off");
    });
    return () => {
      current = false;
      controller.destroy();
      lensRef.current = null;
    };
  }, []);

  useEffect(() => {
    lensRef.current?.setMotion(motion);
  }, [motion]);

  return (
    <section
      className="hero"
      id="home"
      ref={heroRef}
      aria-labelledby="page-title"
      data-lens={lens}
      data-scrub="hero"
    >
      <div className="hero-stage">
        <div className="hero-grid" aria-hidden="true" />
        <div className="hero-layout">
          <div className="hero-top label" data-intro style={vars({ "--d": "0.55s" })}>
            <span>
              <i className="dot" /> An experiment in API clarity
            </span>
            <span className="hero-edition">Local edition — Phase 01</span>
          </div>

          <div className="hero-center">
            <h1 id="page-title" className="hero-title" aria-label="Less guess. More yes.">
              <span className="hero-line" style={vars({ "--i": 0 })}>
                <span className="hero-line-inner">
                  <span className="hero-word" data-lens-text>
                    Less
                  </span>{" "}
                  <span className="hero-word" data-lens-text>
                    guess.
                  </span>
                </span>
              </span>
              <em className="hero-line hero-line-accent" style={vars({ "--i": 1 })}>
                <span className="hero-line-inner">
                  <span className="hero-word" data-lens-text>
                    More
                  </span>{" "}
                  <span className="hero-word" data-lens-text>
                    yes.
                  </span>
                </span>
              </em>
            </h1>

            <div className="hero-intro">
              <p className="hero-copy" data-intro style={vars({ "--d": "0.7s" })}>
                Your API deserves to be understood. We&apos;re exploring the space between
                documentation, understanding, and that <em>finally, it clicks</em>{" "}
                feeling.
              </p>
              <div className="hero-actions" data-intro style={vars({ "--d": "0.82s" })}>
                <a className="pill" href="#workspace" data-magnetic>
                  Enter the workspace
                  <span className="pill-icon">
                    <Icon name="arrow" />
                  </span>
                </a>
                <a className="text-link hero-more" href="#idea">
                  Meet the idea <Icon name="arrowDown" size={16} />
                </a>
              </div>
            </div>
          </div>

          <div className="hero-bar label" data-intro style={vars({ "--d": "0.95s" })}>
            <span className="hero-status">
              <i className={stack === "ready" ? "dot" : "dot is-waiting"} />{" "}
              {STATUS_COPY[stack]}
            </span>
            <a className="hero-scroll" href="#idea" aria-label="Scroll to the idea">
              Scroll <Icon name="arrowDown" size={14} />
            </a>
            <span className="hero-note">Synthetic data only</span>
          </div>
        </div>
        <canvas ref={canvasRef} className="hero-lens" aria-hidden="true" />
      </div>
    </section>
  );
}

import { useState } from "react";

/**
 * A reusable "AI Insights" panel. It's lazy: nothing is generated until the
 * user clicks, so we don't spend tokens on every page load. The parent passes
 * a `trigger` function returning a promise that resolves to
 * { content, model, cached }.
 */
export default function AiInsight({ title = "AI Insights", trigger, cta = "Generate AI insight" }) {
  const [state, setState] = useState({ status: "idle", data: null, error: null });

  async function run() {
    setState({ status: "loading", data: null, error: null });
    try {
      const data = await trigger();
      setState({ status: "done", data, error: null });
    } catch (err) {
      setState({ status: "error", data: null, error: err?.message || "Failed to generate insight." });
    }
  }

  return (
    <section className="ai-insight" aria-label={title}>
      <div className="ai-insight__head">
        <h3 className="ai-insight__title">
          <span className="ai-insight__spark" aria-hidden="true">✨</span> {title}
        </h3>
        <button
          className="btn btn--primary ai-insight__btn"
          onClick={run}
          disabled={state.status === "loading"}
        >
          {state.status === "loading" ? "Analysing…" : cta}
        </button>
      </div>

      {state.status === "error" && (
        <p className="ai-insight__error" role="alert">{state.error}</p>
      )}

      {state.status === "done" && state.data && (
        <div className="ai-insight__body">
          <p className="ai-insight__content">{state.data.content}</p>
          <p className="ai-insight__meta">
            {state.data.model ? `Model: ${state.data.model}` : ""}
            {state.data.cached ? " · cached" : ""}
          </p>
        </div>
      )}

      {state.status === "idle" && (
        <p className="ai-insight__hint">
          Get a plain-language, AI-generated summary of the latest data. Not financial advice.
        </p>
      )}
    </section>
  );
}

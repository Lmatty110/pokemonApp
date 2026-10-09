import React, { act } from "react";
import { renderToStaticMarkup } from "react-dom/server.node";
import { createRoot } from "react-dom/client";
import { MovePower, MoveType } from "./MoveInfo";
import MoveEffectsDialog from "./MoveEffectsDialog";

// The app's Webpack alias is not available in CRA's default Jest resolver.
jest.mock("@/lib/utils", () => require("../lib/utils"), { virtual: true });

test("the closed effect dialog can render before a move is selected", () => {
  const container = document.createElement("div");
  const root = createRoot(container);
  const previous = global.IS_REACT_ACT_ENVIRONMENT;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  try {
    expect(() => act(() => root.render(<MoveEffectsDialog move={null} onClose={() => {}} />))).not.toThrow();
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  } finally {
    act(() => root.unmount());
    global.IS_REACT_ACT_ENVIRONMENT = previous;
  }
});

test("power remains visible next to the calculated dice", () => {
  const html = renderToStaticMarkup(<MovePower power={90} />);
  expect(html).toContain("90");
  expect(html).toContain("3d8");
  expect(html).toContain("Danno in dadi: 3d8");
});

test("moves with no fixed power show a dash, not invented dice", () => {
  const html = renderToStaticMarkup(<MovePower power={null} />);
  expect(html).toContain("—");
  expect(html).not.toContain("Danno in dadi");
});

test("the move type includes visible Italian text, not just its colour", () => {
  expect(renderToStaticMarkup(<MoveType type="fire" />)).toContain("Fuoco");
});

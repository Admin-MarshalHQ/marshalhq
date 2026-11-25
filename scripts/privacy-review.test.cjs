const assert = require("node:assert/strict");
const test = require("node:test");
global.React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { default: Privacy } = require("../app/privacy/page.tsx");

test("privacy draft requires opt-in in a review environment and cannot replace production notice", (t) => {
  const keys = ["NODE_ENV", "VERCEL_ENV", "SETRU_PRIVACY_REVIEW"];
  const prior = new Map(keys.map(key => [key, process.env[key]]));
  t.after(() => {
    for (const [key, val] of prior) if (val === undefined) delete process.env[key]; else process.env[key] = val;
  });
  const render = (overrides) => {
    for (const key of keys) if (overrides[key] === undefined) delete process.env[key]; else process.env[key] = overrides[key];
    return renderToStaticMarkup(Privacy());
  };
  const label = /Draft for review/;
  assert.doesNotMatch(render({NODE_ENV: "development"}), label);
  assert.doesNotMatch(render({NODE_ENV: "production", SETRU_PRIVACY_REVIEW: "1"}), label);
  assert.doesNotMatch(render({NODE_ENV: "development", VERCEL_ENV: "production", SETRU_PRIVACY_REVIEW: "1"}), label);
  const review = render({NODE_ENV: "production", VERCEL_ENV: "preview", SETRU_PRIVACY_REVIEW: "1"});
  assert.match(review, label);
  assert.match(review, /one update when places open for your role/);
  assert.match(review, /New application alerts direct the manager to sign in/);
  assert.match(review, /completion does not automatically remove them/);
  assert.match(review, /href="\/support"/);
  assert.match(review, /href="https:\/\/ico.org.uk\/make-a-complaint\//);
  assert.doesNotMatch(review, /@setru\.co\.uk|@marshalhq\.com|@gmail\.com/);
  assert.match(render({NODE_ENV: "development", SETRU_PRIVACY_REVIEW: "1"}), label);
});

'use strict';

/** Shared CLI plumbing for the iOS and Android capture harnesses. */

const { writeFileSync } = require('fs');
const path = require('path');

/** Minimal `--key value` / `--key=value` parser; unknown keys are rejected. */
function parseArgs(argv, defaults) {
  const options = { ...defaults };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) {
      throw new Error(`Unexpected argument "${token}"`);
    }
    const [rawKey, inlineValue] = token.slice(2).split('=', 2);
    const key = rawKey.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    if (!(key in defaults)) {
      throw new Error(`Unknown option "--${rawKey}". Known: ${Object.keys(defaults).join(', ')}`);
    }
    const value = inlineValue !== undefined ? inlineValue : argv[(index += 1)];
    if (value === undefined) {
      throw new Error(`Option "--${rawKey}" needs a value`);
    }
    options[key] = typeof defaults[key] === 'number' ? Number(value) : value;
  }
  return options;
}

/** `parseArgs` with operator-facing error reporting for CLI entry points. */
function parseCliArgs(argv, defaults) {
  try {
    return parseArgs(argv, defaults);
  } catch (error) {
    console.error(String(error.message || error));
    process.exit(1);
  }
}

const settle = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Writes a run summary next to the captures and exits non-zero when a frame
 * the manifest says is implemented was not captured — a silent short run is
 * exactly the failure this harness exists to prevent.
 */
function reportRun({ platform, out, captured, skipped, masks }) {
  const summary = {
    platform,
    capturedAt: new Date().toISOString(),
    masks,
    captured: captured.map((target) => ({
      nodeId: target.nodeId,
      fileName: target.fileName,
      referenceImage: target.referenceImage,
      deepLink: target.deepLink,
    })),
    skipped: skipped.map((target) => ({
      nodeId: target.nodeId,
      kind: target.kind,
      reason: target.reason,
    })),
  };
  const summaryPath = path.join(out, 'capture-summary.json');
  writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);

  console.log(`\n${captured.length} captured, ${skipped.length} skipped → ${out}`);
  skipped.forEach((target) => console.log(`  skipped ${target.kind}: ${target.reason}`));
  console.log(`summary: ${summaryPath}`);

  const uncapturedImplemented = skipped.filter((target) => target.kind === 'manual');
  if (uncapturedImplemented.length > 0) {
    console.log(
      `\n${uncapturedImplemented.length} frame(s) need the manual tap sequences above before signoff.`,
    );
  }
  if (captured.length === 0) {
    console.error('No frames were captured; treating the run as a failure.');
    process.exit(1);
  }
}

module.exports = { parseArgs, parseCliArgs, reportRun, settle };

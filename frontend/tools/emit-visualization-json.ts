/**
 * Emits dsa_learn/curriculum/topics/<topic>/visualization.json from the live
 * registry, so declaration and implementation cannot drift (invariant V-05,
 * research R-002).
 *
 * Run: node --experimental-strip-types tools/emit-visualization-json.ts
 *   or, when typescript tooling is unavailable, bundle with esbuild first.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { REGISTRATIONS } from '../src/components/visualizer/registry/registrations';

const CURRICULUM = '/home/yes/projects/dsa-learn/dsa_learn/curriculum/topics';

const byTopic = new Map<string, any[]>();
for (const reg of REGISTRATIONS as any[]) {
  const ops = byTopic.get(reg.topicId) ?? [];
  ops.push({
    id: reg.operationId,
    name: reg.name,
    description: reg.description,
    data_structure_type: reg.dataStructureType,
    parameters: reg.parameters.map((p: any) => ({
      name: p.name,
      label: p.label,
      type: p.type,
      default_value: p.defaultValue,
      ...(p.min !== undefined ? { min: p.min } : {}),
      ...(p.max !== undefined ? { max: p.max } : {}),
    })),
    presets: reg.presets.map((pr: any) => ({
      name: pr.name,
      description: pr.description,
      input: normaliseInput(pr.input),
      params: pr.params ?? {},
    })),
  });
  byTopic.set(reg.topicId, ops);
}

/** Edge-list and matrix inputs are not JSON-round-trippable through the box UI;
 *  they are recorded by shape so the declaration stays honest about its input. */
function normaliseInput(input: any): any {
  if (Array.isArray(input) && input.every((v) => typeof v === 'number' || typeof v === 'string')) {
    return { kind: 'list', values: input };
  }
  if (input && typeof input === 'object' && Array.isArray(input.nodes)) {
    return { kind: 'graph', nodes: input.nodes, edges: input.edges };
  }
  return { kind: 'empty', values: [] };
}

let written = 0;
for (const [topic, operations] of byTopic) {
  mkdirSync(`${CURRICULUM}/${topic}`, { recursive: true });
  writeFileSync(
    `${CURRICULUM}/${topic}/visualization.json`,
    JSON.stringify({ operations }, null, 2) + '\n',
  );
  console.log(`${topic}: ${operations.length} operation(s)`);
  written++;
}

console.log(`\nwrote ${written} visualization.json files`);
console.log(`registry registrations: ${(REGISTRATIONS as any[]).length}`);
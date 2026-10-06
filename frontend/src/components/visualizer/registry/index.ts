/**
 * Visualizer operation registry (spec 006, research R-001/R-002).
 *
 * Replaces the two hardcoded conditional chains that previously lived in
 * `VisualizerContainer`: one `if (topicId === ...)` chain selecting operations,
 * and one `if (data_structure_type === ...)` chain selecting a renderer.
 *
 * A visualization exists only as a registration here. There is no fallback:
 * a topic with no registration renders an explicit incomplete state rather than
 * borrowing another topic's animation, which is what previously caused six
 * topics to be shown a binary search animation they had nothing to do with
 * (FR-013, FR-016).
 */

import type { VisualizerStateFrame } from '@/lib/types';

/** Subject-specific inputs a generator may accept. */
export type VisualizerInput =
  | number[]
  | string[]
  | { nodes: string[]; edges: Array<[string, string] | [string, string, number]> }
  | number[][];

export type ParamValues = Record<string, unknown>;

export interface ParameterSpec {
  name: string;
  label: string;
  type: 'number' | 'string' | 'boolean' | 'numberList' | 'edgeList' | 'stringList';
  defaultValue: unknown;
  min?: number;
  max?: number;
}

export interface PresetSpec {
  /** MUST name the boundary it exercises (FR-014). */
  name: string;
  description: string;
  input: VisualizerInput;
  params: ParamValues;
}

export interface VisualizationRegistration {
  topicId: string;
  /** Unique within `topicId` (invariant V-01). */
  operationId: string;
  name: string;
  description: string;
  dataStructureType: string;
  parameters: ParameterSpec[];
  /** MUST cover every FR-014 boundary case (invariant V-04). */
  presets: PresetSpec[];
  /** Pure and deterministic: no mutation, no I/O, no clock, no randomness. */
  generate: (input: VisualizerInput, params: ParamValues) => VisualizerStateFrame[];
}

const registry = new Map<string, VisualizationRegistration>();

function key(topicId: string, operationId: string): string {
  return `${topicId}::${operationId}`;
}

export function registerVisualization(registration: VisualizationRegistration): void {
  const k = key(registration.topicId, registration.operationId);
  if (registry.has(k)) {
    throw new Error(
      `Duplicate visualization registration for ${k}. ` +
        'operationId must be unique within a topic (invariant V-01).',
    );
  }
  registry.set(k, registration);
}

export function getVisualizationsForTopic(topicId: string): VisualizationRegistration[] {
  return Array.from(registry.values()).filter((r) => r.topicId === topicId);
}

export function getVisualization(
  topicId: string,
  operationId: string,
): VisualizationRegistration | undefined {
  return registry.get(key(topicId, operationId));
}

/**
 * Every registered operation, used by the curriculum coverage report and by the
 * registry-parity contract test (G-05).
 */
export function exportVisualizationManifest(): Array<{
  topicId: string;
  operationId: string;
  dataStructureType: string;
}> {
  return Array.from(registry.values()).map((r) => ({
    topicId: r.topicId,
    operationId: r.operationId,
    dataStructureType: r.dataStructureType,
  }));
}

/** Test-only reset so suites can build an isolated registry. */
export function __resetRegistryForTests(): void {
  registry.clear();
}

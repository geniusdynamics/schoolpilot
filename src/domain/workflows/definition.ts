// ABOUTME: Definition validation: a workflow the engine accepts has states with unique keys and a
// ABOUTME: single initial state, and every transition it names leads between states that exist.

import { WorkflowError } from './errors';
import { stateByKey } from './guard';
import type { WorkflowDefinition } from './types';

/** Refuses a definition the engine could not run. */
export function validateDefinition(definition: WorkflowDefinition): void {
  const fail = (message: string): never => {
    throw new WorkflowError('invalid_definition', `${definition.key}: ${message}`, definition.key);
  };

  if (definition.key.trim() === '') fail('the key is empty');
  if (definition.name.trim() === '') fail('the name is empty');
  if (definition.states.length === 0) fail('a workflow needs at least one state');

  const stateKeys = new Set<string>();
  const orders = new Set<number>();
  for (const state of definition.states) {
    if (state.key.trim() === '') fail('a state key is empty');
    if (stateKeys.has(state.key)) fail(`the state ${state.key} is declared twice`);
    stateKeys.add(state.key);
    if (orders.has(state.sequence_order)) {
      fail(`two states share the sequence order ${state.sequence_order}`);
    }
    orders.add(state.sequence_order);
  }

  const initialCount = definition.states.filter((state) => state.is_initial === true).length;
  if (initialCount > 1) fail('more than one state is declared initial');

  if (definition.policy === 'explicit') {
    if (definition.transitions.length === 0) fail('an explicit workflow needs at least one transition');
    const transitionKeys = new Set<string>();
    const edges = new Set<string>();
    for (const transition of definition.transitions) {
      if (transition.key.trim() === '') fail('a transition key is empty');
      if (transitionKeys.has(transition.key)) {
        fail(`the transition ${transition.key} is declared twice`);
      }
      transitionKeys.add(transition.key);
      if (transition.from.length === 0) fail(`the transition ${transition.key} leaves no state`);
      if (!stateByKey(definition, transition.to)) {
        fail(`the transition ${transition.key} enters the unknown state ${transition.to}`);
      }
      for (const from of transition.from) {
        if (!stateByKey(definition, from)) {
          fail(`the transition ${transition.key} leaves the unknown state ${from}`);
        }
        const edge = `${from}->${transition.to}`;
        if (edges.has(edge)) fail(`two transitions lead from ${from} to ${transition.to}`);
        edges.add(edge);
      }
    }
  }
}

/**
 * Declares a workflow and holds it to the engine's contract.
 *
 * Every definition the engine ships or a module writes goes through here, so a typo in a state key
 * is a refusal at declaration time rather than a silent dead end at run time.
 */
export function defineWorkflow(definition: WorkflowDefinition): WorkflowDefinition {
  validateDefinition(definition);
  return definition;
}

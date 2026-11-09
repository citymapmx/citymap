import { describe, it, expect } from 'vitest';
import { shouldShowCityEmptyState } from '../lib/cityEmptyState.js';

describe('shouldShowCityEmptyState', () => {
  it('ciudad con tours pero sin negocios no muestra el estado vacío', () => {
    expect(shouldShowCityEmptyState({ hasBusinesses: false, hasExperiences: true })).toBe(false);
  });

  it('ciudad sin nada muestra el estado vacío', () => {
    expect(shouldShowCityEmptyState({})).toBe(true);
    expect(shouldShowCityEmptyState({
      hasBusinesses: false,
      hasExperiences: false,
      hasEvents: false,
      hasWidget: false,
    })).toBe(true);
  });

  it('ciudad con widget no muestra el estado vacío', () => {
    expect(shouldShowCityEmptyState({ hasWidget: true })).toBe(false);
  });

  it('ciudad con eventos pero sin negocios ni experiences no muestra el estado vacío', () => {
    expect(shouldShowCityEmptyState({
      hasBusinesses: false,
      hasExperiences: false,
      hasEvents: true,
    })).toBe(false);
  });

  it('ciudad con negocios no muestra el estado vacío', () => {
    expect(shouldShowCityEmptyState({ hasBusinesses: true })).toBe(false);
  });
});

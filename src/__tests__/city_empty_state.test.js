import { describe, it, expect } from 'vitest';
import { shouldShowCityEmptyState, shouldShowCategoryEmptyState } from '../lib/cityEmptyState.js';

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

describe('shouldShowCategoryEmptyState', () => {
  it('categoría completa vacía en ciudad con tours muestra la tarjeta de categoría', () => {
    expect(shouldShowCategoryEmptyState({
      selectedSubcat: 'todas',
      categoryLabel: 'Restaurantes',
      showGenericEmpty: false,
    })).toBe(true);
  });

  it('no se muestra si la tarjeta genérica ya está visible (nunca dos tarjetas)', () => {
    expect(shouldShowCategoryEmptyState({
      selectedSubcat: 'todas',
      categoryLabel: 'Restaurantes',
      showGenericEmpty: true,
    })).toBe(false);
  });

  it('con subcategoría elegida no se muestra (se queda el bloque pequeño)', () => {
    expect(shouldShowCategoryEmptyState({
      selectedSubcat: 'tacos',
      categoryLabel: 'Restaurantes',
      showGenericEmpty: false,
    })).toBe(false);
  });

  it('sin etiqueta de categoría no se muestra', () => {
    expect(shouldShowCategoryEmptyState({
      selectedSubcat: 'todas',
      categoryLabel: undefined,
      showGenericEmpty: false,
    })).toBe(false);
  });
});

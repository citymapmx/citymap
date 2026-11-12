-- Visibilidad de categorías de menú por horario (PR menu-visibilidad-por-horario).
-- CORRER EN EL EDITOR SQL DEL PANEL DE SUPABASE. Sin estas columnas, el menú
-- sigue funcionando: el código pide las columnas y si fallan usa la consulta
-- sin ellas (las categorías se tratan como siempre visibles).
--
-- available_from / available_to (time, NULL = sin límite): ventana en la que
-- la categoría se muestra en el menú público. NULL en ambas = siempre visible.
alter table public.store_categories
  add column if not exists available_from time null,
  add column if not exists available_to time null;

-- Los horarios por negocio NO van en esta migración: se aplican por separado
-- en el editor SQL (verificar por PostgREST después):
-- KAVA (017f323b-d365-4137-be81-0e36980a4b6c): desayunos 08:00-12:30 y
-- comidas 15:00-21:00 (categorías ya existen; ver ESPECIFICACION.md).
-- El Tentempié (bf804fc3-8ecd-4bc2-be61-03ce1bd98f8d): desayunos 08:30-13:00,
-- SOLO DESPUÉS de ejecutar agregar-desayunos-tentempie-2026-11-12.sql.

// Categorías del menú (con productos y opciones) de un negocio.
//
// La misma consulta que BusinessStore.loadStore, compartida por MenuView
// (carga única del menú: negocio + categorías en paralelo) y por
// BusinessStore cuando se usa sin MenuView (ficha del negocio).
// Nunca lanza: si la consulta falla devuelve [] (como el catch de
// loadStore, que dejaba el menú vacío en vez de romper la página).

import { sb } from './supabase.js';

const SELECT_WITH_IMAGE = 'id,name,sort_order,image_url,available_from,available_to,store_products(id,name,description,price,image_url,is_available,sort_order,category_id,promotion,store_product_options(id,name,type,is_required,store_option_values(id,label,extra_price)))';
const SELECT_FALLBACK = 'id,name,sort_order,store_products(id,name,description,price,image_url,is_available,sort_order,category_id,promotion,store_product_options(id,name,type,is_required,store_option_values(id,label,extra_price)))';

export async function fetchStoreCategories(businessId) {
  if (!businessId) return [];
  let data;
  try {
    // Primero con image_url (para el fallback de imagen de categoría).
    data = await sb.get('store_categories', `?business_id=eq.${businessId}&select=${SELECT_WITH_IMAGE}&order=sort_order.asc`);
  } catch {
    // Fallback: sin image_url (por si la columna no tiene permisos aún).
    // Tampoco trae available_from/available_to: sin la migración, las
    // categorías se tratan como siempre visibles.
    try {
      data = await sb.get('store_categories', `?business_id=eq.${businessId}&select=${SELECT_FALLBACK}&order=sort_order.asc`);
    } catch {
      return [];
    }
  }
  if (!data) return [];
  // PostgREST no ordena los recursos anidados: se ordenan aquí.
  data.forEach((cat) => {
    if (cat.store_products) {
      cat.store_products = [...cat.store_products].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    }
  });
  return data;
}

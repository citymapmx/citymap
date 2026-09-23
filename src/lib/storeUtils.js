export function buildWhatsAppMessage(cartItems, business, customerName = "", orderType = "pickup", address = "", generalNotes = "") {
  // Format price
  const f = (val) => "$" + Number(val).toFixed(2);
  const SEP = "─────────────────\n";

  let msg = `🛒 *NUEVO PEDIDO VÍA CITYMAP*\n\n`;

  msg += `${SEP}`;
  msg += `👤 *DATOS DEL CLIENTE*\n`;
  if (customerName.trim()) {
    msg += `Nombre: ${customerName}\n`;
  }
  
  if (orderType === "delivery") {
    msg += `Método: Envío a domicilio\n`;
    if (address.trim()) {
      msg += `Dirección: ${address}\n`;
    }
  } else {
    msg += `Método: Pasar a recoger\n`;
  }
  
  msg += `\n${SEP}`;
  msg += `🧾 *DETALLE DEL PEDIDO*\n\n`;

  // Group items by category name
  const groups = {};
  let total = 0;

  cartItems.forEach(item => {
    const itemTotal = item.unitTotal * item.quantity;
    total += itemTotal;

    const catName = item.product.cat_name || "General";
    if (!groups[catName]) {
      groups[catName] = [];
    }
    groups[catName].push(item);
  });

  // Construct grouped category list
  Object.keys(groups).forEach(catName => {
    msg += `[${catName.toUpperCase()}]\n`;
    
    let catSubtotal = 0;

    groups[catName].forEach(item => {
      const itemTotal = item.unitTotal * item.quantity;
      catSubtotal += itemTotal;

      let productLine = `*${item.quantity}x* ${item.product.name} — ${f(itemTotal)}`;
      msg += productLine + `\n`;
      
      if (item.selectedOptions && item.selectedOptions.length > 0) {
        item.selectedOptions.forEach(opt => {
          const values = Array.isArray(opt.value) ? opt.value : [opt.value];
          const hasOnlySi = values.length === 1 && values[0].label.toLowerCase() === 'sí';
          
          if (hasOnlySi) {
            const v = values[0];
            const isOmit = !v.extra_price || Number(v.extra_price) === 0;
            const txt = isOmit ? `Sin ${opt.name.toLowerCase()}` : opt.name;
            msg += `  - ${txt}${!isOmit && v.extra_price ? ` (+${f(v.extra_price)})` : ''}\n`;
          } else {
            const labels = values.map(v => {
              if (v.extra_price && Number(v.extra_price) > 0) {
                return `${v.label} (+${f(v.extra_price)})`;
              }
              return v.label;
            }).join(", ");
            msg += `  - ${opt.name ? opt.name + ': ' : ''}${labels}\n`;
          }
        });
      }
      
      if (item.specialInstructions && item.specialInstructions.trim()) {
        msg += `  📝 Nota: ${item.specialInstructions.trim()}\n`;
      }
    });

    msg += `Subtotal: ${f(catSubtotal)}\n\n`;
  });

  msg += `${SEP}`;
  msg += `💰 *TOTAL A PAGAR: ${f(total)} MXN*\n`;

  if (generalNotes && generalNotes.trim()) {
    msg += `\n📝 Notas: ${generalNotes.trim()}\n`;
  }

  return msg;
}

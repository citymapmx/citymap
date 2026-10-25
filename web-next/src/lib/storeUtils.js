export function buildWhatsAppMessage(cartItems, business, customerName = "", orderType = "pickup", address = "", generalNotes = "") {
  // Format price ($95 or $95.50)
  const f = (val) => {
    const n = Number(val) || 0;
    return "$" + (n % 1 === 0 ? n.toFixed(0) : n.toFixed(2));
  };
  const SEP = "- - - - - - - - - - - - - - - - - - - -\n";

  const cleanOptHeader = (name) => {
    if (!name) return "";
    let clean = String(name).trim();
    clean = clean.replace(/^elige\s+(el|la|los|las|tu|tus)\s+/i, "");
    return clean.charAt(0).toUpperCase() + clean.slice(1);
  };

  let msg = `*NUEVO PEDIDO VÍA CITYMAP*\n`;
  msg += `${SEP}`;
  msg += `*DATOS DEL CLIENTE*\n`;
  if (customerName.trim()) {
    msg += `Nombre: ${customerName.trim()}\n`;
  }
  
  if (orderType === "delivery") {
    msg += `Método: Envío a domicilio\n`;
    if (address.trim()) {
      msg += `Dirección: ${address.trim()}\n`;
    }
  } else {
    msg += `Método: Pasar a recoger\n`;
  }
  
  msg += `\n${SEP}`;
  msg += `*DETALLE DEL PEDIDO*\n\n`;

  // Group items by category name
  const groups = {};
  let total = 0;

  cartItems.forEach(item => {
    const itemTotal = item.unitTotal * item.quantity;
    total += itemTotal;

    const catName = item.product?.cat_name || "General";
    if (!groups[catName]) {
      groups[catName] = [];
    }
    groups[catName].push(item);
  });

  // Construct grouped category list
  Object.keys(groups).forEach(catName => {
    msg += `[ CATEGORÍA: ${catName.toUpperCase()} ]\n\n`;

    groups[catName].forEach((item, itemIdx) => {
      const itemTotal = item.unitTotal * item.quantity;

      msg += `• *${item.quantity}x ${item.product.name}*\n`;
      
      if (item.selectedOptions && item.selectedOptions.length > 0) {
        item.selectedOptions.forEach(opt => {
          const values = Array.isArray(opt.value) ? opt.value : [opt.value];
          const hasOnlySi = values.length === 1 && values[0].label.toLowerCase() === 'sí';
          
          if (hasOnlySi) {
            const v = values[0];
            const isOmit = !v.extra_price || Number(v.extra_price) === 0;
            const txt = isOmit ? `Sin ${cleanOptHeader(opt.name).toLowerCase()}` : cleanOptHeader(opt.name);
            msg += `  - ${txt}${!isOmit && v.extra_price ? ` (+${f(v.extra_price)})` : ''}\n`;
          } else {
            const labels = values.map(v => {
              if (v.extra_price && Number(v.extra_price) > 0) {
                return `${v.label} (+${f(v.extra_price)})`;
              }
              return v.label;
            }).join(", ");
            const header = cleanOptHeader(opt.name);
            msg += `  - ${header ? header + ': ' : ''}${labels}\n`;
          }
        });
      }
      
      if (item.specialInstructions && item.specialInstructions.trim()) {
        msg += `  Nota: ${item.specialInstructions.trim()}\n`;
      }

      msg += `  Subtotal: ${f(itemTotal)}\n`;
      if (itemIdx < groups[catName].length - 1) {
        msg += `\n`;
      }
    });

    msg += `\n`;
  });

  msg += `${SEP}`;
  msg += `*TOTAL A PAGAR: ${f(total)} MXN*\n`;
  msg += `${SEP}`;

  if (generalNotes && generalNotes.trim()) {
    msg += `\nNotas: ${generalNotes.trim()}\n`;
  }

  return msg;
}

export function buildWhatsAppMessage(cartItems, business, customerName = "", orderType = "pickup", address = "", generalNotes = "") {
  // Format price
  const f = (val) => "$" + Number(val).toFixed(2);

  let msg = `*Pedido de ${business.name}* vía CityMap\n\n`;

  if (customerName.trim()) {
    msg += `*Cliente:* ${customerName}\n\n`;
  }
  
  if (orderType === "delivery") {
    msg += `*Método:* 🛵 Envío a domicilio\n\n`;
    msg += `*Dirección:* ${address}\n\n`;
  } else {
    msg += `*Método:* 🛍️ Pasar a recoger\n\n`;
  }

  let total = 0;

  cartItems.forEach(item => {
    const itemTotal = item.unitTotal * item.quantity;
    total += itemTotal;

    let productLine = `${item.quantity}x ${item.product.name}`;
    if (item.specialInstructions && item.specialInstructions.trim()) {
      productLine += ` (${item.specialInstructions.trim()})`;
    }
    msg += productLine + `\n`;
    
    if (item.selectedOptions && item.selectedOptions.length > 0) {
      item.selectedOptions.forEach(opt => {
        const values = Array.isArray(opt.value) ? opt.value : [opt.value];
        const hasOnlySi = values.length === 1 && values[0].label.toLowerCase() === 'sí';
        
        if (hasOnlySi) {
          const v = values[0];
          const isOmit = !v.extra_price || Number(v.extra_price) === 0;
          const txt = isOmit ? `Sin ${opt.name.toLowerCase()}` : opt.name;
          msg += `- ${txt}${!isOmit && v.extra_price ? ` (+${f(v.extra_price)})` : ''}\n`;
        } else {
          const labels = values.map(v => {
            if (v.extra_price && Number(v.extra_price) > 0) {
              return `${v.label} (+${f(v.extra_price)})`;
            }
            return v.label;
          }).join(", ");
          msg += `- ${opt.name ? opt.name + ': ' : ''}${labels}\n`;
        }
      });
    }
    
    msg += `\n`;
  });

  msg += `*Total: ${f(total)} MXN*\n`;

  if (generalNotes && generalNotes.trim()) {
    msg += `\n📝 *Notas:* ${generalNotes.trim()}\n`;
  }

  return msg;
}

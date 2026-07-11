/* ==========================================================================
   1. ESTRUCTURA DE DATOS (TARIFAS REALES DE RCS)
   ========================================================================== */
const tarifasRCS = {
    blanca_11oz: { unidad: 7.00, docenas: 6.50, ciento: 5.90 },
    conica_15oz: { unidad: 11.90, docenas: 10.50, ciento: 9.90 },
    magica:      { unidad: 14.90, docenas: 13.90, ciento: 12.90 }
};

/* ==========================================================================
   2. CAPTURA DE ELEMENTOS DE LA INTERFAZ (DOM)
   ========================================================================== */
const form = document.getElementById('form-cotizador');
const tipoTaza = document.getElementById('tipo-taza');
const cantidadInput = document.getElementById('cantidad');
const pantallaPrecio = document.getElementById('pantalla-precio');

/* ==========================================================================
   3. EL ESCUCHADOR DE EVENTOS (EVENT LISTENER)
   ========================================================================== */
form.addEventListener('submit', function(event) {
    // Evita que la página se recargue y borre los datos al enviar el formulario
    event.preventDefault(); 

    // Extraemos los valores actuales que el usuario eligió
    const modelo = tipoTaza.value;
    const cantidad = parseInt(cantidadInput.value);

    // 4. APLICACIÓN DE REGLAS DE NEGOCIO POR ESCALAS
    let precioUnitario = 0;

    if (cantidad >= 100) {
        precioUnitario = tarifasRCS[modelo].ciento; // Precio por ciento
    } else if (cantidad >= 24) {
        precioUnitario = tarifasRCS[modelo].docenas; // Precio por 2 docenas
    } else {
        precioUnitario = tarifasRCS[modelo].unidad; // Precio por unidad
    }

    // 5. CÁLCULO MATEMÁTICO
    const total = cantidad * precioUnitario;

    // 6. INYECCIÓN DINÁMICA DE RESULTADOS EN EL HTML
    pantallaPrecio.innerHTML = `
        <div style="animation: fadeIn 0.4s ease;">
            <h3 style="color: #2d6a4f; margin-bottom: 15px; font-size: 1.2rem;">¡Cotización Procesada!</h3>
            <p style="color: #1e293b; margin-bottom: 8px;">
                <strong>Modelo:</strong> ${tipoTaza.options[tipoTaza.selectedIndex].text}
            </p>
            <p style="color: #1e293b; margin-bottom: 8px;">
                <strong>Cantidad solicitada:</strong> ${cantidad} unidades
            </p>
            <p style="color: #1e293b; margin-bottom: 8px;">
                <strong>Precio Unitario:</strong> S/ ${precioUnitario.toFixed(2)}
            </p>
            <hr style="border: 0; border-top: 1px solid #c8e6c9; margin: 12px 0;">
            <p style="color: #2d6a4f; font-size: 1.4rem; font-weight: 700; margin-bottom: 0;">
                <strong>Total Estimado:</strong> S/ ${total.toFixed(2)}
            </p>
        </div>
    `;
});
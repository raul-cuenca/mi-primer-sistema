// ============================================================================
// 1. CONFIGURACIÓN E INICIALIZACIÓN DE SUPABASE
// ============================================================================
const SUPABASE_URL = 'https://rfgdcktnzdbyslinobai.supabase.co'; // Reemplaza con tu URL
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmZ2Rja3RuemRieXNsaW5vYmFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU1NTIwNDIsImV4cCI6MjEwMTEyODA0Mn0.yx9s_k6gdTNGObcwVO6Jg5PcsiVtInc8y1KpZUfr9NM';          // Reemplaza con tu Key

const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


// ============================================================================
// 2. ESTADO GLOBAL DE LA APLICACIÓN
// ============================================================================
let cotizacionCart = [];
let productoActualCalculado = null;

// Armazón de datos precargados desde Supabase
let baseDeDatos = {
    categorias: [],
    productos: [] // Cada producto contendrá sus adicionales y opciones_adicionales anidadas
};


// ============================================================================
// 3. CARGA DE DATOS RELACIONALES (SUPABASE)
// ============================================================================
document.addEventListener('DOMContentLoaded', async () => {
    inicializarEventosFormulario();
    await cargarDatosDesdeSupabase();
});

/**
 * Carga categorías y productos con sus adicionales y opciones anidadas mediante Joins de Supabase
 */
async function cargarDatosDesdeSupabase() {
    try {
        mostrarCargandoEnPantalla(true);

        // Consulta relacional profunda: Trae producto + sus adicionales + sus opciones_adicionales
        const [resCat, resProd] = await Promise.all([
            _supabase.from('categorias').select('*').order('nombre'),
            _supabase.from('productos')
                .select(`
                    *,
                    adicionales (
                        id, producto_id, clave, label,
                        opciones_adicionales ( id, adicional_id, clave, nombre, extra )
                    )
                `)
                .order('nombre')
        ]);

        if (resCat.error) throw resCat.error;
        if (resProd.error) throw resProd.error;

        baseDeDatos.categorias = resCat.data || [];
        baseDeDatos.productos = resProd.data || [];

        poblarSelectorCategorias();
    } catch (error) {
        console.error('Error al conectar con Supabase:', error.message);
        mostrarToast('Error al conectar con la base de datos', 'error');
        document.getElementById('pantalla-precio').innerHTML = `
            <div class="text-center py-6 text-red-400">
                <p class="font-bold">❌ Error de Conexión</p>
                <p class="text-xs mt-1 text-slate-400">Verifica las credenciales o consulta la consola.</p>
            </div>
        `;
    }
}

/**
 * Poblar selector inicial de categorías
 */
function poblarSelectorCategorias() {
    const selectCat = document.getElementById('categoria');
    selectCat.innerHTML = '<option value="" disabled selected>-- Selecciona una Categoría --</option>';

    baseDeDatos.categorias.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.id;
        option.textContent = cat.nombre;
        selectCat.appendChild(option);
    });

    selectCat.disabled = false;
    document.getElementById('pantalla-precio').innerHTML = `
        <div class="text-center py-8 text-slate-400">
            <svg class="w-12 h-12 mx-auto mb-3 opacity-40 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
            </svg>
            <p class="text-sm font-medium">Selecciona un producto para comenzar.</p>
        </div>
    `;
}


// ============================================================================
// 4. LÓGICA DE INTERFAZ Y RENDERIZADO DINÁMICO DE ADICIONALES
// ============================================================================
function inicializarEventosFormulario() {
    document.getElementById('categoria').addEventListener('change', actualizarProductos);
    document.getElementById('tipo-producto').addEventListener('change', () => {
        renderizarAdicionalesDelProducto();
        calcularCotizacionActual();
    });
    document.getElementById('cantidad').addEventListener('input', calcularCotizacionActual);
    document.getElementById('estado-diseno').addEventListener('change', calcularCotizacionActual);
}

function actualizarProductos() {
    const categoriaId = document.getElementById('categoria').value;
    const selectProd = document.getElementById('tipo-producto');
    
    selectProd.innerHTML = '<option value="" disabled selected>-- Selecciona Modelo --</option>';
    
    const productosFiltrados = baseDeDatos.productos.filter(p => p.categoria_id == categoriaId);

    if (productosFiltrados.length === 0) {
        selectProd.disabled = true;
        return;
    }

    productosFiltrados.forEach(prod => {
        const option = document.createElement('option');
        option.value = prod.id;
        option.textContent = prod.nombre;
        selectProd.appendChild(option);
    });

    selectProd.disabled = false;
    limpiarContenedoresVariables();
    calcularCotizacionActual();
}

function limpiarContenedoresVariables() {
    document.getElementById('contenedor-trabajo').innerHTML = '';
    document.getElementById('contenedor-adicionales').innerHTML = '';
    document.getElementById('contenedor-colores').classList.add('hidden');
    document.getElementById('color-seleccionado').value = '';
}

/**
 * Muestra dinámicamente los adicionales y opciones_adicionales pertenecientes al producto seleccionado
 */
function renderizarAdicionalesDelProducto() {
    limpiarContenedoresVariables();
    const prodId = document.getElementById('tipo-producto').value;
    if (!prodId) return;

    const producto = baseDeDatos.productos.find(p => p.id == prodId);
    if (!producto || !producto.adicionales) return;

    const contAdicionales = document.getElementById('contenedor-adicionales');
    contAdicionales.innerHTML = '';

    // Renderizar siempre la paleta de color base
    document.getElementById('contenedor-colores').classList.remove('hidden');
    renderizarSwatchesColor(['Blanco', 'Negro', 'Azul Marino', 'Rojo', 'Gris Melange']);

    // Recorrer adicionales asignados a este producto desde la BD
    producto.adicionales.forEach(adic => {
        if (!adic.opciones_adicionales || adic.opciones_adicionales.length === 0) return;

        const divGroup = document.createElement('div');
        divGroup.className = 'space-y-1.5';

        const label = document.createElement('label');
        label.className = 'block text-xs font-bold uppercase tracking-wider text-slate-600';
        label.textContent = adic.label || adic.clave;

        const select = document.createElement('select');
        select.className = 'w-full bg-slate-50 border border-slate-300 text-slate-800 text-sm rounded-xl p-3 focus:ring-2 focus:ring-blue-800 focus:border-blue-800 transition font-medium select-adicional-dinamico';
        select.dataset.adicionalId = adic.id;
        select.addEventListener('change', calcularCotizacionActual);

        select.innerHTML = '<option value="0" data-extra="0">-- Ninguno / Estándar --</option>';

        adic.opciones_adicionales.forEach(opc => {
            const extraTexto = opc.extra > 0 ? ` (+S/ ${Number(opc.extra).toFixed(2)})` : '';
            const opt = document.createElement('option');
            opt.value = opc.id;
            opt.dataset.extra = opc.extra || 0;
            opt.textContent = `${opc.nombre}${extraTexto}`;
            select.appendChild(opt);
        });

        divGroup.appendChild(label);
        divGroup.appendChild(select);
        contAdicionales.appendChild(divGroup);
    });
}

function renderizarSwatchesColor(colores) {
    const grid = document.getElementById('grid-muestras-color');
    grid.innerHTML = '';

    const mapaHex = {
        'Blanco': '#FFFFFF',
        'Negro': '#1E293B',
        'Azul Marino': '#1E3A8A',
        'Rojo': '#DC2626',
        'Gris Melange': '#94A3B8'
    };

    colores.forEach(color => {
        const hex = mapaHex[color] || '#CBD5E1';
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `w-8 h-8 rounded-full border-2 border-slate-300 transition-all transform hover:scale-110 focus:outline-none flex items-center justify-center shadow-sm`;
        btn.style.backgroundColor = hex;
        btn.title = color;

        btn.onclick = () => {
            document.querySelectorAll('#grid-muestras-color button').forEach(b => {
                b.classList.remove('ring-4', 'ring-blue-600', 'border-white', 'scale-110');
            });
            btn.classList.add('ring-4', 'ring-blue-600', 'border-white', 'scale-110');
            document.getElementById('color-seleccionado').value = color;
            document.getElementById('error-color').classList.add('hidden');
            calcularCotizacionActual();
        };

        grid.appendChild(btn);
    });
}


// ============================================================================
// 5. MOTOR DE CÁLCULO
// ============================================================================
function calcularCotizacionActual() {
    const prodId = document.getElementById('tipo-producto').value;
    const cantidad = parseInt(document.getElementById('cantidad').value) || 0;
    const estadoDiseno = document.getElementById('estado-diseno').value;
    const color = document.getElementById('color-seleccionado').value;

    if (!prodId || cantidad <= 0) {
        productoActualCalculado = null;
        return;
    }

    const producto = baseDeDatos.productos.find(p => p.id == prodId);
    if (!producto) return;

    // Soportar tanto precio_docena como precio_docenas de tu esquema BD
    const precioDocenaReal = producto.precio_docena || producto.precio_docenas || producto.precio_unidad;

    // Determinación de escala por volumen
    let precioUnitarioBase = Number(producto.precio_unidad);
    if (cantidad >= 100 && producto.precio_ciento) {
        precioUnitarioBase = Number(producto.precio_ciento);
    } else if (cantidad >= 24 && precioDocenaReal) {
        precioUnitarioBase = Number(precioDocenaReal);
    }

    // Sumatoria de costos extras seleccionados en opciones_adicionales
    let sumaExtrasUnitarios = 0;
    document.querySelectorAll('.select-adicional-dinamico').forEach(sel => {
        const selectedOpt = sel.options[sel.selectedIndex];
        if (selectedOpt) {
            sumaExtrasUnitarios += Number(selectedOpt.dataset.extra || 0);
        }
    });

    // Costo fijo y días por estado del diseño
    let costoDisenoFijo = 0;
    let diasExtraDiseno = 0;
    if (estadoDiseno === 'creacion') {
        costoDisenoFijo = 15.00;
        diasExtraDiseno = 2;
    } else if (estadoDiseno === 'retoque') {
        diasExtraDiseno = 1;
    }

    // Días de producción según volumen
    let diasBaseProduccion = 3;
    if (cantidad > 100) diasBaseProduccion = 6;
    else if (cantidad > 50) diasBaseProduccion = 4;

    const diasEntregaItem = diasBaseProduccion + diasExtraDiseno;
    const precioUnitarioConExtras = precioUnitarioBase + sumaExtrasUnitarios;
    const subtotalProductos = precioUnitarioConExtras * cantidad;
    const totalItem = subtotalProductos + costoDisenoFijo;
    const precioUnitarioEfectivo = totalItem / cantidad;

    const catObj = baseDeDatos.categorias.find(c => c.id == producto.categoria_id);

    productoActualCalculado = {
        id: Date.now(),
        productoId: producto.id,
        categoriaNombre: catObj ? catObj.nombre : 'General',
        productoNombre: producto.nombre,
        color: color || 'Estándar',
        cantidad: cantidad,
        precioUnitario: precioUnitarioEfectivo,
        subtotal: totalItem,
        diasEntrega: diasEntregaItem,
        estadoDisenoTexto: estadoDiseno === 'creacion' ? 'Diseño Nuevo' : (estadoDiseno === 'retoque' ? 'Retoque' : 'Listo')
    };

    renderizarPreviewCalculo(productoActualCalculado);
}

function renderizarPreviewCalculo(item) {
    const contenedor = document.getElementById('pantalla-precio');

    contenedor.innerHTML = `
        <div class="space-y-4 animate-fade-in">
            <div>
                <span class="text-xs uppercase font-bold text-slate-400 tracking-wider">${item.categoriaNombre}</span>
                <h4 class="text-xl font-black text-white leading-tight">${item.productoNombre}</h4>
                <p class="text-xs text-slate-300 mt-1">Color: <span class="text-emerald-400 font-bold">${item.color}</span> | Cantidad: ${item.cantidad} u.</p>
            </div>

            <div class="bg-slate-800/80 p-4 rounded-xl border border-slate-700 space-y-2">
                <div class="flex justify-between text-xs text-slate-300">
                    <span>Precio Unitario Promedio:</span>
                    <span class="font-bold text-white">S/ ${item.precioUnitario.toFixed(2)}</span>
                </div>
                <div class="flex justify-between text-xs text-slate-300">
                    <span>Tiempo de Producción Ítem:</span>
                    <span class="font-bold text-blue-400">${item.diasEntrega} días hábiles</span>
                </div>
                <div class="border-t border-slate-700/60 pt-2 flex justify-between items-baseline">
                    <span class="text-xs font-bold text-slate-300 uppercase">Subtotal Ítem</span>
                    <span class="text-2xl font-black text-emerald-400">S/ ${item.subtotal.toFixed(2)}</span>
                </div>
            </div>

            <button onclick="agregarItemActualAlCarrito()" 
                class="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg transition flex items-center justify-center gap-2 text-sm group">
                <svg class="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                </svg>
                Agregar a la Cotización
            </button>
        </div>
    `;
}


// ============================================================================
// 6. CÁLCULO DE FECHAS Y DÍAS HÁBILES
// ============================================================================
function calcularFechaHabil(fechaBase, diasSumar) {
    let fecha = new Date(fechaBase);

    if (fecha.getHours() >= 15) {
        fecha.setDate(fecha.getDate() + 1);
    }

    let diasAgregados = 0;
    while (diasAgregados < diasSumar) {
        fecha.setDate(fecha.getDate() + 1);
        const diaSemana = fecha.getDay();
        if (diaSemana !== 0 && diaSemana !== 6) {
            diasAgregados++;
        }
    }
    return fecha;
}


// ============================================================================
// 7. GESTIÓN DEL CARRITO MULTIPRODUCTO
// ============================================================================
function agregarItemActualAlCarrito() {
    const contColores = document.getElementById('contenedor-colores');
    const color = document.getElementById('color-seleccionado').value;

    if (!contColores.classList.contains('hidden') && !color) {
        document.getElementById('error-color').classList.remove('hidden');
        mostrarToast('Por favor selecciona un color', 'error');
        return;
    }

    if (!productoActualCalculado) {
        mostrarToast('Configura una cantidad válida primero', 'error');
        return;
    }

    cotizacionCart.push({ ...productoActualCalculado, id: Date.now() });
    
    mostrarToast(`➕ ${productoActualCalculado.productoNombre} agregado`, 'exito');
    actualizarUICarrito();
    abrirDrawerCarrito();
}

function eliminarDelCarrito(index) {
    if (index >= 0 && index < cotizacionCart.length) {
        const eliminado = cotizacionCart.splice(index, 1);
        mostrarToast(`🗑️ ${eliminado[0].productoNombre} eliminado`, 'info');
        actualizarUICarrito();
    }
}

function vaciarCarrito() {
    if (cotizacionCart.length === 0) return;
    cotizacionCart = [];
    actualizarUICarrito();
    mostrarToast('Carrito vaciado', 'info');
}

function actualizarUICarrito() {
    const badgeContador = document.getElementById('badge-contador-carrito');
    const badgeTotal = document.getElementById('badge-total-carrito');
    const subtituloDrawer = document.getElementById('drawer-subtitulo');
    const listaItems = document.getElementById('lista-items-carrito');
    const txtDiasTotales = document.getElementById('drawer-dias-totales');
    const txtFechaEntrega = document.getElementById('drawer-fecha-entrega');
    const txtMontoTotal = document.getElementById('drawer-monto-total');
    const btnVaciar = document.getElementById('btn-vaciar-carrito');
    const btnFinalizar = document.getElementById('btn-finalizar-cotizacion');

    const totalItems = cotizacionCart.length;
    const montoTotalAcumulado = cotizacionCart.reduce((sum, item) => sum + item.subtotal, 0);
    const diasTotalesAcumulados = cotizacionCart.reduce((sum, item) => sum + item.diasEntrega, 0);

    badgeContador.textContent = totalItems;
    badgeTotal.textContent = `S/ ${montoTotalAcumulado.toFixed(2)}`;
    subtituloDrawer.textContent = `${totalItems} ${totalItems === 1 ? 'producto agregado' : 'productos agregados'}`;
    txtMontoTotal.textContent = `S/ ${montoTotalAcumulado.toFixed(2)}`;
    txtDiasTotales.textContent = `${diasTotalesAcumulados} días hábiles`;

    if (totalItems > 0) {
        const fechaEntregaFinal = calcularFechaHabil(new Date(), diasTotalesAcumulados);
        txtFechaEntrega.textContent = fechaEntregaFinal.toLocaleDateString('es-PE', {
            weekday: 'long', day: 'numeric', month: 'long'
        });
        btnVaciar.classList.remove('hidden');
        btnFinalizar.disabled = false;
    } else {
        txtFechaEntrega.textContent = '--';
        btnVaciar.classList.add('hidden');
        btnFinalizar.disabled = true;
    }

    if (totalItems === 0) {
        listaItems.innerHTML = `
            <div class="text-center py-12 text-slate-500">
                <svg class="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path>
                </svg>
                <p class="text-sm font-medium">Tu cotización está vacía</p>
            </div>
        `;
        return;
    }

    listaItems.innerHTML = cotizacionCart.map((item, index) => `
        <div class="bg-slate-800/90 border border-slate-700/80 p-4 rounded-xl flex items-start justify-between gap-3 relative">
            <div class="space-y-1 pr-4">
                <span class="text-[10px] font-bold text-blue-400 uppercase tracking-wider">${item.categoriaNombre}</span>
                <h5 class="text-sm font-bold text-white leading-snug">${item.productoNombre}</h5>
                <div class="text-xs text-slate-300 space-y-0.5">
                    <p>Color: <strong class="text-slate-100">${item.color}</strong> | Qty: <strong class="text-slate-100">${item.cantidad} u.</strong></p>
                    <p class="text-[11px] text-slate-400">Diseño: ${item.estadoDisenoTexto} (${item.diasEntrega}d hábiles)</p>
                </div>
                <p class="text-sm font-extrabold text-emerald-400 pt-1">
                    S/ ${item.subtotal.toFixed(2)} 
                    <span class="text-[10px] text-slate-400 font-normal">(S/ ${item.precioUnitario.toFixed(2)} u.)</span>
                </p>
            </div>
            <button onclick="eliminarDelCarrito(${index})" title="Eliminar ítem"
                class="text-slate-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-slate-700/50 transition">
                🗑️
            </button>
        </div>
    `).join('');
}


// ============================================================================
// 8. UTILITARIOS UI
// ============================================================================
function abrirDrawerCarrito() { document.getElementById('drawer-carrito').classList.remove('hidden'); }
function cerrarDrawerCarrito() { document.getElementById('drawer-carrito').classList.add('hidden'); }

function mostrarToast(mensaje, tipo = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    const colores = {
        exito: 'bg-emerald-950/90 border-emerald-500 text-emerald-200',
        error: 'bg-red-950/90 border-red-500 text-red-200',
        info: 'bg-slate-900/90 border-slate-700 text-slate-200'
    };

    toast.className = `p-3.5 rounded-xl border ${colores[tipo] || colores.info} text-xs font-semibold shadow-2xl backdrop-blur-md transition-all duration-300 flex items-center justify-between gap-3`;
    toast.innerHTML = `<span>${mensaje}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-2');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function mostrarCargandoEnPantalla(cargando) {
    const p = document.getElementById('pantalla-precio');
    if (cargando) p.innerHTML = `<p class="text-slate-400 text-sm text-center py-8">⌛ Cargando base de datos...</p>`;
}


// ============================================================================
// 9. WHATSAPP & MODAL CLIENTE
// ============================================================================
function abrirModalWhatsApp() {
    if (cotizacionCart.length === 0) return;
    cerrarDrawerCarrito();
    document.getElementById('modal-cliente').classList.remove('hidden');
}

function cerrarModalWhatsApp() { document.getElementById('modal-cliente').classList.add('hidden'); }

function actualizarPlaceholderDoc() {
    const tipo = document.getElementById('cliente-tipo-doc').value;
    const input = document.getElementById('cliente-documento');
    if (tipo === 'dni') input.placeholder = 'Ej: 71234567';
    else if (tipo === 'ruc') input.placeholder = 'Ej: 20601234567';
    else input.placeholder = 'Ej: 001234567';
}

function validarYEnviarWhatsApp() {
    const nombre = document.getElementById('cliente-nombre').value.trim();
    const tipoDoc = document.getElementById('cliente-tipo-doc').value;
    const documento = document.getElementById('cliente-documento').value.trim();
    const telefono = document.getElementById('cliente-telefono').value.trim();
    const correo = document.getElementById('cliente-correo').value.trim();

    ['error-nombre', 'error-documento', 'error-telefono', 'error-correo'].forEach(id => {
        document.getElementById(id).classList.add('hidden');
    });

    let valido = true;

    if (nombre.length < 3) {
        document.getElementById('error-nombre').classList.remove('hidden');
        valido = false;
    }

    const regexDoc = { dni: /^\d{8}$/, ruc: /^\d{11}$/, ce: /^[a-zA-Z0-9]{8,12}$/ };
    if (!regexDoc[tipoDoc].test(documento)) {
        const errorDoc = document.getElementById('error-documento');
        errorDoc.textContent = `⚠️ Formato inválido para ${tipoDoc.toUpperCase()}.`;
        errorDoc.classList.remove('hidden');
        valido = false;
    }

    if (!/^\d{7,15}$/.test(telefono)) {
        document.getElementById('error-telefono').classList.remove('hidden');
        valido = false;
    }

    if (correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
        document.getElementById('error-correo').classList.remove('hidden');
        valido = false;
    }

    if (!valido) return;

    const montoTotal = cotizacionCart.reduce((sum, item) => sum + item.subtotal, 0);
    const diasTotales = cotizacionCart.reduce((sum, item) => sum + item.diasEntrega, 0);
    const fechaEntrega = calcularFechaHabil(new Date(), diasTotales).toLocaleDateString('es-PE', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });

    let mensaje = `📋 *NUEVA COTIZACIÓN MULTIPRODUCTO - RCS MERCHANDISING*\n`;
    mensaje += `👤 *Cliente:* ${nombre}\n`;
    mensaje += `🆔 *${tipoDoc.toUpperCase()}:* ${documento}\n`;
    mensaje += `📞 *Teléfono:* ${telefono}\n`;
    if (correo) mensaje += `✉️ *Correo:* ${correo}\n`;
    mensaje += `\n--- *DESGLOSE DE PEDIDO* ---\n\n`;

    cotizacionCart.forEach((item, i) => {
        mensaje += `📦 *ÍTEM ${i + 1}: ${item.productoNombre}*\n`;
        mensaje += `• Categoría: ${item.categoriaNombre}\n`;
        mensaje += `• Color: ${item.color} | Cantidad: ${item.cantidad} u.\n`;
        mensaje += `• Estado Diseño: ${item.estadoDisenoTexto}\n`;
        mensaje += `• Unitario: S/ ${item.precioUnitario.toFixed(2)} | Subtotal: S/ ${item.subtotal.toFixed(2)}\n`;
        mensaje += `• Tiempo Ítem: ${item.diasEntrega} días hábiles\n\n`;
    });

    mensaje += `-----------------------------------\n`;
    mensaje += `💰 *GRAN TOTAL:* S/ ${montoTotal.toFixed(2)}\n`;
    mensaje += `⏱️ *Tiempo Total Producción (Secuencial):* ${diasTotales} días hábiles\n`;
    mensaje += `📅 *Fecha Estimada Entrega:* ${fechaEntrega}\n`;

    const numeroWhatsApp = '51959562867';
    const url = `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(mensaje)}`;
    
    window.open(url, '_blank');
    cerrarModalWhatsApp();
}
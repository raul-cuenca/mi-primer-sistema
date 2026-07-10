// 1. Buscamos el formulario en la página y lo guardamos en una variable
const formulario = document.querySelector('form');

// 2. Le decimos al formulario que escuche cuando alguien intente enviarlo (submit)
formulario.addEventListener('submit', function (event) {

    // 3. ¡EL TRUCO MAESTRO!: Detenemos el parpadeo y la recarga por defecto
    event.preventDefault();

    // 4. Capturamos el valor que el usuario escribió en la caja de texto
    const nombreIngresado = document.getElementById('nombre').value;

    // 5. Si el usuario no escribió nada, le mandamos una alerta
    if (nombreIngresado.trim() === "") {
        alert("Por favor, escribe un nombre antes de enviar.");
        return;
    }

    // 6. Si sí escribió, cambiamos el texto del saludo dinámicamente
    const titulo = document.querySelector('h1');
    titulo.innerText = `¡Bienvenido al sistema, ${nombreIngresado}!`;

    // 7. Limpiamos la caja de texto para que quede lista otra vez
    document.getElementById('nombre').value = "";
});
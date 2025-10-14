// Función que se llama cuando el reCAPTCHA se completa
function onSubmit(token) {
    handleSubmitForm(token);
}
// Manejar el envío del formulario
function handleSubmitForm(token) {
    // Prevenir el comportamiento por defecto del formulario
    event.preventDefault();
    // Obtener los valores de los campos del formulario
    const name = document.getElementById('mce-FNAME').value;
    const email = document.getElementById('mce-EMAIL').value;
    const phone = document.getElementById('mce-PHONE').value;  
    const estado = document.getElementById('mce-SELECSTADO').value;
    const requiere = document.getElementById('mce-REQUIERE').value;
    const equipo = document.getElementById('mce-EQUIPO').value;
    const asesoria = document.getElementById('mce-ASESORIA').value;
    const tipo = document.getElementById('mce-TIPO').value;
    const aditamento = document.getElementById('mce-ADITAMIENT').value;
    const mensaje = document.getElementById('mce-MENSAJE').value;
    const puesto = document.getElementById('mce-PUESTOEMP').value;
    // Validar que todos los campos requeridos tengan información
    if (!name || !email || !phone || !estado || !requiere || !equipo || !asesoria || !tipo || !aditamento || !mensaje || !puesto) {
        console.error('Por favor completa todos los campos requeridos.');
        alert('Por favor, completa todos los campos antes de enviar el formulario.');
        return; // Detener el envío si falta información
    }
    // URL de Google Apps Script
    const googleSheetsUrl = 'https://script.google.com/macros/s/AKfycbz1HRm1kAGcvo4yf-otJigWtdFKgpjOySilBZ4UYLtepUBMxa-2pJrTs5YdlADkcMCJ3A/exec';
    // Enviar los datos a Google Sheets
    fetch(googleSheetsUrl, {
        method: 'POST',
        body: new URLSearchParams({
            name: name,
            email: email,
            phone: phone,  
            puesto: puesto,
            estado: estado,
            requiere: requiere,
            equipo: equipo,
            asesoria: asesoria,
            tipo: tipo,
            aditamento: aditamento,
            mensaje: mensaje,
        }),
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
    })
        .then((response) => {
            if (!response.ok) {
                console.error('Error al enviar a Google Sheets:', response.statusText);
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.text();
        })
        .then((data) => {
            console.log('Respuesta de Google Sheets:', data);
            // Enviar formulario a Mailchimp después de confirmar que Google Sheets recibió los datos
            const form = document.getElementById('mc-embedded-subscribe-form');
            fetch(form.action, {
                method: 'POST',
                body: new FormData(form),
                mode: 'no-cors',
            })
                .then(() => {
                    window.location.href = 'https://www.xilinslp.com.mx/gracias-renta-montacarga';
                })
                .catch((error) => {
                    console.error('Error al enviar a Mailchimp:', error);
                    alert('Hubo un problema al enviar tu suscripción. Por favor, inténtalo de nuevo.');
                });
        })
        .catch((error) => {
            console.error('Error en la solicitud a Google Sheets:', error);
        });
}
// Manejar el envío del formulario con reCAPTCHA
document.getElementById('mc-embedded-subscribe-form').addEventListener('submit', function (event) {
    event.preventDefault();
    grecaptcha.ready(function () {
        grecaptcha.execute('6LetH4sqAAAAADUkfe67jIEvLkRU0qcvaU2Vhe81', { action: 'submit' })
            .then(function (token) {
                handleSubmitForm(token);
            });
    });
});

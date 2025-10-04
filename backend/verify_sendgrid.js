require('dotenv').config({ path: './.env' });
const sgMail = require('@sendgrid/mail');

if (!process.env.SENDGRID_API_KEY) {
  console.error('Error: La variable de entorno SENDGRID_API_KEY no está definida.');
  process.exit(1);
}

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const msg = {
  to: 'danielmarcelrivera@gmail.com',
  from: 'daniieeru@gmail.com',
  subject: 'Prueba de Integración de SendGrid',
  text: 'Este es un correo de prueba para verificar que la integración con SendGrid funciona.',
  html: '<strong>Este es un correo de prueba para verificar que la integración con SendGrid funciona.</strong>',
};

console.log('Enviando correo de prueba a danielmarcelrivera@gmail.com...');

sgMail.send(msg)
  .then(() => {
    console.log('¡Correo de prueba enviado con éxito!');
  })
  .catch((error) => {
    console.error('Hubo un error al enviar el correo:');
    if (error.response) {
      console.error(error.response.body);
    } else {
      console.error(error);
    }
  });
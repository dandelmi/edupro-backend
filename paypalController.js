// paypalController.js
// Configuración segura de PayPal en Node.js + Express

const express = require('express');
const router = express.Router();
const axios = require('axios');

const PAYPAL_API = 'https://api-m.sandbox.paypal.com'; // Cambia a producción luego

async function getAccessToken() {
    const auth = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_SECRET}`).toString('base64');
    const response = await axios.post(`${PAYPAL_API}/v1/oauth2/token`, 'grant_type=client_credentials', {
        headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    });
    return response.data.access_token;
}

router.post('/verify-payment', async (req, res) => {
    const { orderID, profesorId, cantidadAsignaturas } = req.body;
    try {
        const accessToken = await getAccessToken();
        const response = await axios.get(`${PAYPAL_API}/v2/checkout/orders/${orderID}`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (response.data.status === 'COMPLETED') {
            // Aquí debes guardar en tu DB que el pago fue completado con profesorId y cantidadAsignaturas
            console.log(`Pago confirmado para profesor ${profesorId}, asignaturas: ${cantidadAsignaturas}`);
            return res.json({ success: true, message: 'Pago verificado correctamente.' });
        } else {
            return res.status(400).json({ success: false, message: 'El pago no está completado.' });
        }
    } catch (error) {
        console.error('Error verificando pago PayPal:', error.response?.data || error);
        return res.status(500).json({ success: false, message: 'Error al verificar el pago.' });
    }
});

module.exports = router;

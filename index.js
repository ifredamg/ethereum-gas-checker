require('dotenv').config();
const axios = require('axios');
const nodemailer = require('nodemailer');
const cron = require('node-cron');
const intervalInMinutes = 60;

async function getGasPrice() {
    try {
        const response = await axios.get(`https://api.etherscan.io/api?module=gastracker&action=gasoracle&apikey=${process.env.ETHERSCAN_API_KEY}`);
        const gasPrice = response.data.result.ProposeGasPrice;
        return gasPrice;
    } catch (error) {
        console.error('Error when searching for gas cost:', error);
        throw error;
    }
}

function createEmailTransport() {
    return nodemailer.createTransport({
        service: 'gmail', 
        auth: {
            user: process.env.EMAIL_ORIGEM_ENDERECO,
            pass: process.env.EMAIL_ORIGEM_PASSWORD
        }
    });
}

async function sendGasPriceEmail(gasPrice) {
    console.log(process.env.EMAIL_ORIGEM_PASSWORD);
    
    let transporter = createEmailTransport();

    let mailOptions = {
        from: process.env.EMAIL_ORIGEM_ENDERECO,
        to: process.env.EMAIL_DESTINO_ENDERECO,
        subject: 'Gas Cost on the Ethereum Network',
        text: `The current cost of gas on the Ethereum network is ${gasPrice} Gwei.`
    };

    try {
        let info = await transporter.sendMail(mailOptions);
        console.log('Email sent: ' + info.response);
    } catch (error) {
        console.error('Error sending the e-mail:', error);
    }
}

async function sendServiceStartEmail() {
    console.log("The service started successfully!");
    
    let transporter = createEmailTransport();

    let mailOptions = {
        from: process.env.EMAIL_ORIGEM_ENDERECO,
        to: process.env.EMAIL_DESTINO_ENDERECO,
        subject: 'The \'Ethereum Gas Price Checker\' service has been started successfully!',
        text: `You should receive emails with the price of gas on the ethereum network every 60 minutes.`
    };

    try {
        let info = await transporter.sendMail(mailOptions);
        console.log('Email sent: ' + info.response);
    } catch (error) {
        console.error('Error sending the e-mail:', error);
    }
}

async function checkGasPriceAndSendEmail() {
    try {
        const gasPrice = await getGasPrice();
        await sendGasPriceEmail(gasPrice);
    } catch (error) {
        console.error('Error in main process:', error);
    }
}

sendServiceStartEmail();
cron.schedule(`*/${intervalInMinutes} * * * *`, () => {
    console.log('Checking gas cost and sending email...');
    checkGasPriceAndSendEmail();
});

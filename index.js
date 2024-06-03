require('dotenv').config();
const axios = require('axios');
const nodemailer = require('nodemailer');
const cron = require('node-cron');
const canISendServiceStartEmail = true;
const intervalInMinutes = 5;

const configRatings = [
    {
        code: "LOW",
        emailSubject: "The cost of gas on the Ethereum network is low!",
        maxPrice: 10,
        sendEmail: true
    },
    {
        code: "MEDIUM",
        emailSubject: "The cost of gas on the Ethereum network is medium!",
        minPrice: 10,
        maxPrice: 20,
        sendEmail: true
    },
    {
        code: "HIGHT",
        emailSubject: "The cost of gas on the Ethereum network is high!",
        minPrice: 20,
        maxPrice: 30,
        sendEmail: true
    },
    {
        code: "SUPER_HIGH",
        emailSubject: "The cost of gas on the Ethereum network is insane!",
        minPrice: 30,
        sendEmail: true
    },
];

let currentRatingCode = "";

async function getGasPrice() {
    try {
        logInfo('Checking gas cost...');
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

function getConfigRating(gasPrice) {
    return configRatings.find(config => {
        return (config.minPrice === undefined || gasPrice >= config.minPrice) &&
            (config.maxPrice === undefined || gasPrice < config.maxPrice);
    });
}

async function sendGasPriceEmail(gasPrice) {
    let transporter = createEmailTransport();
    let configRating = getConfigRating(gasPrice);

    let emailBody = `The current cost of gas on the Ethereum network is ${gasPrice} Gwei.`;

    let mailOptions = {
        from: process.env.EMAIL_ORIGEM_ENDERECO,
        to: process.env.EMAIL_DESTINO_ENDERECO,
        subject: configRating.emailSubject,
        text: emailBody
    };

    if (configRating.sendEmail && currentRatingCode !== configRating.code) {
        try {
            let info = await transporter.sendMail(mailOptions);
            logInfo('Email sent: ' + info.response);
            logInfo(`${configRating.emailSubject} | ${gasPrice} Gwei.`);
        } catch (error) {
            console.error('Error sending the e-mail:', error);
        }
    }
    else
    {
        logInfo(`The email was skipped -> ${emailBody}`);
    }

    currentRatingCode = configRating.code;
    console.log("currentRatingCode: " + currentRatingCode);
}

async function sendServiceStartEmail() {
    logInfo("The service started successfully!");

    if(!canISendServiceStartEmail)
        return;
    let transporter = createEmailTransport();

    let mailOptions = {
        from: process.env.EMAIL_ORIGEM_ENDERECO,
        to: process.env.EMAIL_DESTINO_ENDERECO,
        subject: 'The \'Ethereum Gas Price Checker\' service has been started successfully!',
        text: `You should receive emails with the price of gas on the ethereum network when price level changes.`
    };

    try {
        let info = await transporter.sendMail(mailOptions);
        logInfo('Email sent: ' + info.response);
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

function logInfo(info) {
    console.log(`[${getCurrentDateTime()}] ${info}`);
}

function getCurrentDateTime() {
    const now = new Date();
    
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0'); // Adiciona 1 porque os meses são indexados em 0
    const day = String(now.getDate()).padStart(2, '0');
    
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
}

sendServiceStartEmail();
checkGasPriceAndSendEmail();

cron.schedule(`*/${intervalInMinutes} * * * *`, () => {
    checkGasPriceAndSendEmail();
});

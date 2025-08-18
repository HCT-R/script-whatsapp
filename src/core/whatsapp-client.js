const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const logger = require('../utils/logger');

class WhatsAppClient {
    constructor() {
        this.client = new Client({
            authStrategy: new LocalAuth(),
            puppeteer: {
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            }
        });
        
        this.isReady = false;
        this.setupEventHandlers();
    }

    setupEventHandlers() {
        // Events will be handled by the web server
        this.client.on('qr', (qr) => {
            logger.info('QR Code received');
            this.qrCode = qr;
        });

        this.client.on('ready', () => {
            logger.info('WhatsApp client is ready!');
            this.isReady = true;
        });

        this.client.on('authenticated', () => {
            logger.info('WhatsApp client authenticated');
        });

        this.client.on('auth_failure', (msg) => {
            logger.error('WhatsApp authentication failed:', msg);
        });

        this.client.on('disconnected', (reason) => {
            logger.warn('WhatsApp client disconnected:', reason);
            this.isReady = false;
        });
    }

    async initialize() {
        try {
            await this.client.initialize();
            return true;
        } catch (error) {
            logger.error('Failed to initialize WhatsApp client:', error);
            return false;
        }
    }

    async sendMessage(phoneNumber, message, attachmentPath = null) {
        if (!this.isReady) {
            throw new Error('WhatsApp client is not ready');
        }

        try {
            const formattedPhone = this.formatPhoneNumber(phoneNumber);
            const chat = await this.client.getChatById(formattedPhone);
            
            if (attachmentPath && attachmentPath.trim()) {
                // Проверяем существование файла
                const fs = require('fs');
                if (!fs.existsSync(attachmentPath)) {
                    logger.error(`Файл вложения не найден: ${attachmentPath}`);
                    throw new Error(`Файл вложения не найден: ${attachmentPath}`);
                }
                
                logger.info(`Отправляю сообщение с вложением: ${attachmentPath}`);
                const media = MessageMedia.fromFilePath(attachmentPath);
                await chat.sendMessage(media, { caption: message });
                logger.info(`Сообщение с вложением отправлено на ${formattedPhone}`);
            } else {
                await chat.sendMessage(message);
                logger.info(`Сообщение отправлено на ${formattedPhone}`);
            }
            
            return true;
        } catch (error) {
            logger.error(`Ошибка отправки сообщения на ${phoneNumber}:`, error);
            return false;
        }
    }

    formatPhoneNumber(phone) {
        let formatted = phone.toString().replace(/\D/g, '');
        
        if (formatted.startsWith('8')) {
            formatted = '7' + formatted.substring(1);
        } else if (formatted.startsWith('9') && formatted.length === 10) {
            formatted = '7' + formatted;
        }
        
        return formatted + '@c.us';
    }

    async close() {
        try {
            await this.client.destroy();
            logger.info('WhatsApp client closed');
        } catch (error) {
            logger.error('Error closing WhatsApp client:', error);
        }
    }
}

module.exports = WhatsAppClient;

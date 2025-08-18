const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const WhatsAppClient = require('./src/core/whatsapp-client');
const logger = require('./src/utils/logger');

const app = express();
const PORT = process.env.PORT || 3000;

// Multer configuration for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = './uploads';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

// Upload for phone numbers (restricted types)
const uploadNumbers = multer({ 
    storage: storage,
    fileFilter: function (req, file, cb) {
        const allowedTypes = [
            'text/plain',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/msword',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ];
        
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Неподдерживаемый тип файла. Разрешены: .txt, .doc, .docx, .xls, .xlsx'));
        }
    }
});

// Upload for attachments (all supported types)
const uploadAttachment = multer({ 
    storage: storage,
    fileFilter: function (req, file, cb) {
        const supportedTypes = [
            'image/jpeg', 'image/png', 'image/gif', 'image/webp',
            'video/mp4', 'video/avi', 'video/mov', 'video/wmv',
            'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a',
            'application/pdf', 'application/msword', 
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/plain'
        ];
        
        if (supportedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Неподдерживаемый тип файла для WhatsApp'));
        }
    }
});

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// WhatsApp client instance
let whatsappClient = null;
let isInitialized = false;
let isMassSending = false;
let isTestSending = false;

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Initialize WhatsApp client
app.post('/api/init', async (req, res) => {
    try {
        if (isInitialized) {
            return res.json({ success: true, message: 'WhatsApp уже инициализирован' });
        }

        whatsappClient = new WhatsAppClient();
        
        // Set up event handlers
        whatsappClient.client.on('qr', (qr) => {
            logger.info('QR Code received');
            whatsappClient.qrCode = qr;
            isInitialized = true;
            
            // Выводим QR код в терминал
            console.log('\n' + '='.repeat(50));
            console.log('📱 QR КОД ДЛЯ ПОДКЛЮЧЕНИЯ WHATSAPP');
            console.log('='.repeat(50));
            console.log('Отсканируйте этот QR код в WhatsApp:');
            console.log('');
            
            // Используем qrcode-terminal для отображения QR кода
            try {
                const qrcode = require('qrcode-terminal');
                qrcode.generate(qr, { small: true });
            } catch (error) {
                console.log('QR код (текст):', qr);
                console.log('Установите qrcode-terminal: npm install qrcode-terminal');
            }
            
            console.log('');
            console.log('='.repeat(50));
            console.log('После сканирования QR кода, клиент автоматически подключится');
            console.log('='.repeat(50) + '\n');
        });

        whatsappClient.client.on('ready', () => {
            logger.info('WhatsApp client is ready');
            whatsappClient.isReady = true;
        });

        whatsappClient.client.on('authenticated', () => {
            logger.info('WhatsApp client authenticated');
        });

        whatsappClient.client.on('auth_failure', (msg) => {
            logger.error('WhatsApp authentication failed:', msg);
            isInitialized = false;
        });

        whatsappClient.client.on('disconnected', (reason) => {
            logger.warn('WhatsApp client disconnected:', reason);
            whatsappClient.isReady = false;
            isInitialized = false;
        });

        const initialized = await whatsappClient.initialize();
        
        if (initialized) {
            isInitialized = true;
            res.json({ success: true, message: 'WhatsApp клиент инициализирован. Ожидание QR кода...' });
        } else {
            res.json({ success: false, message: 'Ошибка инициализации WhatsApp' });
        }
    } catch (error) {
        logger.error('Ошибка инициализации:', error);
        res.json({ success: false, message: 'Ошибка: ' + error.message });
    }
});

// Get QR code
app.get('/api/qr', (req, res) => {
    if (!whatsappClient || !whatsappClient.qrCode) {
        return res.json({ success: false, message: 'QR код не готов' });
    }
    res.json({ success: true, qrCode: whatsappClient.qrCode });
});

// Upload file with phone numbers
app.post('/api/upload-numbers', uploadNumbers.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.json({ success: false, message: 'Файл не загружен' });
        }

        const filePath = req.file.path;
        const fileType = req.file.mimetype;
        let phoneNumbers = [];

        try {
            if (fileType === 'text/plain') {
                // Read .txt file
                const content = fs.readFileSync(filePath, 'utf8');
                phoneNumbers = content.split('\n')
                    .map(line => line.trim())
                    .filter(line => line && !line.startsWith('#') && line.length > 0);
            } else if (fileType.includes('excel') || fileType.includes('spreadsheet')) {
                // Read Excel file
                const XLSX = require('xlsx');
                const workbook = XLSX.readFile(filePath);
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const data = XLSX.utils.sheet_to_json(worksheet);
                
                // Extract phone numbers from first column
                phoneNumbers = data.map(row => {
                    const firstValue = Object.values(row)[0];
                    return firstValue ? firstValue.toString().trim() : '';
                }).filter(phone => phone && phone.length > 0);
            } else if (fileType.includes('word')) {
                // Use mammoth to extract text from Word documents
                try {
                    const mammoth = require('mammoth');
                    const result = await mammoth.extractRawText({ path: filePath });
                    const content = result.value;
                    
                    // Extract phone numbers using regex
                    const phoneRegex = /(\+?7|8)?[\s\-\(]?(\d{3})[\s\-\)]?(\d{3})[\s\-]?(\d{2})[\s\-]?(\d{2})/g;
                    const matches = content.match(phoneRegex);
                    phoneNumbers = matches ? matches.map(match => match.replace(/\D/g, '')) : [];
                } catch (mammothError) {
                    logger.error('Ошибка парсинга Word документа:', mammothError);
                    // Fallback to regex on raw file
                    const content = fs.readFileSync(filePath, 'utf8');
                    const phoneRegex = /(\+?7|8)?[\s\-\(]?(\d{3})[\s\-\)]?(\d{3})[\s\-]?(\d{2})[\s\-]?(\d{2})/g;
                    const matches = content.match(phoneRegex);
                    phoneNumbers = matches ? matches.map(match => match.replace(/\D/g, '')) : [];
                }
            }

            // Clean up uploaded file
            fs.unlinkSync(filePath);

            if (phoneNumbers.length === 0) {
                return res.json({ success: false, message: 'Не удалось извлечь номера телефонов из файла' });
            }

            res.json({ 
                success: true, 
                message: `Извлечено ${phoneNumbers.length} номеров телефонов`,
                phoneNumbers: phoneNumbers
            });

        } catch (parseError) {
            // Clean up file on error
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
            throw parseError;
        }

    } catch (error) {
        logger.error('Ошибка загрузки файла:', error);
        res.json({ success: false, message: 'Ошибка обработки файла: ' + error.message });
    }
});

// Check WhatsApp status
app.get('/api/status', (req, res) => {
    if (!whatsappClient) {
        return res.json({ 
            initialized: false, 
            ready: false, 
            message: 'WhatsApp клиент не инициализирован' 
        });
    }

    res.json({
        initialized: isInitialized,
        ready: whatsappClient.isReady,
        message: whatsappClient.isReady ? 'Готов к отправке' : 'Ожидание готовности'
    });
});

// Send test message to specific number
app.post('/api/send-test', async (req, res) => {
    try {
        const { phoneNumber, message, attachmentPath } = req.body;
        
        if (!isInitialized || !whatsappClient) {
            return res.json({ success: false, message: 'WhatsApp клиент не инициализирован' });
        }

        if (!whatsappClient.isReady) {
            return res.json({ success: false, message: 'WhatsApp клиент не готов' });
        }

        if (!phoneNumber) {
            return res.json({ success: false, message: 'Номер телефона не указан' });
        }

        const testMessage = message || '🎉 Тестовое сообщение! Это проверка системы рассылки.';
        
        let success;
        if (attachmentPath && attachmentPath.trim()) {
            logger.info(`Отправляю тестовое сообщение с вложением: ${attachmentPath}`);
            success = await whatsappClient.sendMessage(phoneNumber, testMessage, attachmentPath);
        } else {
            logger.info('Отправляю тестовое сообщение без вложения');
            success = await whatsappClient.sendMessage(phoneNumber, testMessage);
        }
        
        if (success) {
            res.json({ success: true, message: `Сообщение отправлено на ${phoneNumber}` });
        } else {
            res.json({ success: false, message: 'Ошибка отправки сообщения' });
        }
    } catch (error) {
        logger.error('Ошибка отправки тестового сообщения:', error);
        res.json({ success: false, message: 'Ошибка: ' + error.message });
    }
});

// Send mass message
app.post('/api/send-mass', async (req, res) => {
    try {
        const { phoneNumbers, message, delay, maxMessages, attachmentPath } = req.body;
        
        if (!isInitialized || !whatsappClient) {
            return res.json({ success: false, message: 'WhatsApp клиент не инициализирован' });
        }

        if (!whatsappClient.isReady) {
            return res.json({ success: false, message: 'WhatsApp клиент не готов' });
        }

        if (!phoneNumbers || !Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
            return res.json({ success: false, message: 'Список номеров пуст' });
        }

        const messageText = message || '🎉 Массовое сообщение! Это тест системы рассылки.';
        const delayMs = parseInt(delay) || 5000;
        const messagesPerNumber = parseInt(maxMessages) || 1; // Количество сообщений на каждый номер
        
        let sentCount = 0;
        let failedCount = 0;
        let totalMessagesSent = 0;

        // Устанавливаем флаг начала рассылки
        isMassSending = true;

        // Отправляем сообщения на каждый номер
        for (let i = 0; i < phoneNumbers.length; i++) {
            // Проверяем, не была ли остановлена рассылка
            if (!isMassSending) {
                logger.info('Массовая рассылка остановлена пользователем');
                break;
            }
            
            const phoneNumber = phoneNumbers[i];
            
            // Отправляем указанное количество сообщений на этот номер
            for (let j = 0; j < messagesPerNumber; j++) {
                // Проверяем, не была ли остановлена рассылка
                if (!isMassSending) {
                    logger.info('Массовая рассылка остановлена пользователем');
                    break;
                }
                
                try {
                    let success;
                    if (attachmentPath && attachmentPath.trim()) {
                        logger.info(`Отправляю сообщение ${j + 1}/${messagesPerNumber} с вложением: ${attachmentPath} на ${phoneNumber}`);
                        success = await whatsappClient.sendMessage(phoneNumber, messageText, attachmentPath);
                    } else {
                        logger.info(`Отправляю сообщение ${j + 1}/${messagesPerNumber} без вложения на ${phoneNumber}`);
                        success = await whatsappClient.sendMessage(phoneNumber, messageText);
                    }
                    
                    if (success) {
                        sentCount++;
                        totalMessagesSent++;
                    } else {
                        failedCount++;
                    }
                } catch (error) {
                    failedCount++;
                    logger.error(`Ошибка отправки сообщения ${j + 1}/${messagesPerNumber} на ${phoneNumber}:`, error);
                }

                // Задержка между сообщениями на один номер (если отправляем несколько)
                if (j < messagesPerNumber - 1 && isMassSending) {
                    await new Promise(resolve => setTimeout(resolve, delayMs));
                }
            }

            // Задержка между номерами
            if (i < phoneNumbers.length - 1 && isMassSending) {
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        }

        // Сбрасываем флаг рассылки
        isMassSending = false;

        res.json({ 
            success: true, 
            message: `Массовая рассылка завершена. Отправлено: ${totalMessagesSent} сообщений, Ошибок: ${failedCount}, Номеров: ${phoneNumbers.length}, Сообщений на номер: ${messagesPerNumber}`,
            stats: { 
                messagesSent: totalMessagesSent, 
                failed: failedCount, 
                phoneNumbers: phoneNumbers.length, 
                messagesPerNumber: messagesPerNumber 
            }
        });
    } catch (error) {
        logger.error('Ошибка массовой рассылки:', error);
        res.json({ success: false, message: 'Ошибка: ' + error.message });
    }
});

// Upload attachment file
app.post('/api/upload-attachment', uploadAttachment.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.json({ success: false, message: 'Файл не загружен' });
        }

        const filePath = req.file.path;
        const fileName = req.file.originalname;
        const fileSize = req.file.size;
        const fileType = req.file.mimetype;

        // Check file size (WhatsApp limit is 16MB)
        const maxSize = 16 * 1024 * 1024; // 16MB
        if (fileSize > maxSize) {
            // Clean up file
            fs.unlinkSync(filePath);
            return res.json({ success: false, message: 'Файл слишком большой. Максимальный размер: 16MB' });
        }

        // Check if file type is supported by WhatsApp
        const supportedTypes = [
            'image/jpeg', 'image/png', 'image/gif', 'image/webp',
            'video/mp4', 'video/avi', 'video/mov', 'video/wmv',
            'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a',
            'application/pdf', 'application/msword', 
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/plain'
        ];

        if (!supportedTypes.includes(fileType)) {
            // Clean up file
            fs.unlinkSync(filePath);
            return res.json({ success: false, message: 'Неподдерживаемый тип файла для WhatsApp' });
        }

        logger.info(`Вложение загружено: ${fileName}, путь: ${filePath}, размер: ${fileSize} байт, тип: ${fileType}`);
        
        res.json({ 
            success: true, 
            message: `Файл "${fileName}" загружен успешно`,
            filePath: filePath,
            fileName: fileName,
            fileSize: fileSize,
            fileType: fileType
        });

    } catch (error) {
        logger.error('Ошибка загрузки вложения:', error);
        res.json({ success: false, message: 'Ошибка загрузки файла: ' + error.message });
    }
});

// Stop mass sending
app.post('/api/stop-mass', (req, res) => {
    try {
        isMassSending = false;
        res.json({ success: true, message: 'Массовая рассылка остановлена' });
    } catch (error) {
        logger.error('Ошибка остановки рассылки:', error);
        res.json({ success: false, message: 'Ошибка остановки рассылки' });
    }
});

// Stop test sending
app.post('/api/stop-test', (req, res) => {
    try {
        isTestSending = false;
        res.json({ success: true, message: 'Тестовая отправка остановлена' });
    } catch (error) {
        logger.error('Ошибка остановки теста:', error);
        res.json({ success: false, message: 'Ошибка остановки теста' });
    }
});

// Close WhatsApp client
app.post('/api/close', async (req, res) => {
    try {
        if (whatsappClient) {
            await whatsappClient.close();
            whatsappClient = null;
            isInitialized = false;
            res.json({ success: true, message: 'WhatsApp клиент закрыт' });
        } else {
            res.json({ success: false, message: 'WhatsApp клиент не был инициализирован' });
        }
    } catch (error) {
        logger.error('Ошибка закрытия клиента:', error);
        res.json({ success: false, message: 'Ошибка: ' + error.message });
    }
});

// Start server
app.listen(PORT, () => {
    logger.info(`🚀 Веб-сервер запущен на порту ${PORT}`);
    logger.info(`📱 Откройте http://localhost:${PORT} в браузере`);
});

module.exports = app;

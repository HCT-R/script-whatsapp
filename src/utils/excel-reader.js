const XLSX = require('xlsx');
const path = require('path');
const logger = require('./logger');

class ExcelReader {
    constructor(filePath) {
        this.filePath = filePath;
        this.workbook = null;
        this.worksheet = null;
    }

    readFile() {
        try {
            if (!this.filePath) {
                throw new Error('File path is required');
            }

            const absolutePath = path.resolve(this.filePath);
            logger.info(`Reading Excel file: ${absolutePath}`);

            this.workbook = XLSX.readFile(absolutePath);
            const sheetName = this.workbook.SheetNames[0];
            this.worksheet = this.workbook.Sheets[sheetName];

            if (!this.worksheet) {
                throw new Error('No worksheet found in Excel file');
            }

            logger.info(`Successfully read Excel file with sheet: ${sheetName}`);
            return true;
        } catch (error) {
            logger.error('Failed to read Excel file:', error);
            return false;
        }
    }

    getData() {
        if (!this.worksheet) {
            logger.error('No worksheet loaded. Call readFile() first.');
            return [];
        }

        try {
            const jsonData = XLSX.utils.sheet_to_json(this.worksheet, { header: 1 });
            
            if (jsonData.length < 2) {
                logger.warn('Excel file contains no data or only headers');
                return [];
            }

            const headers = jsonData[0];
            const data = jsonData.slice(1);

            // Find required columns
            const phoneIndex = this.findColumnIndex(headers, ['phone', 'телефон', 'phone_number', 'номер']);
            const nameIndex = this.findColumnIndex(headers, ['name', 'имя', 'full_name', 'fullname']);
            const emailIndex = this.findColumnIndex(headers, ['email', 'почта', 'e-mail']);
            const grantIndex = this.findColumnIndex(headers, ['grant', 'грант', 'amount', 'сумма', 'grant_amount']);

            if (phoneIndex === -1) {
                throw new Error('Phone column not found. Required columns: phone, телефон, phone_number, номер');
            }

            const contacts = data.map((row, index) => {
                const contact = {
                    id: index + 1,
                    phone: row[phoneIndex] ? row[phoneIndex].toString() : '',
                    name: nameIndex !== -1 ? (row[nameIndex] || '') : '',
                    email: emailIndex !== -1 ? (row[emailIndex] || '') : '',
                    grantAmount: grantIndex !== -1 ? (row[grantIndex] || '') : ''
                };

                // Validate phone number
                if (!this.isValidPhone(contact.phone)) {
                    logger.warn(`Invalid phone number at row ${index + 2}: ${contact.phone}`);
                }

                return contact;
            }).filter(contact => contact.phone && this.isValidPhone(contact.phone));

            logger.info(`Processed ${contacts.length} valid contacts from Excel file`);
            return contacts;

        } catch (error) {
            logger.error('Failed to process Excel data:', error);
            return [];
        }
    }

    findColumnIndex(headers, possibleNames) {
        for (let i = 0; i < headers.length; i++) {
            const header = headers[i].toString().toLowerCase().trim();
            if (possibleNames.some(name => header.includes(name.toLowerCase()))) {
                return i;
            }
        }
        return -1;
    }

    isValidPhone(phone) {
        if (!phone) return false;
        
        const cleanPhone = phone.toString().replace(/\D/g, '');
        
        // Check if it's a valid Russian phone number
        if (cleanPhone.startsWith('7') && cleanPhone.length === 11) return true;
        if (cleanPhone.startsWith('8') && cleanPhone.length === 11) return true;
        if (cleanPhone.startsWith('9') && cleanPhone.length === 10) return true;
        
        return false;
    }

    getHeaders() {
        if (!this.worksheet) {
            return [];
        }

        try {
            const jsonData = XLSX.utils.sheet_to_json(this.worksheet, { header: 1 });
            return jsonData.length > 0 ? jsonData[0] : [];
        } catch (error) {
            logger.error('Failed to get headers:', error);
            return [];
        }
    }

    getRowCount() {
        if (!this.worksheet) {
            return 0;
        }

        try {
            const jsonData = XLSX.utils.sheet_to_json(this.worksheet, { header: 1 });
            return Math.max(0, jsonData.length - 1); // Exclude header row
        } catch (error) {
            logger.error('Failed to get row count:', error);
            return 0;
        }
    }
}

module.exports = ExcelReader;

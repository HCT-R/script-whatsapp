# 📱 WhatsApp Web Messenger

Modern WhatsApp messaging system with web interface and QR code authentication.

## 🚀 Features

### ✨ Core Functions
- **Web Interface** - modern and intuitive user interface
- **QR Code Authentication** - secure WhatsApp connection
- **Test Messages** - send to single number for verification
- **Mass Messaging** - send to multiple numbers with configurable delays
- **File Upload** - support for .txt, .doc, .docx, .xls, .xlsx
- **Statistics** - real-time monitoring of sent messages

### 🎯 Message Types
1. **Test** - no delays for system verification
2. **Personal** - to one specific number
3. **Mass** - to multiple numbers with configurable delays

## 🛠️ Installation

### Prerequisites
- Node.js 16+
- npm or yarn
- Modern browser

### Step 1: Clone Repository
```bash
git clone <repository-url>
cd whatsapp-web-messenger
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Environment Setup
Create `.env` file based on `config.example.env`:
```env
DELAY_BETWEEN_MESSAGES=5000
EXCEL_FILE_PATH=./phone_numbers.xlsx
LOG_LEVEL=info
PUPPETEER_HEADLESS=true
PUPPETEER_NO_SANDBOX=true
```

## 🚀 Running

### Start Web Server
```bash
npm run web
```

### Development Mode
```bash
npm run web:dev
```

### Change Port
```bash
PORT=8080 npm run web
```

## 📱 Usage

### 1. WhatsApp Initialization
1. Open `http://localhost:3000` in browser
2. Click **"🚀 Initialize WhatsApp"**
3. Go to **"📱 QR Code"** tab
4. Scan QR code with your WhatsApp

### 2. Send Test Message
1. Go to **"🧪 Test Message"** tab
2. Enter phone number
3. Configure message text
4. Click **"📤 Send Test Message"**

### 3. Mass Messaging
1. Go to **"📢 Mass Messaging"** tab
2. Upload file with numbers or enter manually
3. Configure message text and delay
4. Click **"📤 Start Mass Messaging"**

### 4. Upload Files with Numbers
- **.txt** - one number per line
- **.doc/.docx** - Word documents
- **.xls/.xlsx** - Excel spreadsheets

## 🔧 Configuration

### Environment Variables
| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Web server port | `3000` |
| `DELAY_BETWEEN_MESSAGES` | Delay between messages (ms) | `5000` |
| `LOG_LEVEL` | Logging level | `info` |
| `PUPPETEER_HEADLESS` | Run browser in background | `true` |

### Delay Settings
- **Test Messaging**: No delay
- **Mass Messaging**: Minimum 5 seconds
- **Large Scale**: 10+ seconds

## 📊 Monitoring

### Statistics
- Number of sent messages
- Number of errors
- Success rate

### Logs
- Operation execution time
- Sending results
- Errors and warnings

### Status Indicators
- 🔴 **Red**: Not initialized
- 🟡 **Yellow**: Initialization/waiting
- 🟢 **Green**: Ready to work

## 🛡️ Security

### Recommendations
- Use reasonable delays between messages
- Don't exceed WhatsApp limits
- Follow platform rules
- Use system responsibly

### Limitations
- WhatsApp limit compliance
- Reasonable delay usage
- Legal compliance

## 🚨 Troubleshooting

### WhatsApp Won't Initialize
1. Check internet connection
2. Ensure browser isn't blocked
3. Check console logs

### Messages Not Sending
1. Check WhatsApp client status
2. Verify number correctness
3. Check error logs

### Slow Performance
1. Increase delay between messages
2. Check system load
3. Reduce concurrent operations

### File Upload Errors
1. Check file format
2. Verify file extension
3. Check file size

## 🔄 Updates

### System Update
```bash
git pull origin main
npm install
npm run web
```

### Dependencies Update
```bash
npm update
```

## 📁 Project Structure

```
whatsapp-web-messenger/
├── public/                 # Web interface
│   └── index.html         # Main page
├── src/                   # Source code
│   ├── core/             # Core modules
│   │   └── whatsapp-client.js
│   ├── utils/            # Utilities
│   │   └── logger.js
│   └── config/           # Configuration
├── uploads/              # Uploaded files
├── logs/                 # System logs
├── web-server.js         # Web server
├── package.json          # Dependencies
└── README.md            # Documentation
```

## 🤝 Support

### When Problems Occur
1. Check logs in web interface
2. Review server console
3. Check environment settings
4. Verify dependencies

### Useful Commands
```bash
# Check Node.js version
node --version

# Check dependencies
npm list

# Clear npm cache
npm cache clean --force

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

## 📄 License

MIT License - see LICENSE file for details.

## ⚠️ Important Notice

Use the system responsibly, following:
- WhatsApp rules
- Your country's legislation
- Ethical usage principles

---

**Created with ❤️ for safe and efficient messaging**

# 🤖 Chat AI Avanzata - Netlify Static Site

Una moderna applicazione web di chat AI con supporto multi-provider (OpenAI, Anthropic Claude) costruita come Netlify Static Site con Functions serverless.

## 🚀 Caratteristiche Principali

- **Frontend Moderno**: Interfaccia web responsive con HTML5, CSS3, JavaScript ES6+
- **Multi-Provider AI**: Supporto per OpenAI GPT e Anthropic Claude
- **Netlify Functions**: Backend serverless per gestione API sicura
- **Deployment Automatico**: Pronto per deployment su Netlify
- **Configurazione Dinamica**: Gestione modelli e provider tramite UI
- **Sicurezza**: API keys gestite server-side tramite variabili d'ambiente
- **Rate Limiting**: Protezione anti-spam integrata
- **Responsive Design**: Ottimizzato per desktop e mobile

## 📁 Architettura Progetto

```
chat-ai-avanzata/
├── public/                         # Frontend Static Site
│   ├── index.html                  # Pagina principale
│   └── assets/
│       ├── css/style.css           # Stili dell'applicazione
│       └── js/
│           ├── main.js             # Entry point dell'app
│           ├── config.js           # Gestione configurazione
│           ├── chat.js             # Logica chat
│           └── ui.js               # Gestione interfaccia utente
│
├── netlify/                        # Netlify Functions (Backend)
│   └── functions/
│       ├── chat.js                 # API chat principale
│       ├── models.js               # Recupero modelli disponibili
│       └── generate_image.js       # Generazione immagini
│
├── netlify.toml                    # Configurazione Netlify
├── package.json                    # Dipendenze Node.js
├── .env.example                    # Esempio variabili ambiente
└── README.md                       # Documentazione (questo file)
```

## 🛠️ Setup Sviluppo

### Prerequisiti

- **Node.js** >= 14.0.0
- **npm** o **yarn**
- **Netlify CLI** (per sviluppo locale)
- **Account Netlify** (per deployment)

### Installazione

1. **Clona il repository**
   ```bash
   git clone <repository-url>
   cd chat-ai-avanzata
   ```

2. **Installa dipendenze**
   ```bash
   npm install
   ```

3. **Configura variabili d'ambiente**
   ```bash
   cp .env.example .env
   ```
   
   Modifica `.env` con le tue API keys:
   ```env
   OPENAI_API_KEY=sk-your-openai-key-here
   ANTHROPIC_API_KEY=sk-ant-your-anthropic-key-here
   ```

4. **Avvia sviluppo locale**
   ```bash
   npm run dev
   ```
   
   L'applicazione sarà disponibile su `http://localhost:8888`

## 🔧 Configurazione API

### OpenAI

1. Ottieni API key da [OpenAI Platform](https://platform.openai.com/api-keys)
2. Aggiungi a `.env`: `OPENAI_API_KEY=sk-your-key`
3. Modelli supportati: GPT-4, GPT-3.5-turbo, GPT-4-turbo

### Anthropic Claude

1. Ottieni API key da [Anthropic Console](https://console.anthropic.com/)
2. Aggiungi a `.env`: `ANTHROPIC_API_KEY=sk-ant-your-key`
3. Modelli supportati: Claude-3.5-sonnet, Claude-3-opus, Claude-3-haiku

### Endpoint Personalizzati

Il progetto supporta endpoint personalizzati compatibili con OpenAI:
- **Ollama**: `http://localhost:11434/v1`
- **LM Studio**: `http://localhost:1234/v1`
- Altri endpoint compatibili

## 🚀 Deployment

### Netlify (Raccomandato)

1. **Connetti repository a Netlify**
   - Vai su [Netlify](https://netlify.com)
   - Clicca "New site from Git"
   - Seleziona il repository

2. **Configura build settings**
   - Build command: `npm run build`
   - Publish directory: `public`
   - Functions directory: `netlify/functions`

3. **Configura variabili d'ambiente**
   - Vai su Site settings > Environment variables
   - Aggiungi `OPENAI_API_KEY` e `ANTHROPIC_API_KEY`

4. **Deploy automatico**
   - Ogni push su main branch triggera un nuovo deploy

### Deploy Manuale

```bash
# Installa Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Deploy
netlify deploy --prod
```

## 📱 Utilizzo

### Interfaccia Chat

1. **Seleziona Provider**: Scegli tra OpenAI o Anthropic
2. **Configura Modello**: Seleziona il modello desiderato
3. **Imposta Parametri**: Temperatura, max tokens, ecc.
4. **Inizia Chat**: Invia messaggi e ricevi risposte AI

### Funzionalità Avanzate

- **Gestione Cronologia**: Mantiene cronologia conversazione
- **Configurazioni Salvate**: Salva e carica configurazioni
- **Modalità Responsive**: Ottimizzata per tutti i dispositivi
- **Gestione Errori**: Messaggi di errore informativi

## 🔒 Sicurezza

- **API Keys Server-Side**: Tutte le API keys sono gestite nelle Functions
- **Rate Limiting**: Protezione anti-spam (10 richieste/minuto per IP)
- **Validazione Input**: Validazione rigorosa di tutti gli input
- **CORS Configurato**: Headers di sicurezza appropriati
- **Nessun Storage Locale**: Nessun dato sensibile memorizzato nel browser

## 🛠️ API Endpoints

### POST `/api/chat`
Invia messaggio al modello AI selezionato

**Request:**
```json
{
  "config": {
    "provider": "openai",
    "model": "gpt-3.5-turbo",
    "temperature": 0.7,
    "max_tokens": 1000
  },
  "messages": [
    {"role": "user", "content": "Ciao!"}
  ]
}
```

**Response:**
```json
{
  "response": "Ciao! Come posso aiutarti?",
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 15,
    "total_tokens": 25
  }
}
```

### GET `/api/models`
Recupera modelli disponibili per provider

**Response:**
```json
{
  "openai": ["gpt-4", "gpt-3.5-turbo"],
  "anthropic": ["claude-3-5-sonnet-20241022"]
}
```

## 🐛 Troubleshooting

### Errori Comuni

**"API Key non configurata"**
- Verifica che le variabili d'ambiente siano impostate correttamente
- Controlla che l'API key sia valida

**"Rate limit superato"**
- Attendi 1 minuto prima di riprovare
- Verifica di non fare troppe richieste simultanee

**"Modello non disponibile"**
- Controlla che il modello sia supportato dal provider
- Verifica i permessi dell'API key

### Logs di Debug

Per debugging locale:
```bash
netlify dev --debug
```

Per logs di produzione, controlla Netlify Dashboard > Functions

## 🔧 Sviluppo

### Script NPM

```bash
npm run dev        # Avvia sviluppo locale con Netlify CLI
npm run build      # Build per produzione
npm run preview    # Preview build di produzione
npm run lint       # Linting del codice
npm test          # Esegui test
```

### Struttura Codice

- **Frontend**: Vanilla JavaScript ES6+ con architettura modulare
- **Backend**: Node.js Netlify Functions con validazione rigorosa
- **Styling**: CSS personalizzato con CSS Grid e Flexbox
- **Bundling**: Gestito automaticamente da Netlify

## 📊 Performance

- **Lighthouse Score**: 90+ per tutte le metriche
- **First Contentful Paint**: < 1.5s
- **Time to Interactive**: < 3s
- **Cumulative Layout Shift**: < 0.1

## 🤝 Contribuire

1. Fork del repository
2. Crea feature branch (`git checkout -b feature/amazing-feature`)
3. Commit delle modifiche (`git commit -m 'Add amazing feature'`)
4. Push del branch (`git push origin feature/amazing-feature`)
5. Apri Pull Request

## 📝 Changelog

### v1.0.0
- Rilascio iniziale
- Supporto OpenAI e Anthropic
- Interfaccia web responsive
- Netlify Functions backend
- Rate limiting e sicurezza

## 📄 Licenza

Questo progetto è sotto licenza MIT. Vedi file `LICENSE` per dettagli.

## 🙏 Ringraziamenti

- OpenAI per le API GPT
- Anthropic per Claude API
- Netlify per l'hosting e Functions
- La community open source

---

**Nota**: Questo progetto è production-ready e ottimizzato per Netlify. Per supporto o domande, apri una issue nel repository.
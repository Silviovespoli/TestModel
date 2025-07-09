# 🤖 AI Chat App - Interfaccia Multi-Provider

Un'applicazione Python completa per interagire con API AI multiple, inclusi OpenAI, Anthropic Claude, e endpoint locali come Ollama, LM Studio e altri.

## 📋 Funzionalità

- **Multi-Provider**: Supporta OpenAI, Anthropic Claude, e endpoint compatibili
- **Configurazione flessibile**: Supporta endpoint ufficiali, custom e locali
- **Gestione modelli**: Recupera e seleziona automaticamente i modelli disponibili
- **Conversazione interattiva**: Sistema di chat completo con cronologia
- **Gestione configurazioni**: Salva e ricarica le configurazioni
- **Gestione errori robusta**: Gestisce errori di connessione e API
- **Interfaccia user-friendly**: Terminale interattivo con comandi utili

## 🚀 Installazione

1. **Clona o scarica il progetto**
2. **Installa le dipendenze**:
   ```bash
   pip install -r requirements.txt
   ```

## 🔧 Configurazione

### Provider e Endpoint Supportati

#### OpenAI e Compatibili
- **OpenAI Ufficiale**: `https://api.openai.com/v1`
- **Ollama**: `http://localhost:11434/v1`
- **LM Studio**: `http://localhost:1234/v1`
- **Altri endpoint compatibili**: Inserisci l'URL personalizzato

#### Anthropic Claude
- **Anthropic Ufficiale**: `https://api.anthropic.com`
- **Endpoint custom Anthropic**: Inserisci l'URL personalizzato
- **Modelli supportati**: Claude 3.5 Sonnet, Claude 3 Opus, Claude 3 Sonnet, Claude 3 Haiku

### Configurazione Manuale

Puoi creare un file `config.json` basato sull'esempio:

```bash
cp config.json.example config.json
```

Modifica il file con i tuoi parametri:

```json
{
  "provider": "openai",
  "base_url": "http://localhost:11434/v1",
  "api_key": "not-needed",
  "model": "llama2",
  "temperature": 0.7,
  "max_tokens": 1000
}
```

## 📖 Uso

### Avvio dell'applicazione

```bash
python openai_chat_app.py
```

### Prima configurazione

1. **Seleziona provider**: Scegli tra OpenAI e Anthropic
2. **Seleziona endpoint**: Inserisci l'URL base dell'API
3. **API Key**: Inserisci la chiave API (obbligatoria per Anthropic, opzionale per endpoint locali)
4. **Parametri opzionali**: Temperatura e max tokens
5. **Selezione modello**: Scegli dalla lista dei modelli disponibili
6. **Test connessione**: L'app testerà automaticamente la connessione

### Comandi durante la conversazione

- **Messaggio normale**: Scrivi il tuo messaggio e premi Invio
- **`quit` o `exit`**: Termina l'applicazione
- **`clear`**: Pulisce la cronologia della conversazione
- **`config`**: Mostra la configurazione corrente

## 🛠️ Esempi di Configurazione

### OpenAI Ufficiale

```json
{
  "provider": "openai",
  "base_url": "https://api.openai.com/v1",
  "api_key": "sk-your-openai-key-here",
  "model": "gpt-3.5-turbo",
  "temperature": 0.7,
  "max_tokens": 1000
}
```

### Anthropic Claude

```json
{
  "provider": "anthropic",
  "base_url": "https://api.anthropic.com",
  "api_key": "sk-ant-your-anthropic-key-here",
  "model": "claude-3-5-sonnet-20241022",
  "temperature": 0.7,
  "max_tokens": 1000
}
```

### Anthropic con Endpoint Custom

```json
{
  "provider": "anthropic",
  "base_url": "https://your-custom-anthropic-endpoint.com",
  "api_key": "your-anthropic-key-here",
  "model": "claude-3-opus-20240229",
  "temperature": 0.7,
  "max_tokens": 1000
}
```

### Ollama (Locale)

```json
{
  "provider": "openai",
  "base_url": "http://localhost:11434/v1",
  "api_key": "not-needed",
  "model": "llama2",
  "temperature": 0.7,
  "max_tokens": 1000
}
```

### LM Studio (Locale)

```json
{
  "provider": "openai",
  "base_url": "http://localhost:1234/v1",
  "api_key": "not-needed",
  "model": "local-model",
  "temperature": 0.7,
  "max_tokens": 1000
}
```

## 🔍 Risoluzione Problemi

### Errore di connessione

- **Verifica che l'endpoint sia corretto e attivo**
- **Per endpoint locali**: Assicurati che il servizio sia in esecuzione
- **Per OpenAI**: Controlla che l'API key sia valida
- **Per Anthropic**: Verifica che l'API key sia corretta e abbia i permessi necessari

### Nessun modello disponibile

- **Endpoint locali**: Verifica che almeno un modello sia caricato
- **OpenAI**: Controlla i permessi dell'API key
- **Anthropic**: I modelli sono predefiniti, se non appaiono verifica la connessione

### Errori di risposta

- **Verifica i parametri** (temperature, max_tokens)
- **Controlla la cronologia** - usa `clear` per pulire
- **Riavvia l'applicazione** se necessario

### Problemi specifici Anthropic

- **"Libreria Anthropic non disponibile"**: Installa con `pip install anthropic`
- **Errori di autenticazione**: Verifica che l'API key Anthropic sia corretta
- **Modelli non riconosciuti**: Usa uno dei modelli supportati (claude-3-5-sonnet, claude-3-opus, etc.)

## 🏗️ Architettura

### Struttura del Codice

```
openai_chat_app.py
├── Config (dataclass)           # Configurazione dell'app con supporto multi-provider
├── ChatProvider (classe astratta) # Interfaccia base per i provider
├── OpenAIProvider               # Implementazione provider OpenAI
├── AnthropicProvider           # Implementazione provider Anthropic
├── ProviderFactory             # Factory per creare i provider
├── AIChat (classe principale)
│   ├── configura_endpoint()     # Configurazione endpoint e provider
│   ├── recupera_modelli()       # Recupero modelli disponibili
│   ├── seleziona_modello()      # Selezione modello
│   ├── testa_connessione()      # Test connessione
│   ├── avvia_conversazione()    # Loop conversazione
│   └── gestione_configurazioni  # Salva/carica config
└── main()                       # Punto di ingresso
```

### Dipendenze

- **`openai`**: Libreria ufficiale OpenAI per Python
- **`anthropic`**: Libreria ufficiale Anthropic per Python
- **`pydantic`**: Validazione e gestione dati
- **`python-dotenv`**: Gestione variabili d'ambiente

## 📝 Note Tecniche

- **Compatibilità**: Python 3.8+
- **Gestione errori**: Exception handling completo
- **Cronologia**: Mantiene il contesto della conversazione
- **Configurazione persistente**: Salva automaticamente le impostazioni
- **Sicurezza**: Non mostra le API key nei log

## 🔒 Sicurezza

- Le API key vengono memorizzate localmente nel file `config.json`
- **Non condividere** il file `config.json` se contiene chiavi sensibili
- Usa variabili d'ambiente per deployment in produzione

## 🤝 Contributi

Sentiti libero di contribuire al progetto:
- Segnala bug o problemi
- Suggerisci miglioramenti
- Proponi nuove funzionalità

## 📄 Licenza

Questo progetto è rilasciato sotto licenza MIT. Puoi usarlo liberamente per progetti personali e commerciali.
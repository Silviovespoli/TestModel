from flask import Flask, render_template, request, jsonify
from openai_chat_app import AIChat, Config, ProviderFactory

app = Flask(__name__)
chat_app = AIChat()

# Inizializza la chat app in modo non interattivo
chat_app.carica_configurazione()

# Se il modello non è caricato dalla configurazione o se is_image_model non è impostato
if not chat_app.config.model or chat_app.config.is_image_model is None:
    if chat_app.config.provider.lower() == "openai":
        chat_app.config.model = "gpt-3.5-turbo" # Modello predefinito per OpenAI
        chat_app.config.is_image_model = False # Predefinito per testo
    elif chat_app.config.provider.lower() == "anthropic":
        chat_app.config.model = "claude-3-5-sonnet-20240620" # Modello predefinito per Anthropic
        chat_app.config.is_image_model = False # Predefinito per testo

chat_app.inizializza_client()
chat_app.recupera_modelli() # Popola self.models

# Assicurati che il modello selezionato sia valido e che is_image_model sia coerente
if chat_app.config.model not in chat_app.models and chat_app.models:
    chat_app.config.model = chat_app.models[0] # Usa il primo modello disponibile se quello configurato non è valido
    # Potrebbe essere necessario aggiornare is_image_model qui in base al modello selezionato,
    # ma per ora ci affidiamo alla selezione manuale o alla configurazione salvata.

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/chat', methods=['POST'])
def chat():
    user_message_content = request.json.get('message')
    if not user_message_content:
        return jsonify({"error": "No message provided"}), 400

    # Invia il messaggio usando il metodo invia_messaggio di AIChat
    # AIChat gestisce la cronologia internamente
    response_content = chat_app.invia_messaggio(user_message_content)
    
    if response_content:
        return jsonify({"response": response_content})
    else:
        return jsonify({"error": "Failed to get response from AI"}), 500

@app.route('/generate_image', methods=['POST'])
def generate_image():
    prompt = request.json.get('prompt')
    n = request.json.get('n', 1)
    size = request.json.get('size', '1024x1024')
    quality = request.json.get('quality', 'standard') # Nuovo parametro

    if not prompt:
        return jsonify({"error": "No prompt provided for image generation"}), 400

    try:
        image_urls = chat_app.generate_image(prompt, n, size, quality) # Passa il parametro quality
        if image_urls:
            return jsonify({"images": image_urls}), 200
        else:
            return jsonify({"error": "Failed to generate images"}), 500
    except Exception as e:
        return jsonify({"error": f"Error during image generation: {e}"}), 500

@app.route('/config', methods=['GET'])
def get_config():
    try:
        config_data = {
            "provider": chat_app.config.provider,
            "base_url": chat_app.config.base_url,
            "api_key": chat_app.config.api_key,
            "model": chat_app.config.model,
            "temperature": chat_app.config.temperature,
            "max_tokens": chat_app.config.max_tokens,
            "is_image_model": chat_app.config.is_image_model
        }
        return jsonify(config_data), 200
    except Exception as e:
        return jsonify({"error": f"Errore nel recupero della configurazione: {e}"}), 500

@app.route('/config', methods=['POST'])
def update_config():
    new_config_data = request.json
    if not new_config_data:
        return jsonify({"error": "Nessun dato di configurazione fornito"}), 400

    try:
        # Aggiorna l'oggetto config di chat_app con i nomi dei campi corretti dal frontend
        if "provider_name" in new_config_data: # Corretto da "provider"
            chat_app.config.provider = new_config_data["provider_name"]
        if "endpoint_url" in new_config_data: # Corretto da "base_url"
            chat_app.config.base_url = new_config_data["endpoint_url"]
        if "api_key" in new_config_data:
            chat_app.config.api_key = new_config_data["api_key"]
        if "model_name" in new_config_data: # Corretto da "model"
            chat_app.config.model = new_config_data["model_name"]
        if "temperature" in new_config_data:
            chat_app.config.temperature = float(new_config_data["temperature"])
        if "max_tokens" in new_config_data:
            chat_app.config.max_tokens = int(new_config_data["max_tokens"])
        if "is_image_model" in new_config_data: # Aggiungi la gestione di is_image_model
            chat_app.config.is_image_model = bool(new_config_data["is_image_model"])

        # Salva la configurazione aggiornata su disco
        chat_app.salva_configurazione()
        
        # Ricarica il client e i modelli con la nuova configurazione
        chat_app.inizializza_client()
        chat_app.recupera_modelli()
        
        return jsonify({"message": "Configurazione aggiornata e ricaricata con successo"}), 200
    except Exception as e:
        return jsonify({"error": f"Errore nell'aggiornamento della configurazione: {e}"}), 500

@app.route('/models', methods=['POST'])
def get_available_models():
    provider_name = request.json.get('provider_name')
    endpoint_url = request.json.get('endpoint_url')

    if not provider_name or not endpoint_url:
        return jsonify({"error": "Provider name e endpoint URL sono richiesti"}), 400

    try:
        # Crea una configurazione temporanea per recuperare i modelli
        temp_config = Config(provider=provider_name, base_url=endpoint_url, api_key="not-needed")
        temp_provider = ProviderFactory.create_provider(temp_config)

        if not temp_provider:
            return jsonify({"error": f"Provider non supportato: {provider_name}"}), 400
        
        if not temp_provider.initialize_client():
            return jsonify({"error": f"Impossibile inizializzare il client per {provider_name} a {endpoint_url}"}), 500

        models = temp_provider.get_models()
        return jsonify({"models": models}), 200
    except Exception as e:
        return jsonify({"error": f"Errore nel recupero dei modelli: {e}"}), 500

@app.route('/reset_chat', methods=['POST'])
def reset_chat_context():
    try:
        chat_app.conversation_history = []
        return jsonify({"message": "Contesto della chat resettato con successo"}), 200
    except Exception as e:
        return jsonify({"error": f"Errore nel reset del contesto della chat: {e}"}), 500

if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description='Run Flask app.')
    parser.add_argument('--port', type=int, default=5000, help='Port number for the Flask app.')
    args = parser.parse_args()
    app.run(debug=True, port=args.port)
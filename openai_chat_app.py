#!/usr/bin/env python3
"""
Applicazione Python per interagire con API AI multiple
Supporta OpenAI, Anthropic, e endpoint locali come Ollama, LM Studio, etc.
"""

import os
import sys
import json
from typing import List, Dict, Optional, Any
from dataclasses import dataclass
from abc import ABC, abstractmethod
from openai import OpenAI
import openai
try:
    import anthropic
    ANTHROPIC_AVAILABLE = True
except ImportError:
    ANTHROPIC_AVAILABLE = False


@dataclass
class Config:
    """Classe per gestire la configurazione dell'applicazione"""
    provider: str = "openai"  # "openai" o "anthropic"
    base_url: str = "https://api.openai.com/v1"
    api_key: str = ""
    model: str = ""
    temperature: float = 0.7
    max_tokens: int = 1000
    is_image_model: bool = False # Indica se il modello selezionato è per la generazione di immagini


class ChatProvider(ABC):
    """Classe base astratta per i provider di chat AI"""
    
    def __init__(self, config: Config):
        self.config = config
        self.client = None
        self.models = []
    
    @abstractmethod
    def initialize_client(self) -> bool:
        """Inizializza il client del provider"""
        pass
    
    @abstractmethod
    def get_models(self) -> List[str]:
        """Recupera la lista dei modelli disponibili"""
        pass
    
    @abstractmethod
    def test_connection(self) -> bool:
        """Testa la connessione con l'API"""
        pass
    
    @abstractmethod
    def send_message(self, messages: List[Dict[str, str]]) -> Optional[str]:
        """Invia messaggi e restituisce la risposta"""
        pass

    @abstractmethod
    def generate_image(self, prompt: str, n: int = 1, size: str = "1024x1024", quality: str = "standard") -> Optional[List[str]]:
        """Genera immagini da un prompt testuale e restituisce una lista di URL o dati base64"""
        pass


class OpenAIProvider(ChatProvider):
    """Provider per API OpenAI e compatibili"""
    
    def initialize_client(self) -> bool:
        """Inizializza il client OpenAI"""
        try:
            self.client = OpenAI(
                base_url=self.config.base_url,
                api_key=self.config.api_key
            )
            return True
        except Exception as e:
            print(f"❌ Errore nell'inizializzazione del client OpenAI: {e}")
            return False
    
    def get_models(self) -> List[str]:
        """Recupera la lista dei modelli OpenAI disponibili"""
        if not self.client:
            return []
        
        try:
            response = self.client.models.list()
            return [model.id for model in response.data]
        except Exception as e:
            print(f"❌ Errore nel recupero dei modelli OpenAI: {e}")
            return []
    
    def test_connection(self) -> bool:
        """Testa la connessione con l'API OpenAI"""
        if not self.client or not self.config.model:
            return False
        
        try:
            response = self.client.chat.completions.create(
                model=self.config.model,
                messages=[{"role": "user", "content": "Ciao, puoi rispondere con un semplice 'ok'?"}],
                max_tokens=10,
                temperature=0.1
            )
            return bool(response.choices and response.choices[0].message)
        except Exception as e:
            print(f"❌ Errore nel test della connessione OpenAI: {e}")
            return False
    
    def send_message(self, messages: List[Dict[str, str]]) -> Optional[str]:
        """Invia messaggi al modello OpenAI"""
        if not self.client or not self.config.model:
            return None
        
        try:
            response = self.client.chat.completions.create(
                model=self.config.model,
                messages=messages,
                max_tokens=self.config.max_tokens,
                temperature=self.config.temperature
            )
            
            if response.choices and response.choices[0].message:
                return response.choices[0].message.content
            return None
        except openai.APIStatusError as e:
            print(f"❌ Errore API nell'invio del messaggio: {e.status_code} - {e.response}")
            return None
        except openai.APITimeoutError as e:
            print(f"❌ Timeout nell'invio del messaggio: {e}")
            return None
        except openai.APIConnectionError as e:
            print(f"❌ Errore di connessione nell'invio del messaggio: {e}")
            return None
        except Exception as e:
            print(f"❌ Errore generico nell'invio del messaggio con OpenAI: {e}")
            return None

    def generate_image(self, prompt: str, n: int = 1, size: str = "1024x1024", quality: str = "standard") -> Optional[List[str]]:
        """Genera immagini da un prompt testuale usando OpenAI DALL-E"""
        if not self.client or not self.config.model:
            print("�� Client o modello non configurato per la generazione di immagini.")
            return None

        # Check if the model is likely an image generation model (e.g., DALL-E)
        # This is a simplification; a better approach would be to query model capabilities
        # or have a predefined list of image-gen models.
        if "dall-e" not in self.config.model.lower():
            print(f"��️ Il modello '{self.config.model}' potrebbe non supportare la generazione di immagini.")
            # We can still try, but warn the user. Or return None if we want to be strict.
            # For now, let's try and let the API return an error if it's not supported.

        try:
            response = self.client.images.generate(
                model=self.config.model,
                prompt=prompt,
                n=n,
                size=size,
                quality=quality, # Passa il parametro quality
                response_format="url" # Default to URL as per example
            )

            if response.data:
                return [img.url for img in response.data]
            return None
        except openai.APIStatusError as e:
            print(f"�� Errore API nella generazione dell'immagine: {e.status_code} - {e.response}")
            return None
        except openai.APITimeoutError as e:
            print(f"�� Timeout nella generazione dell'immagine: {e}")
            return None
        except openai.APIConnectionError as e:
            print(f"�� Errore di connessione nella generazione dell'immagine: {e}")
            return None
        except Exception as e:
            print(f"�� Errore generico nella generazione dell'immagine con OpenAI: {e}")
            return None


class AnthropicProvider(ChatProvider):
    """Provider per API Anthropic Claude"""
    
    def initialize_client(self) -> bool:
        """Inizializza il client Anthropic"""
        if not ANTHROPIC_AVAILABLE:
            print("❌ Libreria Anthropic non disponibile. Installala con: pip install anthropic")
            return False
        
        try:
            # Anthropic client setup
            if self.config.base_url and self.config.base_url != "https://api.anthropic.com":
                # URL custom per Anthropic
                self.client = anthropic.Anthropic(
                    api_key=self.config.api_key,
                    base_url=self.config.base_url
                )
            else:
                # URL standard Anthropic
                self.client = anthropic.Anthropic(
                    api_key=self.config.api_key
                )
            return True
        except Exception as e:
            print(f"❌ Errore nell'inizializzazione del client Anthropic: {e}")
            return False
    
    def get_models(self) -> List[str]:
        """Recupera la lista dei modelli Anthropic disponibili"""
        # Anthropic non ha un'API per listare i modelli, quindi restituiamo i modelli noti
        return [
            "claude-3-5-sonnet-20241022",
            "claude-3-5-sonnet-20240620",
            "claude-3-opus-20240229",
            "claude-3-sonnet-20240229",
            "claude-3-haiku-20240307",
            "claude-2.1",
            "claude-2.0",
            "claude-instant-1.2"
        ]
    
    def test_connection(self) -> bool:
        """Testa la connessione con l'API Anthropic"""
        if not self.client or not self.config.model:
            return False
        
        try:
            response = self.client.messages.create(
                model=self.config.model,
                max_tokens=10,
                temperature=0.1,
                messages=[{"role": "user", "content": "Ciao, puoi rispondere con un semplice 'ok'?"}]
            )
            return bool(response.content and len(response.content) > 0)
        except Exception as e:
            print(f"❌ Errore nel test della connessione Anthropic: {e}")
            return False
    
    def generate_image(self, prompt: str, n: int = 1, size: str = "1024x1024", quality: str = "standard") -> Optional[List[str]]:
        """
        Anthropic API non supporta la generazione diretta di immagini.
        Questo metodo restituisce None e stampa un messaggio.
        """
        print("�� Anthropic API non supporta la generazione di immagini.")
        return None

    def send_message(self, messages: List[Dict[str, str]]) -> Optional[str]:
        """Invia messaggi al modello Anthropic"""
        if not self.client or not self.config.model:
            return None
        
        try:
            response = self.client.messages.create(
                model=self.config.model,
                max_tokens=self.config.max_tokens,
                temperature=self.config.temperature,
                messages=messages
            )
            
            if response.content and len(response.content) > 0:
                # Anthropic restituisce una lista di contenuti
                return response.content[0].text
            return None
        except Exception as e:
            print(f"❌ Errore nell'invio del messaggio Anthropic: {e}")
            return None


class ProviderFactory:
    """Factory per creare il provider appropriato"""
    
    @staticmethod
    def create_provider(config: Config) -> Optional[ChatProvider]:
        """Crea il provider appropriato basandosi sulla configurazione"""
        if config.provider.lower() == "openai":
            return OpenAIProvider(config)
        elif config.provider.lower() == "anthropic":
            return AnthropicProvider(config)
        else:
            print(f"❌ Provider non supportato: {config.provider}")
            return None


class AIChat:
    """Classe principale per gestire la chat con provider AI multipli"""
    
    def __init__(self):
        self.provider = None
        self.config = Config()
        self.models = []
        self.conversation_history = []
    
    def stampa_banner(self):
        """Stampa il banner di benvenuto"""
        print("\n" + "="*60)
        print("🤖 CHAT AI - Interfaccia Multi-Provider")
        print("="*60)
        print("Supporta: OpenAI, Anthropic, Ollama, LM Studio, e altri endpoint")
        print("="*60 + "\n")
    
    def configura_endpoint(self) -> bool:
        """
        Configura l'endpoint API chiedendo all'utente i parametri necessari
        Restituisce True se la configurazione è riuscita
        """
        print("📋 CONFIGURAZIONE ENDPOINT")
        print("-" * 30)
        
        # Seleziona provider
        print("\nSeleziona il provider AI:")
        print("1. OpenAI (o compatibile)")
        print("2. Anthropic Claude")
        
        try:
            scelta_provider = input("\nProvider [1 o 2, default: 1]: ").strip()
            if scelta_provider == "2":
                self.config.provider = "anthropic"
                default_url = "https://api.anthropic.com"
            else:
                self.config.provider = "openai"
                default_url = "https://api.openai.com/v1"
        except:
            self.config.provider = "openai"
            default_url = "https://api.openai.com/v1"
        
        # Chiedi URL base
        if self.config.provider == "openai":
            print("\nInserisci l'URL base dell'API:")
            print("- OpenAI: https://api.openai.com/v1")
            print("- Ollama: http://localhost:11434/v1")
            print("- LM Studio: http://localhost:1234/v1")
            print("- Altro: inserisci l'URL completo")
        else:
            print("\nInserisci l'URL base dell'API Anthropic:")
            print("- Anthropic standard: https://api.anthropic.com")
            print("- Endpoint custom: inserisci l'URL completo")
        
        base_url = input(f"\nURL base [default: {default_url}]: ").strip()
        if not base_url:
            base_url = default_url
        
        self.config.base_url = base_url
        
        # Chiedi API key
        print(f"\nInserisci l'API key per {self.config.provider}:")
        if self.config.provider == "anthropic":
            print("- Per Anthropic: la tua API key Anthropic (obbligatoria)")
        else:
            print("- Per OpenAI: la tua API key OpenAI")
            print("- Per endpoint locali: spesso non necessaria (lascia vuoto)")
        
        api_key = input("API key [lascia vuoto se non necessaria per endpoint locali]: ").strip()
        if self.config.provider == "anthropic" and not api_key:
            print("⚠️ API key obbligatoria per Anthropic")
            return False
        self.config.api_key = api_key if api_key else "not-needed"
        
        # Configura parametri opzionali
        try:
            temp = input("Temperatura [default: 0.7]: ").strip()
            if temp:
                self.config.temperature = float(temp)
                
            max_tok = input("Max tokens [default: 1000]: ").strip()
            if max_tok:
                self.config.max_tokens = int(max_tok)
        except ValueError:
            print("⚠️ Valori non validi, usando i default")
        
        return True
    
    def inizializza_client(self) -> bool:
        """
        Inizializza il provider AI con la configurazione corrente
        Restituisce True se l'inizializzazione è riuscita
        """
        self.provider = ProviderFactory.create_provider(self.config)
        if not self.provider:
            return False
        
        if self.provider.initialize_client():
            print(f"✅ Provider {self.config.provider} configurato per: {self.config.base_url}")
            return True
        else:
            return False
    
    def recupera_modelli(self) -> bool:
        """
        Recupera la lista dei modelli disponibili dall'API
        Restituisce True se l'operazione è riuscita
        """
        if not self.provider:
            print("❌ Provider non inizializzato")
            return False
        
        print("🔍 Recupero modelli disponibili...")
        self.models = self.provider.get_models()
        
        if not self.models:
            print("⚠️ Nessun modello disponibile")
            return False
        
        print(f"✅ Trovati {len(self.models)} modelli")
        return True
    
    def seleziona_modello(self) -> bool:
        """
        Permette all'utente di selezionare un modello dalla lista disponibile
        Restituisce True se la selezione è riuscita
        """
        if not self.models:
            print("❌ Nessun modello disponibile")
            return False
        
        print("\n📋 MODELLI DISPONIBILI")
        print("-" * 30)
        
        for i, model in enumerate(self.models, 1):
            print(f"{i}. {model}")
        
        try:
            scelta = input(f"\nSeleziona un modello (1-{len(self.models)}): ").strip()
            indice = int(scelta) - 1
            
            if 0 <= indice < len(self.models):
                self.config.model = self.models[indice]
                print(f"✅ Modello selezionato: {self.config.model}")
                return True
            else:
                print("❌ Selezione non valida")
                return False
                
        except ValueError:
            print("❌ Inserisci un numero valido")
            return False
    
    def testa_connessione(self) -> bool:
        """
        Testa la connessione con l'API facendo una richiesta di prova
        Restituisce True se la connessione è funzionante
        """
        if not self.provider or not self.config.model:
            print("❌ Provider o modello non configurato")
            return False
        
        print("🔧 Test della connessione...")
        return self.provider.test_connection()
    
    def invia_messaggio(self, messaggio: str) -> Optional[str]:
        """
        Invia un messaggio al modello e restituisce la risposta
        """
        if not self.provider or not self.config.model:
            return None
        
        # Aggiungi il messaggio dell'utente alla cronologia
        self.conversation_history.append({"role": "user", "content": messaggio})
        
        # Invia la richiesta tramite il provider
        risposta = self.provider.send_message(self.conversation_history)
        
        if risposta:
            # Aggiungi la risposta del modello alla cronologia
            self.conversation_history.append({"role": "assistant", "content": risposta})
            return risposta
        else:
            return None

    def generate_image(self, prompt: str, n: int = 1, size: str = "1024x1024", quality: str = "standard") -> Optional[List[str]]:
        """
        Genera immagini usando il provider configurato.
        """
        if not self.provider or not self.config.model:
            print("�� Provider o modello non configurato per la generazione di immagini.")
            return None
        
        # Verifica se il provider supporta la generazione di immagini
        # Per ora, assumiamo che solo OpenAIProvider lo faccia, basandoci sull'implementazione
        if not isinstance(self.provider, OpenAIProvider):
            print(f"�� Il provider '{self.config.provider}' non supporta la generazione di immagini.")
            return None

        print(f"🖼️ Generazione immagine con prompt: '{prompt}' (modello: {self.config.model}, n: {n}, size: {size}, quality: {quality})...")
        image_urls = self.provider.generate_image(prompt, n, size, quality)
        
        if image_urls:
            print(f"✅ Immagini generate con successo: {len(image_urls)} URL.")
            return image_urls
        else:
            print("�� Impossibile generare immagini.")
            return None
    
    def avvia_conversazione(self):
        """
        Avvia il loop di conversazione interattiva
        """
        print("\n💬 CONVERSAZIONE ATTIVA")
        print("-" * 30)
        print(f"Modello: {self.config.model}")
        print(f"Endpoint: {self.config.base_url}")
        print("Digita 'quit' o 'exit' per terminare")
        print("Digita 'clear' per pulire la cronologia")
        print("Digita 'config' per vedere la configurazione")
        print("-" * 30)
        
        while True:
            try:
                # Chiedi input all'utente
                user_input = input("\n🧑 Tu: ").strip()
                
                if not user_input:
                    continue
                
                # Comandi speciali
                if user_input.lower() in ['quit', 'exit']:
                    print("👋 Arrivederci!")
                    break
                elif user_input.lower() == 'clear':
                    self.conversation_history = []
                    print("🧹 Cronologia pulita")
                    continue
                elif user_input.lower() == 'config':
                    self.mostra_configurazione()
                    continue
                
                # Invia il messaggio al modello
                print("🤖 AI: ", end="", flush=True)
                risposta = self.invia_messaggio(user_input)
                
                if risposta:
                    print(risposta)
                else:
                    print("❌ Impossibile ottenere una risposta")
                    
            except KeyboardInterrupt:
                print("\n👋 Interruzione da tastiera. Arrivederci!")
                break
            except Exception as e:
                print(f"❌ Errore durante la conversazione: {e}")
    
    def mostra_configurazione(self):
        """Mostra la configurazione corrente"""
        print("\n📋 CONFIGURAZIONE CORRENTE")
        print("-" * 30)
        print(f"Provider: {self.config.provider}")
        print(f"Endpoint: {self.config.base_url}")
        print(f"Modello: {self.config.model}")
        print(f"Temperatura: {self.config.temperature}")
        print(f"Max tokens: {self.config.max_tokens}")
        print(f"Messaggi in cronologia: {len(self.conversation_history)}")
        print("-" * 30)
    
    def salva_configurazione(self, filename: str = "config.json"):
        """Salva la configurazione in un file JSON"""
        try:
            config_dict = {
                "provider": self.config.provider,
                "base_url": self.config.base_url,
                "api_key": self.config.api_key,
                "model": self.config.model,
                "temperature": self.config.temperature,
                "max_tokens": self.config.max_tokens,
                "is_image_model": self.config.is_image_model # Aggiornato il campo
            }
            
            with open(filename, 'w') as f:
                json.dump(config_dict, f, indent=2)
            
            print(f"✅ Configurazione salvata in {filename}")
            
        except Exception as e:
            print(f"❌ Errore nel salvataggio della configurazione: {e}")
    
    def carica_configurazione(self, filename: str = "config.json") -> bool:
        """Carica la configurazione da un file JSON"""
        try:
            if os.path.exists(filename):
                with open(filename, 'r') as f:
                    config_dict = json.load(f)
                
                self.config.provider = config_dict.get("provider", self.config.provider)
                self.config.base_url = config_dict.get("base_url", self.config.base_url)
                self.config.api_key = config_dict.get("api_key", self.config.api_key)
                self.config.model = config_dict.get("model", self.config.model)
                self.config.temperature = config_dict.get("temperature", self.config.temperature)
                self.config.max_tokens = config_dict.get("max_tokens", self.config.max_tokens)
                self.config.is_image_model = config_dict.get("is_image_model", self.config.is_image_model) # Aggiornato il campo

                print(f"✅ Configurazione caricata da {filename}")
                return True
            else:
                print(f"⚠️ File di configurazione {filename} non trovato")
                return False
                
        except Exception as e:
            print(f"❌ Errore nel caricamento della configurazione: {e}")
            return False
    
    def esegui(self):
        """Metodo principale per eseguire l'applicazione"""
        self.stampa_banner()
        
        # Prova a caricare una configurazione esistente
        if self.carica_configurazione():
            print("📁 Configurazione precedente caricata")
            risposta = input("Vuoi usare la configurazione esistente? (s/n): ").strip().lower()
            if risposta not in ['s', 'si', 'sì', 'y', 'yes']:
                if not self.configura_endpoint():
                    print("❌ Configurazione fallita")
                    return
        else:
            # Configura l'endpoint
            if not self.configura_endpoint():
                print("❌ Configurazione fallita")
                return
        
        # Inizializza il client
        if not self.inizializza_client():
            print("❌ Impossibile inizializzare il client")
            return
        
        # Recupera i modelli
        if not self.recupera_modelli():
            print("❌ Impossibile recuperare i modelli")
            return
        
        # Seleziona il modello
        if not self.config.model or self.config.model not in self.models:
            if not self.seleziona_modello():
                print("❌ Nessun modello selezionato")
                return
        
        # Testa la connessione
        if not self.testa_connessione():
            print("❌ Test della connessione fallito")
            return
        
        # Salva la configurazione
        risposta = input("Vuoi salvare questa configurazione? (s/n): ").strip().lower()
        if risposta in ['s', 'si', 'sì', 'y', 'yes']:
            self.salva_configurazione()
        
        # Avvia la conversazione
        self.avvia_conversazione()


def main():
    """Funzione principale"""
    try:
        app = AIChat()
        app.esegui()
    except KeyboardInterrupt:
        print("\n👋 Programma terminato dall'utente")
    except Exception as e:
        print(f"❌ Errore critico: {e}")


if __name__ == "__main__":
    main()
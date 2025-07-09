"""
Script di setup per l'applicazione OpenAI Chat App
"""

import subprocess
import sys
import os

def installa_dipendenze():
    """Installa le dipendenze necessarie"""
    try:
        print("🔧 Installazione dipendenze...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
        print("✅ Dipendenze installate con successo")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Errore nell'installazione delle dipendenze: {e}")
        return False

def crea_config_esempio():
    """Crea un file di configurazione di esempio se non esiste"""
    if not os.path.exists("config.json"):
        if os.path.exists("config.json.example"):
            print("📋 Creazione config.json di esempio...")
            with open("config.json.example", "r") as src:
                with open("config.json", "w") as dst:
                    dst.write(src.read())
            print("✅ config.json creato. Modificalo con i tuoi parametri.")
        else:
            print("⚠️ config.json.example non trovato")
    else:
        print("ℹ️ config.json già esistente")

def main():
    """Funzione principale del setup"""
    print("🚀 Setup OpenAI Chat App")
    print("=" * 30)
    
    # Installa dipendenze
    if not installa_dipendenze():
        print("❌ Setup fallito")
        return
    
    # Crea configurazione di esempio
    crea_config_esempio()
    
    print("\n✅ Setup completato!")
    print("🎯 Per iniziare, esegui: python openai_chat_app.py")
    print("📖 Leggi README.md per maggiori informazioni")

if __name__ == "__main__":
    main()
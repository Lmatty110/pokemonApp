# Accademia Pokémon

Applicazione React con backend FastAPI e MongoDB.

## Uso su smartphone

Le pagine utente e admin si adattano agli schermi piccoli; i dialoghi scorrono
all'interno dello schermo e la chat segue l'altezza disponibile. L'app è
installabile tramite il manifest e il service worker già inclusi.

Per l'uso dal telefono pubblica il frontend in HTTPS e configura
`REACT_APP_API_URL` nel frontend con l'URL HTTPS del backend, senza `/api`
finale (es. `https://api.example.com`). Non usare `localhost` per un backend
che deve essere raggiunto da altri dispositivi. Configura anche le origini
consentite dal backend. Le variabili React richiedono una nuova build.

La bacheca ordina le news per data di creazione, dalla più recente. Le news
in evidenza mantengono la loro dimensione senza cambiare l'ordine. Un tocco
su un Pokémon della squadra attiva apre il suo dettaglio; il titolo della
squadra, la freccia e gli slot vuoti aprono la gestione della squadra.

Il dettaglio dei Pokémon posseduti include un soprannome modificabile accanto
al nome della specie (massimo 50 caratteri) e note personali fino a 5.000
caratteri. Svuotare il soprannome ripristina il nome della specie. Soprannome
e note sono associati al Pokémon posseduto e si mantengono durante l'evoluzione.

## Salvataggio automatico

Soprannome, note, livello, abilità, strumento tenuto e quattro mosse apprese
si salvano automaticamente dopo circa 650 ms senza nuove modifiche. Anche
risparmi, foto e statistiche del profilo, modifiche alle news già esistenti e
quantità dell'inventario admin non richiedono più un pulsante Salva.
Digitare nelle ricerche di mosse e strumenti non modifica i dati assegnati:
occorre scegliere un risultato oppure rimuovere la selezione.

Lo stato indica le modifiche in attesa, il salvataggio completato o un errore.
Le richieste sono serializzate per conservare anche le modifiche inserite
durante un salvataggio. In caso di errore temporaneo sono previsti due
tentativi automatici e un pulsante **Riprova**. I valori non validi restano
visibili e non vengono inviati. Le bozze non salvate restano in memoria durante
la navigazione nell'app; non sono un backup persistente. Attendi la conferma
prima di chiudere completamente il browser, soprattutto se sei offline.

Creare una nuova news, assegnare o eliminare elementi ed evolvere un Pokémon
restano azioni esplicite. In particolare, una nuova news viene pubblicata solo
premendo **Crea News**, anche quando è selezionato l'invio della notifica.

## Tipi, effetti e danno in dadi delle mosse

Le mosse per livello, le MT, le mosse apprese e i risultati di ricerca mostrano
il nome italiano del tipo insieme al colore. Accanto alla potenza originale
compare il valore in dadi: 1–40 → 2d4, 41–60 → 3d4, 61–80 → 4d4,
81–100 → 3d8, 101–120 → 4d8, 121–140 → 5d8, 141+ → 6d10.
La conversione usa solo la potenza base, senza modificatori di statistiche,
tipo o livello. Le mosse senza potenza fissa positiva non ricevono dadi.

Il pulsante **Effetti** apre descrizione e dati aggiuntivi da
[PokéAPI](https://pokeapi.co/docs/v2#moves), inclusi stati alterati,
probabilità, variazioni di statistiche, cure e contraccolpi quando disponibili.
Le descrizioni italiane sono preferite; il testo completo in inglese è
segnalato esplicitamente quando non esiste una traduzione.
L'assenza di dati non viene interpretata come assenza di effetti.
La lettura funziona anche per mosse salvate prima di questa modifica, senza
doverle riassegnare, e non avvia salvataggi. Le risposte sono condivise in cache
durante la sessione dell'app e gli errori di rete possono essere ritentati.

## Notifiche delle news

L'admin può nascondere e mostrare le news senza eliminarle. Le news nascoste
restano nel pannello admin e non sono disponibili nella bacheca o nel dettaglio
utente. Nascondere, mostrare o modificare una news non invia notifiche.

Alla creazione di una news il controllo **Invia notifica** è disattivato
per impostazione predefinita. Quando attivato, il backend avvia l'invio Web Push
a tutti i dispositivi iscritti degli utenti registrati. Il telefono visualizza
la notifica di sistema anche con l'app chiusa; toccarla apre il dettaglio della
news, richiedendo il login se la sessione è scaduta.

### Configurazione del server

1. Installa le dipendenze aggiornate: `python -m pip install -r backend/requirements.txt`.
2. Genera una coppia di chiavi una sola volta, sul tuo computer:
   `python backend/generate_vapid_keys.py --subject mailto:admin@example.com`.
   Sostituisci l'indirizzo con un tuo contatto reale.
3. Copia `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` e `VAPID_SUBJECT` stampati dal comando
   nelle variabili d'ambiente del server o nel file locale `backend/.env`.
   Conserva la chiave privata come segreto: non inserirla nel frontend o in Git.
4. Riavvia il backend. Usa le stesse chiavi per tutte le istanze e i successivi
   deploy: cambiarle richiede una nuova iscrizione dei dispositivi.

Il backend deve poter contattare in HTTPS i servizi push dei browser
(Google, Mozilla, Apple e Microsoft). Gli indici MongoDB per news e iscrizioni
vengono creati all'avvio. Non occorre configurare un account Firebase o APNs.
Se le chiavi non sono configurate, l'app permette di creare news senza notifica
e indica che l'invio non è ancora disponibile.

### Attivazione sui dispositivi

Ogni utente apre **Profilo → Notifiche news → Attiva su questo dispositivo**
e concede il permesso del browser. L'iscrizione è separata per ogni dispositivo;
avere un account non concede automaticamente il permesso di ricevere notifiche.
La disattivazione nel profilo e il logout rimuovono l'iscrizione locale.

Su iPhone/iPad occorre iOS/iPadOS 16.4 o successivo: aggiungi l'app alla
schermata Home, aprila dall'icona e poi attiva le notifiche dal profilo.
Su Android usa un browser con Web Push e consenti le notifiche. Consulta la
[documentazione WebKit](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/)
per i requisiti iPhone.

Per verificare l'invio, accedi con un account utente su un telefono e abilita
le notifiche; da un altro dispositivo crea una news come admin con **Invia
notifica** attivo. Verifica la ricezione con app chiusa e l'apertura della news
dal tocco sulla notifica. Ripeti con l'opzione disattivata: non deve arrivare
alcuna notifica. Prova anche a nascondere e mostrare la news.

L'invio avviene in background dopo il salvataggio. Il messaggio admin indica
l'avvio dell'invio, non la conferma di ricezione. Le iscrizioni scadute vengono
rimosse; gli errori degli altri dispositivi non impediscono la pubblicazione.
Non è prevista una coda persistente con ritentativi: un arresto del backend
durante l'invio può interrompere le consegne. I servizi push conservano le
notifiche per un massimo di 24 ore per dispositivi temporaneamente offline;
la visualizzazione dipende anche dalle impostazioni del telefono.

## Verifiche locali

Dal frontend: `npm run build`.

Dal progetto, dopo aver installato le dipendenze backend:

```sh
python -m unittest discover -s backend/tests -p test_news_notes_push.py -v
python -m unittest discover -s backend/tests -p test_inventory_evolution.py -v
node --test tests/service_worker.test.cjs
```

Questi test usano database e trasporto push simulati e non inviano notifiche
reali. I test di integrazione esistenti basati su `requests` richiedono invece
un backend in esecuzione e un database di test.

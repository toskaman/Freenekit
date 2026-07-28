# Documentation Technique & Recherches — API Freebox OS (Juillet 2026)

Ce document récapitule les spécifications officielles et constatations techniques relatives aux API REST Freebox OS pour la synchronisation, le pairing et le monitoring de bande passante sous Windows avec **Freenekit**.

---

## 1. Découverte & Versioning de l'API

Chaque Freebox (Révolution, Mini 4K, One, Delta, Pop, Ultra) expose son point d'accès sur le réseau local LAN :

* **URL de découverte** : `http://mafreebox.freebox.fr/api_version` ou `http://192.168.1.254/api_version`
* **Exemple de réponse JSON** :
```json
{
  "box_model_name": "Freebox Ultra",
  "api_version": "10.0",
  "api_base_url": "/api/v10/",
  "device_name": "Freebox Server",
  "uid": "1a2b3c4d5e6f"
}
```

---

## 2. Procédure d'Association & Authentification (Pairing)

L'authentification s'effectue en deux étapes avec validation physique obligatoire sur l'écran frontal de la Freebox.

### Étape 2.1 : Demande de jeton d'application (`app_token`)

* **Endpoint** : `POST /api/v4/login/authorize/`
* **Corps de la requête** :
```json
{
  "app_id": "fr.freebox.freenekit.windows",
  "app_name": "Freenekit Windows",
  "app_version": "1.0.0",
  "device_name": "PC Windows"
}
```
* **Réponse JSON** :
```json
{
  "success": true,
  "result": {
    "app_token": "u8A9zX...LONG_SECURE_TOKEN...",
    "track_id": 42091
  }
}
```

### Étape 2.2 : Validation Physique sur le Boîtier Freebox

L'utilisateur doit presser le bouton **flèche droite (▶)** sur l'écran OLED/LCD de la Freebox.

Pendant ce temps, l'application effectue un sondage (polling) :
* **Endpoint** : `GET /api/v4/login/authorize/{track_id}`
* **Statuts possibles** :
  * `"pending"` : En attente de validation physique.
  * `"granted"` : Accès accordé par l'utilisateur.
  * `"denied"` : Accès refusé.
  * `"timeout"` : Expiration du délai (environ 2 minutes).

Une fois `"granted"`, le `app_token` doit être **sauvegardé de façon persistante** sous Windows dans `%APPDATA%\freenekit_config.json`.

---

## 3. Ouverture de Session & Signature HMAC-SHA1

Pour chaque session de monitoring, l'application obtient un `session_token` temporaire.

### Étape 3.1 : Obtention du Challenge
* **Endpoint** : `GET /api/v4/login/`
* **Réponse** :
```json
{
  "success": true,
  "result": {
    "logged_in": false,
    "challenge": "a1b2c3d4e5f6g7h8"
  }
}
```

### Étape 3.2 : Calcul de la Signature HMAC-SHA1
```javascript
const password = crypto.createHmac('sha1', appToken).update(challenge).digest('hex');
```

### Étape 3.3 : Création de Session
* **Endpoint** : `POST /api/v4/login/session/`
* **Corps** :
```json
{
  "app_id": "fr.freebox.freenekit.windows",
  "app_version": "1.0.0",
  "password": password
}
```
* **Réponse** :
```json
{
  "success": true,
  "result": {
    "session_token": "S3SS10N_T0K3N_ABC123",
    "permissions": {
      "settings": true,
      "contacts": true,
      "calls": true,
      "explorer": true,
      "downloader": true,
      "parental": true,
      "read_user": true
    }
  }
}
```

Toutes les requêtes subséquentes incluent le header HTTP :
`X-Freebox-Session-Token: <session_token>` ou `X-Fbx-App-Auth: <session_token>`.

---

## 4. Lecture des Équipements Réels LAN (`/lan/browser/pub/`)

* **Endpoint** : `GET /api/v4/lan/browser/pub/`
* **Données retournées** :
  * `primary_name` : Nom de l'équipement (ex: `"iPhone de Pierre"`).
  * `host_type` : Type (ex: `"smartphone"`, `"laptop"`, `"tv"`, `"game_console"`).
  * `active` : `true` si actuellement connecté au réseau.
  * `access_point` : Contient le type de connexion (`"wifi"` band 2.4GHz/5GHz/6GHz ou `"ethernet"`).
  * `l2ident` : Adresse MAC.
  * `l3connectivities` : Adresses IP v4 / v6 actives.

---

## 5. Lecture des Débits Réels de Ligne & Historique RRD

### 5.1 Débit Instantané
* **Endpoint** : `GET /api/v4/connection/`
* **Propriétés clés** :
  * `rate_down` : Débit descendant actuel en octets/s (`rate_down / 125000` = Mbit/s).
  * `rate_up` : Débit montant actuel en octets/s.
  * `bandwidth_down` : Capacité max de la ligne (ex: 1000000000 = 1 Gbps).
  * `bandwidth_up` : Capacité max montante.
  * `media` : `"fiber"` ou `"dsl"`.

### 5.2 Base de Données RRD (Historique 1m à 24h)
* **Endpoint** : `POST /api/v4/rrd/`
* **Corps de requête** :
```json
{
  "db": "net",
  "fields": ["bw_down", "bw_up", "rate_down", "rate_up"],
  "precision": 10,
  "date_start": 1722178800
}
```

---

## 6. Attributs Processus Windows (Monitoring Local)

Pour associer la consommation réseau sous Windows aux applications réelles du PC local :
```powershell
Get-NetTCPConnection -State Established,Listen | Select-Object -ExpandProperty OwningProcess -Unique | Get-Process | Select-Object Id, ProcessName
```
Cette commande permet d'attribuer exactement le trafic local aux exécutables actifs (`chrome.exe`, `spotify.exe`, `discord.exe`, etc.).

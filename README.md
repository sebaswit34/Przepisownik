# Przepisownik - Aplikacja społecznościowa do dzielenia się Przepisami Kulinarnymi

## Opis Projektu
Przepisownik to  aplikacja webowa umożliwiająca użytkownikom przeglądanie, dodawanie i zarządzanie przepisami kulinarnymi. Aplikacja powstała z myślą o miłośnikach gotowania, którzy chcą dzielić się swoimi przepisami oraz odkrywać nowe inspiracje kulinarne.

## Funkcjonalności
- **Zarządzanie Użytkownikami**
  - Rejestracja i logowanie użytkowników
  - Profil użytkownika z możliwością edycji danych
  - System uprawnień i autoryzacji

- **Zarządzanie Przepisami**
  - Dodawanie nowych przepisów z opisem, składnikami i instrukcjami
  - Przeglądanie przepisów innych użytkowników
  - Wyszukiwanie przepisów
  - Ocenianie i komentowanie przepisów
  - Zapisywanie ulubionych przepisów

- **Interfejs Użytkownika**
  - Responsywny design dostosowany do różnych urządzeń
  - Intuicyjna nawigacja
  - Przejrzysty układ przepisów
  - System powiadomień

## Wymagania i Instalacja

### Wymagania Systemowe
- Node.js (wersja 14.0.0 lub nowsza)
- MongoDB (wersja 4.0 lub nowsza)
- npm (wersja 6.0.0 lub nowsza)

### Instalacja
1. Sklonuj repozytorium:
```bash
git clone https://github.com/sebaswit34/Przepisownik.git

2. Zainstaluj zależności:
```bash
npm install
```

3. Proszę utworzyć plik `.env` w głównym katalogu projektu i dodaj następujące zmienne:
```
MONGODB_URI="Nazwa serwera"
SESSION_SECRET=twoj_tajny_klucz
PORT=3000
```

4. Uruchom aplikację:
```bash
# Tryb deweloperski (z automatycznym restartem)
npm run dev

# Tryb produkcyjny
npm start
```

Aplikacja będzie dostępna pod adresem `http://localhost:3000`

## Wykorzystane Biblioteki
- **express** - framework webowy dla Node.js
- **mongoose** - ODM (Object Data Modeling) dla MongoDB
- **ejs** - silnik szablonów
- **bcryptjs** - hashowanie haseł
- **express-session** - zarządzanie sesjami
- **connect-flash** - komunikaty flash
- **multer** - obsługa przesyłania plików
- **dotenv** - zarządzanie zmiennymi środowiskowymi
- **method-override** - obsługa metod HTTP
- **express-ejs-layouts** - układ szablonów EJS

## Struktura Aplikacji
```
przepisownik/
├── controllers/     # Kontrolery obsługujące logikę biznesową
│   ├── przepisy.js  # Obsługa przepisów
│   └── users.js     # Obsługa użytkowników
├── models/          # Modele danych
│   ├── Przepis.js   # Model przepisu
│   └── User.js      # Model użytkownika
├── views/           # Szablony widoków
│   ├── layouts/     # Układy stron
│   ├── partials/    # Częściowe widoki (header, footer)
│   ├── przepisy/    # Widoki związane z przepisami
│   └── users/       # Widoki związane z użytkownikami
├── routes/          # Definicje tras
│   ├── przepisy.js  # Trasy dla przepisów
│   └── users.js     # Trasy dla użytkowników
├── public/          # Statyczne pliki (CSS, JS, obrazy)
├── middleware/      # Middleware aplikacji
└── app.js          # Główny plik aplikacji
```
### W pliku uploads znajduja się zdjęcia, które były mi potrzebne do testów aplikacji.

### Opis Komponentów
- **Kontrolery** - zawierają logikę biznesową aplikacji, obsługują żądania i odpowiedzi
- **Modele** - definiują strukturę danych i metody interakcji z bazą danych
- **Widoki** - szablony EJS odpowiedzialne za wyświetlanie interfejsu użytkownika
- **Trasy** - definiują endpointy API i mapują je do odpowiednich kontrolerów
- **Middleware** - funkcje pośredniczące w przetwarzaniu żądań

## Przykładowe Dane
Aplikacja nie wymaga przykładowych danych do uruchomienia, ale po rejestracji możesz:
1. Utworzyć nowy przepis poprzez formularz na stronie głównej
2. Dodać zdjęcia do przepisów (obsługiwane formaty: JPG, PNG)
3. Wypełnić szczegóły przepisu:
   - Nazwa przepisu
   - Kategoria
   - Czas przygotowania
   - Poziom trudności
   - Lista składników
   - Instrukcje przygotowania 

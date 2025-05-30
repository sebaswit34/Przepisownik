const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const flash = require('connect-flash');
const methodOverride = require('method-override');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');
require('dotenv').config();

const app = express();

// Konfiguracja silnika widoków
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('layout', 'layouts/main');
app.use(expressLayouts);

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(methodOverride('_method'));

// Konfiguracja sesji
app.use(session({
    secret: 'tajny_klucz_sesji_zmien_w_produkcji',
    resave: false,
    saveUninitialized: false
}));

// Flash messages
app.use(flash());

// Zmienne globalne - dodajemy przed routingiem
const { zmienneGlobalne } = require('./middleware/auth');
app.use(zmienneGlobalne);

// Połączenie z bazą danych
mongoose.connect('mongodb+srv://sebaswit46:Pilkareczna17@cluster0.wkiftrn.mongodb.net/przepisy', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('Połączono z bazą MongoDB'))
.catch(err => console.error('Błąd połączenia z MongoDB:', err));

// Import tras
const przepisyRoutes = require('./routes/przepisy');
const userRoutes = require('./routes/users');

// Użycie tras
app.use('/przepisy', przepisyRoutes);
app.use('/users', userRoutes);

// Strona główna
app.get('/', (req, res) => {
    res.render('home');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Serwer uruchomiony na porcie ${PORT}`);
}); 
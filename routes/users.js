const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { czyZalogowany, czyNieZalogowany } = require('../middleware/auth');

// Rejestracja
router.get('/rejestracja', czyNieZalogowany, userController.getFormularzRejestracji);
router.post('/rejestracja', czyNieZalogowany, userController.zarejestrujUzytkownika);

// Logowanie
router.get('/login', czyNieZalogowany, userController.getFormularzLogowania);
router.post('/login', czyNieZalogowany, userController.zalogujUzytkownika);

// Wylogowanie
router.post('/logout', czyZalogowany, userController.wylogujUzytkownika);

// Profil użytkownika
router.get('/profil', czyZalogowany, userController.getProfil);
router.post('/profil', czyZalogowany, userController.aktualizujProfil);

// Ulubione przepisy
router.post('/ulubione/:przepisId', czyZalogowany, userController.dodajDoUlubionych);
router.delete('/ulubione/:przepisId', czyZalogowany, userController.usunZUlubionych);

module.exports = router; 
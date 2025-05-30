const User = require('../models/User');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs').promises;
const Przepis = require('../models/Przepis');

// Wyświetlanie formularza rejestracji
exports.getFormularzRejestracji = (req, res) => {
    res.render('users/rejestracja');
};

// Rejestracja nowego użytkownika
exports.zarejestrujUzytkownika = async (req, res) => {
    try {
        console.log('Rozpoczęcie rejestracji użytkownika');
        const { nazwa, email, haslo, haslo2 } = req.body;
        console.log('Dane otrzymane:', { nazwa, email });

        // Walidacja
        const errors = [];
        if (haslo !== haslo2) {
            console.log('Błąd: Hasła nie są identyczne');
            errors.push({ msg: 'Hasła nie są identyczne' });
        }
        if (haslo.length < 6) {
            console.log('Błąd: Hasło jest za krótkie');
            errors.push({ msg: 'Hasło musi mieć co najmniej 6 znaków' });
        }

        if (errors.length > 0) {
            console.log('Znaleziono błędy walidacji:', errors);
            return res.render('users/rejestracja', {
                errors,
                nazwa,
                email
            });
        }

        // Sprawdź czy użytkownik już istnieje
        console.log('Sprawdzanie czy użytkownik istnieje');
        const istniejacyUser = await User.findOne({ $or: [{ email }, { nazwa }] });
        if (istniejacyUser) {
            console.log('Użytkownik już istnieje');
            errors.push({ msg: 'Użytkownik o podanym emailu lub nazwie już istnieje' });
            return res.render('users/rejestracja', {
                errors,
                nazwa,
                email
            });
        }

        // Utwórz nowego użytkownika
        console.log('Tworzenie nowego użytkownika');
        const nowyUser = new User({
            nazwa,
            email,
            haslo
        });

        await nowyUser.save();
        console.log('Użytkownik został zapisany w bazie');
        
        req.flash('success_msg', 'Zostałeś zarejestrowany i możesz się zalogować');
        console.log('Przekierowanie na stronę logowania');
        res.redirect('/users/login');
    } catch (error) {
        console.error('Błąd podczas rejestracji:', error);
        req.flash('error_msg', 'Wystąpił błąd podczas rejestracji');
        res.redirect('/users/rejestracja');
    }
};

// Wyświetlanie formularza logowania
exports.getFormularzLogowania = (req, res) => {
    res.render('users/login');
};

// Logowanie użytkownika
exports.zalogujUzytkownika = async (req, res, next) => {
    try {
        const { email, haslo } = req.body;
        
        // Znajdź użytkownika
        const user = await User.findOne({ email });
        if (!user) {
            req.flash('error_msg', 'Nieprawidłowy email lub hasło');
            return res.redirect('/users/login');
        }

        // Sprawdź hasło
        const isMatch = await user.sprawdzHaslo(haslo);
        if (!isMatch) {
            req.flash('error_msg', 'Nieprawidłowy email lub hasło');
            return res.redirect('/users/login');
        }

        // Zaloguj użytkownika
        req.session.user = user;

        req.flash('success_msg', 'Zostałeś zalogowany');
        res.redirect('/');
    } catch (error) {
        console.error('Błąd podczas logowania:', error);
        req.flash('error_msg', 'Wystąpił błąd podczas logowania');
        res.redirect('/users/login');
    }
};

// Wylogowanie użytkownika
exports.wylogujUzytkownika = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.redirect('/');
        }
        res.redirect('/users/login');
    });
};

// Profil użytkownika
exports.getProfil = async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .populate('mojePrzepisy')
            .populate('ulubionePrzepisy');
        
        // Pobierz wszystkie przepisy użytkownika i zlicz otrzymane oceny
        const przepisy = await Przepis.find({ autor: req.user._id });
        const otrzymaneOceny = przepisy.reduce((suma, przepis) => suma + przepis.oceny.length, 0);
        
        // Dodaj liczbę otrzymanych ocen do obiektu użytkownika
        user.otrzymaneOceny = otrzymaneOceny;
        
        res.render('users/profil', { user });
    } catch (error) {
        console.error('Błąd podczas ładowania profilu:', error);
        req.flash('error_msg', 'Wystąpił błąd podczas ładowania profilu');
        res.redirect('/');
    }
};

// Dodawanie przepisu do ulubionych
exports.dodajDoUlubionych = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        const przepisId = req.params.przepisId;

        if (!user.ulubionePrzepisy.includes(przepisId)) {
            user.ulubionePrzepisy.push(przepisId);
            await user.save();
            res.json({ message: 'Przepis został dodany do ulubionych' });
        } else {
            res.status(400).json({ message: 'Przepis jest już w ulubionych' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Wystąpił błąd podczas dodawania do ulubionych' });
    }
};

// Usuwanie przepisu z ulubionych
exports.usunZUlubionych = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        const przepisId = req.params.przepisId;

        user.ulubionePrzepisy = user.ulubionePrzepisy.filter(id => id.toString() !== przepisId);
        await user.save();
        res.json({ message: 'Przepis został usunięty z ulubionych' });
    } catch (error) {
        res.status(500).json({ message: 'Wystąpił błąd podczas usuwania z ulubionych' });
    }
};

// Aktualizacja profilu użytkownika
exports.aktualizujProfil = async (req, res) => {
    try {
        const { nazwa, email, obecneHaslo, noweHaslo, noweHaslo2 } = req.body;
        const user = await User.findById(req.user._id);

        // Sprawdź czy nowy email nie jest już używany przez innego użytkownika
        if (email !== user.email) {
            const istniejacyUser = await User.findOne({ email });
            if (istniejacyUser) {
                req.flash('error_msg', 'Ten email jest już używany');
                return res.redirect('/users/profil');
            }
        }

        // Aktualizuj podstawowe dane
        user.nazwa = nazwa;
        user.email = email;

        // Obsługa zmiany hasła
        if (obecneHaslo && noweHaslo) {
            // Sprawdź czy obecne hasło jest poprawne
            const isMatch = await user.sprawdzHaslo(obecneHaslo);
            if (!isMatch) {
                req.flash('error_msg', 'Nieprawidłowe obecne hasło');
                return res.redirect('/users/profil');
            }

            // Sprawdź czy nowe hasła są identyczne
            if (noweHaslo !== noweHaslo2) {
                req.flash('error_msg', 'Nowe hasła nie są identyczne');
                return res.redirect('/users/profil');
            }

            // Sprawdź długość nowego hasła
            if (noweHaslo.length < 6) {
                req.flash('error_msg', 'Nowe hasło musi mieć co najmniej 6 znaków');
                return res.redirect('/users/profil');
            }

            user.haslo = noweHaslo;
        }

        await user.save();
        req.flash('success_msg', 'Profil został zaktualizowany');
        res.redirect('/users/profil');
    } catch (error) {
        console.error('Błąd podczas aktualizacji profilu:', error);
        req.flash('error_msg', 'Wystąpił błąd podczas aktualizacji profilu');
        res.redirect('/users/profil');
    }
}; 
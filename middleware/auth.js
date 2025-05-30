const User = require('../models/User');

// Sprawdzanie czy użytkownik jest zalogowany
const czyZalogowany = async (req, res, next) => {
    if (req.session && req.session.user) {
        try {
            const user = await User.findById(req.session.user._id || req.session.user.id);
            if (user) {
                req.user = user;
                return next();
            }
        } catch (err) {
            console.error('Błąd podczas pobierania danych użytkownika:', err);
        }
    }
    req.flash('error_msg', 'Musisz być zalogowany aby uzyskać dostęp');
    res.redirect('/users/login');
};

// Sprawdzanie czy użytkownik nie jest zalogowany (dla stron logowania/rejestracji)
const czyNieZalogowany = (req, res, next) => {
    if (!req.session.user) {
        return next();
    }
    res.redirect('/przepisy');
};

// Dodawanie zmiennych lokalnych dla wszystkich widoków
const zmienneGlobalne = async (req, res, next) => {
    if (req.session && req.session.user) {
        try {
            const user = await User.findById(req.session.user._id || req.session.user.id);
            if (user) {
                req.user = user;
                res.locals.user = user;
            } else {
                res.locals.user = null;
            }
        } catch (err) {
            console.error('Błąd podczas pobierania danych użytkownika:', err);
            res.locals.user = null;
        }
    } else {
        res.locals.user = null;
    }
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    res.locals.currentPath = req.path;
    next();
};

module.exports = {
    czyZalogowany,
    czyNieZalogowany,
    zmienneGlobalne
}; 
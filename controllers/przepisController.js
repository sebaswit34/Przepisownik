const Przepis = require('../models/Przepis');

// Wyświetlanie wszystkich przepisów
exports.getAllPrzepisy = async (req, res) => {
    try {
        const przepisy = await Przepis.find()
            .populate('autor', 'nazwa')
            .sort({ dataUtworzenia: -1 });
        res.render('przepisy/index', { przepisy });
    } catch (error) {
        req.flash('error_msg', 'Wystąpił błąd podczas pobierania przepisów');
        res.redirect('/');
    }
};

// Wyświetlanie formularza dodawania przepisu
exports.getFormularzDodawania = (req, res) => {
    res.render('przepisy/nowy');
};

// Dodawanie nowego przepisu
exports.dodajPrzepis = async (req, res) => {
    try {
        const { nazwa, skladniki, instrukcje, czasPrzygotowania, poziomTrudnosci, kategorie } = req.body;
        
        const nowyPrzepis = new Przepis({
            nazwa,
            skladniki: JSON.parse(skladniki),
            instrukcje,
            czasPrzygotowania,
            poziomTrudnosci,
            kategorie,
            autor: req.user._id,
            zdjecie: req.file ? req.file.path : null
        });

        await nowyPrzepis.save();
        req.flash('success_msg', 'Przepis został dodany pomyślnie');
        res.redirect('/przepisy');
    } catch (error) {
        req.flash('error_msg', 'Wystąpił błąd podczas dodawania przepisu');
        res.redirect('/przepisy/nowy');
    }
};

// Wyświetlanie szczegółów przepisu
exports.getPrzepis = async (req, res) => {
    try {
        const przepis = await Przepis.findById(req.params.id)
            .populate('autor', 'nazwa')
            .populate('komentarze.autor', 'nazwa');
        
        if (!przepis) {
            req.flash('error_msg', 'Nie znaleziono przepisu');
            return res.redirect('/przepisy');
        }
        
        res.render('przepisy/szczegoly', { przepis });
    } catch (error) {
        req.flash('error_msg', 'Wystąpił błąd podczas pobierania przepisu');
        res.redirect('/przepisy');
    }
};

// Wyświetlanie formularza edycji
exports.getFormularzEdycji = async (req, res) => {
    try {
        const przepis = await Przepis.findById(req.params.id);
        
        if (!przepis) {
            req.flash('error_msg', 'Nie znaleziono przepisu');
            return res.redirect('/przepisy');
        }
        
        if (przepis.autor.toString() !== req.user._id.toString()) {
            req.flash('error_msg', 'Nie masz uprawnień do edycji tego przepisu');
            return res.redirect('/przepisy');
        }
        
        res.render('przepisy/edycja', { przepis });
    } catch (error) {
        req.flash('error_msg', 'Wystąpił błąd podczas pobierania formularza edycji');
        res.redirect('/przepisy');
    }
};

// Aktualizacja przepisu
exports.aktualizujPrzepis = async (req, res) => {
    try {
        const { nazwa, skladniki, instrukcje, czasPrzygotowania, poziomTrudnosci, kategorie } = req.body;
        
        const przepis = await Przepis.findById(req.params.id);
        
        if (!przepis) {
            req.flash('error_msg', 'Nie znaleziono przepisu');
            return res.redirect('/przepisy');
        }
        
        if (przepis.autor.toString() !== req.user._id.toString()) {
            req.flash('error_msg', 'Nie masz uprawnień do edycji tego przepisu');
            return res.redirect('/przepisy');
        }
        
        przepis.nazwa = nazwa;
        przepis.skladniki = JSON.parse(skladniki);
        przepis.instrukcje = instrukcje;
        przepis.czasPrzygotowania = czasPrzygotowania;
        przepis.poziomTrudnosci = poziomTrudnosci;
        przepis.kategorie = kategorie;
        
        if (req.file) {
            przepis.zdjecie = req.file.path;
        }
        
        await przepis.save();
        req.flash('success_msg', 'Przepis został zaktualizowany');
        res.redirect(`/przepisy/${przepis._id}`);
    } catch (error) {
        req.flash('error_msg', 'Wystąpił błąd podczas aktualizacji przepisu');
        res.redirect('/przepisy');
    }
};

// Usuwanie przepisu
exports.usunPrzepis = async (req, res) => {
    try {
        const przepis = await Przepis.findById(req.params.id);
        
        if (!przepis) {
            req.flash('error_msg', 'Nie znaleziono przepisu');
            return res.redirect('/przepisy');
        }
        
        if (przepis.autor.toString() !== req.user._id.toString()) {
            req.flash('error_msg', 'Nie masz uprawnień do usunięcia tego przepisu');
            return res.redirect('/przepisy');
        }
        
        await przepis.remove();
        req.flash('success_msg', 'Przepis został usunięty');
        res.redirect('/przepisy');
    } catch (error) {
        req.flash('error_msg', 'Wystąpił błąd podczas usuwania przepisu');
        res.redirect('/przepisy');
    }
};

// Dodawanie oceny
exports.dodajOcene = async (req, res) => {
    try {
        const { ocena } = req.body;
        const przepis = await Przepis.findById(req.params.id);
        
        if (!przepis) {
            return res.status(404).json({ message: 'Nie znaleziono przepisu' });
        }
        
        // Sprawdź czy użytkownik już ocenił przepis
        const istniejacaOcena = przepis.oceny.find(o => o.autor.toString() === req.user._id.toString());
        
        if (istniejacaOcena) {
            istniejacaOcena.ocena = parseInt(ocena);
        } else {
            przepis.oceny.push({ 
                ocena: parseInt(ocena), 
                autor: req.user._id 
            });
        }
        
        przepis.obliczSredniaOcene();
        await przepis.save();
        
        res.json({ 
            message: 'Ocena została dodana', 
            srednia_ocen: przepis.srednia_ocen 
        });
    } catch (error) {
        console.error('Błąd podczas dodawania oceny:', error);
        res.status(500).json({ message: 'Wystąpił błąd podczas dodawania oceny' });
    }
};

// Dodawanie komentarza
exports.dodajKomentarz = async (req, res) => {
    try {
        const { tresc } = req.body;
        const przepis = await Przepis.findById(req.params.id);
        
        if (!przepis) {
            return res.status(404).json({ message: 'Nie znaleziono przepisu' });
        }
        
        przepis.komentarze.push({
            tresc,
            autor: req.user._id
        });
        
        await przepis.save();
        
        const nowyKomentarz = przepis.komentarze[przepis.komentarze.length - 1];
        await Przepis.populate(nowyKomentarz, { path: 'autor', select: 'nazwa' });
        
        res.json({ message: 'Komentarz został dodany', komentarz: nowyKomentarz });
    } catch (error) {
        res.status(500).json({ message: 'Wystąpił błąd podczas dodawania komentarza' });
    }
}; 
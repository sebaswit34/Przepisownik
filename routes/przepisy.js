const express = require('express');
const router = express.Router();
const multer = require('multer');
const { czyZalogowany } = require('../middleware/auth');
const Przepis = require('../models/Przepis');
const User = require('../models/User');
const mongoose = require('mongoose');

// Konfiguracja multer dla przesyłania plików
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: function (req, file, cb) {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Dozwolone są tylko pliki graficzne!'));
        }
    }
});

// Lista wszystkich przepisów
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 12;
        const skip = (page - 1) * limit;

        let query = {};
        let sort = { dataUtworzenia: -1 };

        // Wyszukiwanie
        if (req.query.search) {
            query.nazwa = { $regex: req.query.search, $options: 'i' };
        }

        // Filtrowanie po poziomie trudności
        if (req.query.difficulty) {
            query.poziomTrudnosci = req.query.difficulty;
        }

        // Sortowanie
        if (req.query.sort) {
            switch (req.query.sort) {
                case 'popular':
                    sort = { 'oceny.length': -1 };
                    break;
                case 'rating':
                    sort = { srednia_ocen: -1 };
                    break;
                default:
                    sort = { dataUtworzenia: -1 };
            }
        }

        const przepisy = await Przepis.find(query)
            .populate('autor', 'nazwa')
            .sort(sort)
            .skip(skip)
            .limit(limit);

        const total = await Przepis.countDocuments(query);
        const totalPages = Math.ceil(total / limit);

        res.render('przepisy/index', {
            przepisy,
            currentPage: page,
            totalPages,
            search: req.query.search || '',
            difficulty: req.query.difficulty || '',
            sort: req.query.sort || 'newest',
            searchParams: req.query.search || req.query.difficulty || req.query.sort ? 
                `&search=${req.query.search || ''}&difficulty=${req.query.difficulty || ''}&sort=${req.query.sort || ''}` : ''
        });
    } catch (err) {
        console.error(err);
        req.flash('error_msg', 'Wystąpił błąd podczas wczytywania przepisów');
        res.redirect('/');
    }
});

// Formularz dodawania nowego przepisu
router.get('/nowy', czyZalogowany, (req, res) => {
    res.render('przepisy/nowy');
});

// Dodawanie nowego przepisu
router.post('/', czyZalogowany, upload.single('zdjecie'), async (req, res) => {
    try {
        console.log('Otrzymane dane:', req.body);
        
        const { nazwa, czasPrzygotowania, poziomTrudnosci, skladniki, instrukcje, tagi } = req.body;

        // Przygotowanie tablicy składników
        let przetworzoneSkladniki = [];
        if (Array.isArray(skladniki)) {
            przetworzoneSkladniki = skladniki;
        } else if (typeof skladniki === 'object') {
            // Konwersja obiektu składników na tablicę
            const iloscSkladnikow = Object.keys(skladniki.nazwa || {}).length;
            for (let i = 0; i < iloscSkladnikow; i++) {
                przetworzoneSkladniki.push({
                    nazwa: skladniki.nazwa[i],
                    ilosc: skladniki.ilosc[i],
                    jednostka: skladniki.jednostka[i]
                });
            }
        }

        const nowyPrzepis = new Przepis({
            nazwa,
            czasPrzygotowania: parseInt(czasPrzygotowania),
            poziomTrudnosci,
            skladniki: przetworzoneSkladniki,
            instrukcje,
            tagi: tagi ? tagi.split(',').map(tag => tag.trim()) : [],
            autor: req.user.id
        });

        if (req.file) {
            nowyPrzepis.zdjecie = '/uploads/' + req.file.filename;
        }

        console.log('Utworzony przepis:', nowyPrzepis);

        await nowyPrzepis.save();
        
        // Dodaj przepis do tablicy mojePrzepisy użytkownika
        const user = await User.findById(req.user.id);
        user.mojePrzepisy.push(nowyPrzepis._id);
        await user.save();

        req.flash('success_msg', 'Przepis został dodany');
        res.redirect('/przepisy');
    } catch (err) {
        console.error('Błąd podczas dodawania przepisu:', err);
        req.flash('error_msg', 'Wystąpił błąd podczas dodawania przepisu');
        res.redirect('/przepisy/nowy');
    }
});

// Funkcja pomocnicza do synchronizacji ocen z komentarzy
async function synchronizujOceny(przepis) {
    console.log('\n=== SYNCHRONIZACJA OCEN Z KOMENTARZY ===');
    console.log('ID przepisu:', przepis._id);
    console.log('Nazwa przepisu:', przepis.nazwa);
    
    // Pobierz wszystkie komentarze z ocenami
    const komentarzeZOcenami = przepis.komentarze.filter(k => k.ocena && typeof k.ocena === 'number');
    console.log('Liczba komentarzy z ocenami:', komentarzeZOcenami.length);
    console.log('Komentarze z ocenami:', JSON.stringify(komentarzeZOcenami, null, 2));
    
    // Pobierz wszystkie oceny użytkowników dla tego przepisu
    const uzytkownicyZOcenami = await User.find({
        'oceny.przepis': przepis._id
    });
    
    console.log('Liczba użytkowników z ocenami:', uzytkownicyZOcenami.length);
    
    // Mapuj komentarze na oceny
    const noweOceny = komentarzeZOcenami.map(komentarz => ({
        ocena: komentarz.ocena,
        autor: komentarz.autor,
        _id: new mongoose.Types.ObjectId() // Generuj nowe ID dla oceny
    }));
    
    console.log('Nowe oceny do dodania:', JSON.stringify(noweOceny, null, 2));
    
    // Aktualizuj oceny w przepisie
    przepis.oceny = noweOceny;
    
    // Aktualizuj oceny u użytkowników
    for (const user of uzytkownicyZOcenami) {
        const komentarzUzytkownika = komentarzeZOcenami.find(k => k.autor.toString() === user._id.toString());
        if (komentarzUzytkownika) {
            const userOcena = user.oceny.find(o => o.przepis.toString() === przepis._id.toString());
            if (userOcena) {
                userOcena.ocena = komentarzUzytkownika.ocena;
                delete userOcena.wartosc; // Usuń stare pole
            } else {
                user.oceny.push({
                    przepis: przepis._id,
                    ocena: komentarzUzytkownika.ocena
                });
            }
            await user.save();
        }
    }
    
    // Przelicz średnią
    przepis.obliczSredniaOcene();
    
    // Zapisz zmiany
    await przepis.save();
    
    console.log('Zakończono synchronizację ocen');
    console.log('Nowa liczba ocen:', przepis.oceny.length);
    console.log('Nowa średnia:', przepis.srednia_ocen);
    
    return przepis;
}

// Aktualizuj endpoint szczegółów przepisu
router.get('/:id', async (req, res) => {
    try {
        console.log('\n=== POBIERANIE SZCZEGÓŁÓW PRZEPISU ===');
        console.log('ID przepisu:', req.params.id);

        // Pobierz przepis bez populacji
        const przepis = await Przepis.findById(req.params.id);
        if (!przepis) {
            console.log('Nie znaleziono przepisu');
            req.flash('error_msg', 'Nie znaleziono przepisu');
            return res.redirect('/przepisy');
        }

        // Synchronizuj oceny z komentarzy
        await synchronizujOceny(przepis);

        // Pobierz przepis z populacją dla wyświetlenia
        const przepisPoSynchronizacji = await Przepis.findById(req.params.id)
            .populate('autor', 'nazwa')
            .populate({
                path: 'komentarze',
                populate: { path: 'autor', select: 'nazwa avatar' }
            });

        console.log('\nStan przepisu po synchronizacji:');
        console.log('- ID:', przepisPoSynchronizacji._id);
        console.log('- Nazwa:', przepisPoSynchronizacji.nazwa);
        console.log('- Liczba ocen:', przepisPoSynchronizacji.oceny.length);
        console.log('- Wszystkie oceny:', JSON.stringify(przepisPoSynchronizacji.oceny, null, 2));
        console.log('- Liczba komentarzy:', przepisPoSynchronizacji.komentarze.length);
        console.log('- Wszystkie komentarze:', JSON.stringify(przepisPoSynchronizacji.komentarze, null, 2));
        console.log('- Średnia ocen:', przepisPoSynchronizacji.srednia_ocen);

        res.render('przepisy/szczegoly', { 
            przepis: przepisPoSynchronizacji,
            user: req.user
        });
    } catch (err) {
        console.error('=== Błąd podczas pobierania przepisu ===');
        console.error('Szczegóły błędu:', err);
        req.flash('error_msg', 'Wystąpił błąd podczas wczytywania przepisu');
        res.redirect('/przepisy');
    }
});

// Dodawanie/usuwanie z ulubionych
router.post('/:id/ulubione', czyZalogowany, async (req, res) => {
    try {
        const przepis = await Przepis.findById(req.params.id);
        if (!przepis) {
            return res.status(404).json({ error: 'Nie znaleziono przepisu' });
        }

        const user = req.user;
        const index = user.ulubionePrzepisy.indexOf(przepis._id);

        if (index === -1) {
            user.ulubionePrzepisy.push(przepis._id);
            await user.save();
            res.json({ isFavorite: true });
        } else {
            user.ulubionePrzepisy.splice(index, 1);
            await user.save();
            res.json({ isFavorite: false });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Wystąpił błąd serwera' });
    }
});

// Aktualizacja endpointu dodawania oceny
router.post('/:id/oceny', czyZalogowany, async (req, res) => {
    try {
        console.log('\n=== ROZPOCZYNAM DODAWANIE OCENY ===');
        console.log('ID przepisu:', req.params.id);
        console.log('ID użytkownika:', req.user.id);
        console.log('Dane z formularza:', req.body);
        
        // Pobierz surowy przepis z bazy
        const surowyPrzepis = await Przepis.findById(req.params.id);
        console.log('\nSurowy stan przepisu przed dodaniem oceny:');
        console.log('- ID:', surowyPrzepis._id);
        console.log('- Nazwa:', surowyPrzepis.nazwa);
        console.log('- Liczba ocen:', surowyPrzepis.oceny.length);
        console.log('- Wszystkie oceny:', JSON.stringify(surowyPrzepis.oceny, null, 2));
        console.log('- Liczba komentarzy:', surowyPrzepis.komentarze.length);
        console.log('- Wszystkie komentarze:', JSON.stringify(surowyPrzepis.komentarze, null, 2));
        
        // Sprawdź czy przepis istnieje
        const przepis = await Przepis.findById(req.params.id)
            .populate('autor', 'nazwa')
            .populate({
                path: 'komentarze',
                populate: { path: 'autor', select: 'nazwa avatar' }
            });
            
        if (!przepis) {
            console.log('Nie znaleziono przepisu');
            req.flash('error_msg', 'Nie znaleziono przepisu');
            return res.redirect('/przepisy');
        }

        // Sprawdź czy użytkownik nie jest autorem przepisu
        if (przepis.autor.toString() === req.user.id) {
            console.log('Próba ocenienia własnego przepisu');
            req.flash('error_msg', 'Nie możesz ocenić własnego przepisu');
            return res.redirect(`/przepisy/${przepis._id}`);
        }

        // Pobierz i napraw oceny użytkownika
        const user = await User.findById(req.user.id);
        await user.naprawOceny();

        console.log('\nStan przepisu przed dodaniem oceny:');
        console.log('- ID przepisu:', przepis._id);
        console.log('- Nazwa przepisu:', przepis.nazwa);
        console.log('- Liczba obecnych ocen:', przepis.oceny.length);
        console.log('- Obecne oceny:', JSON.stringify(przepis.oceny, null, 2));
        console.log('- Liczba komentarzy:', przepis.komentarze.length);
        console.log('- Wszystkie komentarze:', JSON.stringify(przepis.komentarze, null, 2));
        console.log('- Aktualna średnia:', przepis.srednia_ocen);

        const { ocena, komentarz } = req.body;
        
        // Walidacja oceny
        if (!ocena) {
            console.log('Brak oceny w formularzu');
            req.flash('error_msg', 'Ocena jest wymagana');
            return res.redirect(`/przepisy/${przepis._id}`);
        }

        const ocenaNum = parseInt(ocena);
        if (isNaN(ocenaNum) || ocenaNum < 1 || ocenaNum > 5) {
            console.log('Nieprawidłowa wartość oceny:', ocena);
            req.flash('error_msg', 'Ocena musi być liczbą od 1 do 5');
            return res.redirect(`/przepisy/${przepis._id}`);
        }

        // Sprawdź czy użytkownik już ocenił ten przepis
        const istniejacaOcena = przepis.oceny.find(o => o.autor.toString() === req.user.id);
        console.log('Istniejąca ocena użytkownika:', istniejacaOcena ? istniejacaOcena.ocena : 'brak');
        
        if (istniejacaOcena) {
            if (istniejacaOcena.ocena === ocenaNum) {
                console.log('Użytkownik próbuje dodać tę samą ocenę');
                req.flash('info_msg', 'Ta ocena jest już dodana');
                return res.redirect(`/przepisy/${przepis._id}`);
            }
            console.log('Aktualizacja istniejącej oceny z', istniejacaOcena.ocena, 'na', ocenaNum);
            istniejacaOcena.ocena = ocenaNum;
        } else {
            console.log('Dodawanie nowej oceny do przepisu');
            const nowaOcena = {
                autor: req.user.id,
                ocena: ocenaNum
            };
            console.log('Nowa ocena do dodania:', JSON.stringify(nowaOcena, null, 2));
            przepis.oceny.push(nowaOcena);
        }

        // Aktualizuj ocenę u użytkownika
        const userOcena = user.oceny.find(o => o.przepis.toString() === przepis._id.toString());
        
        if (userOcena) {
            console.log('Aktualizacja oceny użytkownika z', userOcena.ocena, 'na', ocenaNum);
            userOcena.ocena = ocenaNum;
        } else {
            console.log('Dodawanie nowej oceny do profilu użytkownika');
            const nowaOcenaUzytkownika = {
                przepis: przepis._id,
                ocena: ocenaNum
            };
            console.log('Nowa ocena użytkownika do dodania:', JSON.stringify(nowaOcenaUzytkownika, null, 2));
            user.oceny.push(nowaOcenaUzytkownika);
        }

        // Zapisz zmiany u użytkownika
        try {
            await user.save();
            console.log('Pomyślnie zapisano ocenę u użytkownika');
            console.log('Stan ocen użytkownika po zapisie:', JSON.stringify(user.oceny, null, 2));
        } catch (userError) {
            console.error('Błąd podczas zapisywania oceny użytkownika:', userError);
            throw userError;
        }

        // Dodaj komentarz jeśli został podany
        if (komentarz && komentarz.trim()) {
            const nowyKomentarz = {
                autor: req.user.id,
                tresc: komentarz.trim(),
                ocena: ocenaNum,
                dataUtworzenia: new Date()
            };
            console.log('Dodawanie nowego komentarza:', JSON.stringify(nowyKomentarz, null, 2));
            przepis.komentarze.push(nowyKomentarz);
        }

        // Przelicz średnią ocen
        console.log('\nStan przepisu przed przeliczeniem średniej:');
        console.log('- Liczba ocen:', przepis.oceny.length);
        console.log('- Wszystkie oceny:', JSON.stringify(przepis.oceny, null, 2));
        console.log('- Liczba komentarzy:', przepis.komentarze.length);
        console.log('- Wszystkie komentarze:', JSON.stringify(przepis.komentarze, null, 2));
        
        const staraSrednia = przepis.srednia_ocen;
        przepis.obliczSredniaOcene();
        
        console.log('\nStan przepisu po przeliczeniu średniej:');
        console.log('- Liczba ocen:', przepis.oceny.length);
        console.log('- Wszystkie oceny:', JSON.stringify(przepis.oceny, null, 2));
        console.log('- Liczba komentarzy:', przepis.komentarze.length);
        console.log('- Wszystkie komentarze:', JSON.stringify(przepis.komentarze, null, 2));
        console.log('- Stara średnia:', staraSrednia);
        console.log('- Nowa średnia:', przepis.srednia_ocen);
        
        // Zapisz zmiany w przepisie
        try {
            const zapisanyPrzepis = await przepis.save();
            console.log('\nPomyślnie zapisano przepis:');
            console.log('- ID przepisu:', zapisanyPrzepis._id);
            console.log('- Liczba ocen po zapisie:', zapisanyPrzepis.oceny.length);
            console.log('- Oceny po zapisie:', JSON.stringify(zapisanyPrzepis.oceny, null, 2));
            console.log('- Liczba komentarzy po zapisie:', zapisanyPrzepis.komentarze.length);
            console.log('- Komentarze po zapisie:', JSON.stringify(zapisanyPrzepis.komentarze, null, 2));
            console.log('- Średnia po zapisie:', zapisanyPrzepis.srednia_ocen);
            
            // Sprawdź czy wszystkie oceny zostały poprawnie zapisane
            const przepisPoZapisie = await Przepis.findById(przepis._id);
            console.log('\nWeryfikacja stanu przepisu po zapisie:');
            console.log('- Liczba ocen w bazie:', przepisPoZapisie.oceny.length);
            console.log('- Oceny w bazie:', JSON.stringify(przepisPoZapisie.oceny, null, 2));
            console.log('- Liczba komentarzy w bazie:', przepisPoZapisie.komentarze.length);
            console.log('- Komentarze w bazie:', JSON.stringify(przepisPoZapisie.komentarze, null, 2));
            console.log('- Średnia w bazie:', przepisPoZapisie.srednia_ocen);
            
            req.flash('success_msg', 'Dodano ocenę' + (komentarz ? ' i komentarz' : ''));
            res.redirect(`/przepisy/${przepis._id}`);
        } catch (saveError) {
            console.error('\nBłąd podczas zapisywania przepisu:');
            console.error('- Szczegóły błędu:', saveError);
            console.error('- Stan przepisu przed błędem:', JSON.stringify(przepis, null, 2));
            req.flash('error_msg', 'Wystąpił błąd podczas zapisywania oceny');
            res.redirect(`/przepisy/${przepis._id}`);
        }
    } catch (err) {
        console.error('\n=== Błąd podczas dodawania oceny ===');
        console.error('Szczegóły błędu:', err);
        req.flash('error_msg', 'Wystąpił błąd podczas dodawania oceny');
        res.redirect(`/przepisy/${req.params.id}`);
    }
});

// Usuwanie przepisu
router.delete('/:id', czyZalogowany, async (req, res) => {
    try {
        console.log('=== Rozpoczynam usuwanie przepisu ===');
        console.log('ID przepisu:', req.params.id);
        console.log('ID użytkownika:', req.user.id);

        const przepis = await Przepis.findById(req.params.id);
        
        if (!przepis) {
            console.log('Nie znaleziono przepisu');
            req.flash('error_msg', 'Nie znaleziono przepisu');
            return res.redirect('/przepisy');
        }

        // Sprawdź czy użytkownik jest autorem przepisu
        if (!przepis.autor.equals(req.user.id)) {
            console.log('Brak uprawnień do usunięcia przepisu');
            req.flash('error_msg', 'Nie masz uprawnień do usunięcia tego przepisu');
            return res.redirect('/przepisy');
        }

        // Usuń przepis z tablicy mojePrzepisy użytkownika
        const user = await User.findById(req.user.id);
        if (user) {
            console.log('Usuwanie przepisu z tablicy mojePrzepisy użytkownika');
            user.mojePrzepisy = user.mojePrzepisy.filter(id => !id.equals(przepis._id));
            await user.save();
        }

        // Usuń przepis z bazy danych
        console.log('Usuwanie przepisu z bazy danych');
        await Przepis.findByIdAndDelete(req.params.id);
        
        console.log('Przepis został pomyślnie usunięty');
        req.flash('success_msg', 'Przepis został usunięty');
        res.redirect('/przepisy');
    } catch (err) {
        console.error('=== Błąd podczas usuwania przepisu ===');
        console.error('Szczegóły błędu:', err);
        console.error('Stack trace:', err.stack);
        req.flash('error_msg', 'Wystąpił błąd podczas usuwania przepisu');
        res.redirect('/przepisy');
    }
});

// Usuwanie komentarza
router.delete('/:przepisId/komentarze/:komentarzId', czyZalogowany, async (req, res) => {
    try {
        console.log('\n=== ROZPOCZYNAM USUWANIE KOMENTARZA ===');
        console.log('ID przepisu:', req.params.przepisId);
        console.log('ID komentarza:', req.params.komentarzId);
        console.log('ID użytkownika:', req.user.id);

        // Znajdź przepis
        const przepis = await Przepis.findById(req.params.przepisId);
        if (!przepis) {
            console.log('Nie znaleziono przepisu');
            return res.status(404).json({ error: 'Nie znaleziono przepisu' });
        }

        // Znajdź komentarz
        const komentarz = przepis.komentarze.id(req.params.komentarzId);
        if (!komentarz) {
            console.log('Nie znaleziono komentarza');
            return res.status(404).json({ error: 'Nie znaleziono komentarza' });
        }

        // Sprawdź czy użytkownik jest autorem komentarza
        if (komentarz.autor.toString() !== req.user.id) {
            console.log('Brak uprawnień do usunięcia komentarza');
            return res.status(403).json({ error: 'Nie masz uprawnień do usunięcia tego komentarza' });
        }

        console.log('Znaleziono komentarz do usunięcia:', {
            autor: komentarz.autor,
            tresc: komentarz.tresc,
            ocena: komentarz.ocena,
            dataUtworzenia: komentarz.dataUtworzenia
        });

        // Usuń komentarz
        przepis.komentarze.pull(req.params.komentarzId);

        // Jeśli komentarz zawierał ocenę, zaktualizuj oceny
        if (komentarz.ocena) {
            // Znajdź i usuń odpowiednią ocenę
            przepis.oceny = przepis.oceny.filter(o => 
                !(o.autor.toString() === req.user.id && o.ocena === komentarz.ocena)
            );

            // Aktualizuj ocenę u użytkownika
            const user = await User.findById(req.user.id);
            if (user) {
                user.oceny = user.oceny.filter(o => 
                    !(o.przepis.toString() === przepis._id.toString() && o.ocena === komentarz.ocena)
                );
                await user.save();
                console.log('Zaktualizowano oceny użytkownika');
            }
        }

        // Przelicz średnią ocen
        przepis.obliczSredniaOcene();

        // Zapisz zmiany
        await przepis.save();
        console.log('Pomyślnie usunięto komentarz i zaktualizowano oceny');
        console.log('Nowa liczba komentarzy:', przepis.komentarze.length);
        console.log('Nowa liczba ocen:', przepis.oceny.length);
        console.log('Nowa średnia ocen:', przepis.srednia_ocen);

        res.json({ 
            success: true, 
            message: 'Komentarz został usunięty',
            sredniaOcen: przepis.srednia_ocen,
            liczbaOcen: przepis.oceny.length
        });
    } catch (err) {
        console.error('=== Błąd podczas usuwania komentarza ===');
        console.error('Szczegóły błędu:', err);
        res.status(500).json({ error: 'Wystąpił błąd podczas usuwania komentarza' });
    }
});

// Formularz edycji przepisu
router.get('/:id/edytuj', czyZalogowany, async (req, res) => {
    try {
        const przepis = await Przepis.findById(req.params.id);
        
        if (!przepis) {
            req.flash('error_msg', 'Nie znaleziono przepisu');
            return res.redirect('/przepisy');
        }

        // Sprawdź czy użytkownik jest autorem przepisu
        if (!przepis.autor.equals(req.user.id)) {
            req.flash('error_msg', 'Nie masz uprawnień do edycji tego przepisu');
            return res.redirect('/przepisy');
        }

        res.render('przepisy/nowy', { przepis });
    } catch (err) {
        console.error('Błąd podczas pobierania przepisu do edycji:', err);
        req.flash('error_msg', 'Wystąpił błąd podczas wczytywania przepisu');
        res.redirect('/przepisy');
    }
});

// Aktualizacja przepisu
router.put('/:id', czyZalogowany, upload.single('zdjecie'), async (req, res) => {
    try {
        const przepis = await Przepis.findById(req.params.id);
        
        if (!przepis) {
            req.flash('error_msg', 'Nie znaleziono przepisu');
            return res.redirect('/przepisy');
        }

        // Sprawdź czy użytkownik jest autorem przepisu
        if (!przepis.autor.equals(req.user.id)) {
            req.flash('error_msg', 'Nie masz uprawnień do edycji tego przepisu');
            return res.redirect('/przepisy');
        }

        const { nazwa, czasPrzygotowania, poziomTrudnosci, skladniki, instrukcje, tagi } = req.body;

        // Przygotowanie tablicy składników
        let przetworzoneSkladniki = [];
        if (Array.isArray(skladniki)) {
            przetworzoneSkladniki = skladniki;
        } else if (typeof skladniki === 'object') {
            const iloscSkladnikow = Object.keys(skladniki.nazwa || {}).length;
            for (let i = 0; i < iloscSkladnikow; i++) {
                przetworzoneSkladniki.push({
                    nazwa: skladniki.nazwa[i],
                    ilosc: skladniki.ilosc[i],
                    jednostka: skladniki.jednostka[i]
                });
            }
        }

        // Aktualizacja pól przepisu
        przepis.nazwa = nazwa;
        przepis.czasPrzygotowania = parseInt(czasPrzygotowania);
        przepis.poziomTrudnosci = poziomTrudnosci;
        przepis.skladniki = przetworzoneSkladniki;
        przepis.instrukcje = instrukcje;
        przepis.tagi = tagi ? tagi.split(',').map(tag => tag.trim()) : [];

        // Aktualizacja zdjęcia jeśli zostało przesłane nowe
        if (req.file) {
            przepis.zdjecie = '/uploads/' + req.file.filename;
        }

        await przepis.save();
        
        req.flash('success_msg', 'Przepis został zaktualizowany');
        res.redirect(`/przepisy/${przepis._id}`);
    } catch (err) {
        console.error('Błąd podczas aktualizacji przepisu:', err);
        req.flash('error_msg', 'Wystąpił błąd podczas aktualizacji przepisu');
        res.redirect('/przepisy');
    }
});

module.exports = router; 
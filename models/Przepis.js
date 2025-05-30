const mongoose = require('mongoose');

const komentarzSchema = new mongoose.Schema({
    tresc: {
        type: String,
        required: true
    },
    autor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    dataUtworzenia: {
        type: Date,
        default: Date.now
    },
    ocena: {
        type: Number,
        min: 1,
        max: 5,
        required: true
    }
});

const przepisSchema = new mongoose.Schema({
    nazwa: {
        type: String,
        required: true
    },
    skladniki: [{
        nazwa: String,
        ilosc: String,
        jednostka: String
    }],
    instrukcje: {
        type: String,
        required: true
    },
    czasPrzygotowania: {
        type: Number,
        required: true
    },
    poziomTrudnosci: {
        type: String,
        enum: ['Łatwy', 'Średni', 'Trudny'],
        required: true
    },
    autor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    dataUtworzenia: {
        type: Date,
        default: Date.now
    },
    oceny: [{
        ocena: {
            type: Number,
            min: 1,
            max: 5,
            required: true
        },
        autor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        }
    }],
    srednia_ocen: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
    },
    komentarze: [komentarzSchema],
    kategorie: [{
        type: String
    }],
    zdjecie: {
        type: String // URL do zdjęcia
    }
});

// Metoda do obliczania średniej oceny
przepisSchema.methods.obliczSredniaOcene = function() {
    console.log('\n=== ROZPOCZYNAM OBLICZANIE ŚREDNIEJ OCEN ===');
    console.log('ID przepisu:', this._id);
    console.log('Nazwa przepisu:', this.nazwa);
    console.log('Liczba wszystkich ocen:', this.oceny.length);
    console.log('Wszystkie oceny:', JSON.stringify(this.oceny, null, 2));
    
    if (!this.oceny || this.oceny.length === 0) {
        console.log('Brak ocen, ustawiam średnią na 0');
        this.srednia_ocen = 0;
        return 0;
    }
    
    // Filtrujemy tylko poprawne oceny (między 1 a 5)
    const poprawneOceny = this.oceny.filter(o => {
        const jestPoprawna = o && typeof o.ocena === 'number' && o.ocena >= 1 && o.ocena <= 5;
        if (!jestPoprawna) {
            console.log('Znaleziono nieprawidłową ocenę:', o);
        }
        return jestPoprawna;
    });
    
    console.log('Liczba poprawnych ocen po filtrowaniu:', poprawneOceny.length);
    console.log('Poprawne oceny:', JSON.stringify(poprawneOceny, null, 2));
    
    if (poprawneOceny.length === 0) {
        console.log('Brak poprawnych ocen, ustawiam średnią na 0');
        this.srednia_ocen = 0;
        return 0;
    }
    
    // Obliczamy sumę ocen
    let suma = 0;
    poprawneOceny.forEach((ocena, index) => {
        console.log(`Ocena ${index + 1}: ${ocena.ocena}`);
        suma += ocena.ocena;
    });
    
    const srednia = suma / poprawneOceny.length;
    const zaokraglonaSrednia = Number(srednia.toFixed(1));
    
    console.log('Suma wszystkich ocen:', suma);
    console.log('Liczba poprawnych ocen:', poprawneOceny.length);
    console.log('Obliczona średnia (przed zaokrągleniem):', srednia);
    console.log('Zaokrąglona średnia:', zaokraglonaSrednia);
    
    this.srednia_ocen = zaokraglonaSrednia;
    console.log('=== KONIEC OBLICZANIA ŚREDNIEJ OCEN ===\n');
    
    return zaokraglonaSrednia;
};

const Przepis = mongoose.model('Przepis', przepisSchema);

module.exports = Przepis; 
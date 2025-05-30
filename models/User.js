const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    nazwa: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    haslo: {
        type: String,
        required: true
    },
    dataRejestracji: {
        type: Date,
        default: Date.now
    },
    ulubionePrzepisy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Przepis'
    }],
    mojePrzepisy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Przepis'
    }],
    oceny: [{
        przepis: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Przepis'
        },
        ocena: {
            type: Number,
            min: 1,
            max: 5,
            required: true
        }
    }]
});

// Metoda do hashowania hasła przed zapisem
userSchema.pre('save', async function(next) {
    if (!this.isModified('haslo')) return next();
    
    try {
        const salt = await bcrypt.genSalt(10);
        this.haslo = await bcrypt.hash(this.haslo, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Metoda do weryfikacji hasła
userSchema.methods.sprawdzHaslo = async function(haslo) {
    return await bcrypt.compare(haslo, this.haslo);
};

// Metoda do naprawy starych ocen
userSchema.methods.naprawOceny = async function() {
    console.log('\n=== Naprawa ocen użytkownika ===');
    console.log('ID użytkownika:', this._id);
    console.log('Liczba ocen przed naprawą:', this.oceny.length);
    console.log('Oceny przed naprawą:', JSON.stringify(this.oceny, null, 2));
    
    let zmiany = false;
    
    // Napraw oceny, które mają pole wartosc zamiast ocena
    this.oceny = this.oceny.map(ocena => {
        if (ocena.wartosc) {
            console.log('Naprawiam ocenę:', ocena);
            zmiany = true;
            // Tworzymy nowy obiekt tylko z wymaganymi polami
            const naprawionaOcena = {
                przepis: ocena.przepis,
                ocena: ocena.wartosc,
                _id: ocena._id
            };
            console.log('Nowa struktura oceny:', naprawionaOcena);
            return naprawionaOcena;
        }
        return ocena;
    });
    
    if (zmiany) {
        console.log('Wprowadzono zmiany w ocenach użytkownika');
        console.log('Oceny po naprawie:', JSON.stringify(this.oceny, null, 2));
        await this.save();
    }
    
    return this;
};

const User = mongoose.model('User', userSchema);

module.exports = User; 
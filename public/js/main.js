// Funkcja do automatycznego zamykania alertów
document.addEventListener('DOMContentLoaded', function() {
    const alerts = document.querySelectorAll('.alert');
    alerts.forEach(alert => {
        setTimeout(() => {
            alert.classList.remove('show');
            setTimeout(() => alert.remove(), 150);
        }, 5000);
    });
});

// Funkcja do potwierdzania usuwania
function confirmDelete(event) {
    if (!confirm('Czy na pewno chcesz usunąć ten element?')) {
        event.preventDefault();
    }
}

// Funkcja do podglądu zdjęcia przed przesłaniem
function previewImage(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById('imagePreview');
            if (preview) {
                preview.src = e.target.result;
                preview.style.display = 'block';
            }
        };
        reader.readAsDataURL(input.files[0]);
    }
}

// Funkcja do formatowania daty
function formatDate(date) {
    return new Date(date).toLocaleDateString('pl-PL', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Funkcja do walidacji formularza
function validateForm(form) {
    let isValid = true;
    const requiredFields = form.querySelectorAll('[required]');
    
    requiredFields.forEach(field => {
        if (!field.value.trim()) {
            isValid = false;
            field.classList.add('is-invalid');
        } else {
            field.classList.remove('is-invalid');
        }
    });
    
    return isValid;
}

// Funkcja do obsługi formularzy z AJAX
async function handleFormSubmit(event, url, method = 'POST') {
    event.preventDefault();
    
    if (!validateForm(event.target)) {
        return;
    }
    
    const formData = new FormData(event.target);
    
    try {
        const response = await fetch(url, {
            method: method,
            body: formData
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showAlert('success', data.message);
            if (data.redirect) {
                window.location.href = data.redirect;
            }
        } else {
            showAlert('danger', data.message || 'Wystąpił błąd');
        }
    } catch (error) {
        showAlert('danger', 'Wystąpił błąd podczas przetwarzania żądania');
    }
}

// Funkcja do wyświetlania alertów
function showAlert(type, message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.role = 'alert';
    
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    const container = document.querySelector('.container');
    container.insertBefore(alertDiv, container.firstChild);
    
    setTimeout(() => {
        alertDiv.classList.remove('show');
        setTimeout(() => alertDiv.remove(), 150);
    }, 5000);
}

// Funkcja do obsługi infinite scroll
function initInfiniteScroll(container, url, options = {}) {
    let page = 1;
    let loading = false;
    
    window.addEventListener('scroll', async () => {
        if (loading) return;
        
        const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
        
        if (scrollTop + clientHeight >= scrollHeight - 5) {
            loading = true;
            
            try {
                const response = await fetch(`${url}?page=${++page}`);
                const data = await response.json();
                
                if (data.items && data.items.length > 0) {
                    container.insertAdjacentHTML('beforeend', data.items);
                    if (options.callback) {
                        options.callback(data);
                    }
                }
            } catch (error) {
                console.error('Błąd podczas ładowania kolejnych elementów:', error);
            } finally {
                loading = false;
            }
        }
    });
}

// Funkcja do obsługi wyszukiwania w czasie rzeczywistym
function initLiveSearch(input, url, resultContainer) {
    let timeout;
    
    input.addEventListener('input', () => {
        clearTimeout(timeout);
        
        timeout = setTimeout(async () => {
            const query = input.value.trim();
            
            if (query.length < 2) {
                resultContainer.innerHTML = '';
                return;
            }
            
            try {
                const response = await fetch(`${url}?q=${encodeURIComponent(query)}`);
                const data = await response.json();
                
                if (data.results) {
                    resultContainer.innerHTML = data.results;
                }
            } catch (error) {
                console.error('Błąd podczas wyszukiwania:', error);
            }
        }, 300);
    });
} 
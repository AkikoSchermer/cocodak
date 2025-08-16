const lazyImages = document.querySelectorAll('img.lazy');

const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const img = entry.target;
            img.src = img.getAttribute('data-src');
            img.removeAttribute('data-src');
            observer.unobserve(img);
        }
    });
}, { rootMargin: '200px' });

lazyImages.forEach(img => observer.observe(img));

const navToggleBtn = document.querySelector('[data-nav-toggle-btn]')
const header = document.querySelector('[data-header]')

navToggleBtn.addEventListener('click', () =>
{
    header.classList.toggle('active')
})


if (("standalone" in window.navigator) && window.navigator.standalone) {
    document.addEventListener('click', function(event) {
        const a = event.target.closest('a');
        
        
        if (a && a.href && a.target !== '_blank' && a.host === window.location.host) {
            event.preventDefault(); 
            
            
            const rutaRelativa = a.getAttribute('href');
            
            if (rutaRelativa) {
                window.location.replace(rutaRelativa); 
            }
        }
    }, false);
}

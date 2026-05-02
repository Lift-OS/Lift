// Inicialização principal
document.addEventListener("DOMContentLoaded", function() {
    console.log("Lift OS iniciado");
    // Verifica se já está logado
    if (window.Auth && window.Auth.getUser()) {
        console.log("Usuário já logado:", window.Auth.getUser().login);
    }
});
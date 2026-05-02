// js/utils.js
window.Auth = {
    // Lista de usuários fixa (para teste)
    users: [
        { login: "admin", senha: "123", nome: "Administrador" },
        { login: "tecnico", senha: "tec", nome: "Técnico" }
    ],

    // Função chamada pelo botão de login
    login: function() {
        const loginInput = document.getElementById("login")?.value;
        const senhaInput = document.getElementById("senha")?.value;

        if (!loginInput || !senhaInput) {
            alert("Preencha login e senha");
            return false;
        }

        const user = this.users.find(u => u.login === loginInput && u.senha === senhaInput);
        if (user) {
            localStorage.setItem("LIFTOS_currentUser", JSON.stringify(user));
            alert("Login bem-sucedido!");
            // Redirecione ou recarregue a página para mostrar o painel
            window.location.href = "painel.html"; // ou recarregue: location.reload()
            return true;
        } else {
            alert("Usuário ou senha inválidos");
            return false;
        }
    },

    logout: function() {
        localStorage.removeItem("LIFTOS_currentUser");
        window.location.href = "index.html";
    },

    getUser: function() {
        const user = localStorage.getItem("LIFTOS_currentUser");
        return user ? JSON.parse(user) : null;
    }
};

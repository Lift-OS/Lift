// Utilitários e Auth
window.Auth = {
    users: [
        { login: "admin", senha: "123", nome: "Administrador" },
        { login: "tecnico", senha: "tec", nome: "Técnico" }
    ],

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
            // Opcional: redirecionar para um dashboard
            // window.location.href = "dashboard.html";
            return true;
        } else {
            alert("Usuário ou senha inválidos");
            return false;
        }
    },

    logout: function() {
        localStorage.removeItem("LIFTOS_currentUser");
        window.location.reload();
    },

    getUser: function() {
        const user = localStorage.getItem("LIFTOS_currentUser");
        return user ? JSON.parse(user) : null;
    }
};
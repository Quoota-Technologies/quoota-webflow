// ===== Variables globales =====
let authProvider = null;

// ===== Constantes =====
const CONFIG = {
  LOGIN_URL: "/login", // URL a la que redirigir después del logout
  MAX_WAIT_TIME: 5000, // Tiempo máximo de espera para Firebase Auth
  CHECK_INTERVAL: 100, // Intervalo de verificación en milisegundos
};

const UI_ELEMENTS = {
  signOutButton: () => document.getElementById("sign-out-button"),
};

const ERROR_MESSAGES = {
  SIGNOUT_ERROR: "Error al cerrar sesión. Inténtelo de nuevo.",
  FIREBASE_ERROR: "Firebase no está disponible.",
};

// ===== Utilidades globales =====
const utils = {
  redirectTo: (url) => {
    window.location.href = url;
  },

  // Esperar a que Firebase Auth esté disponible
  async waitForFirebaseAuth() {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      const checkAuth = () => {
        // Verificar si auth está disponible globalmente
        if (typeof auth !== "undefined" && auth !== null) {
          authProvider = auth;
          console.log("Firebase Auth detectado en home.html");
          resolve(auth);
          return;
        }

        // Verificar si ha pasado el tiempo máximo de espera
        if (Date.now() - startTime > CONFIG.MAX_WAIT_TIME) {
          console.error("Timeout esperando Firebase Auth en home.html");
          reject(new Error("Firebase Auth no disponible"));
          return;
        }

        // Continuar verificando
        setTimeout(checkAuth, CONFIG.CHECK_INTERVAL);
      };

      checkAuth();
    });
  },
};

// ===== Servicios de autenticación =====
const authService = {
  async signOut() {
    try {
      if (!authProvider) {
        console.error("AuthProvider no está disponible");
        return { success: false, error: ERROR_MESSAGES.FIREBASE_ERROR };
      }

      await signOut(authProvider);
      console.log("Usuario desconectado exitosamente");
      return { success: true };
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      return { success: false, error: ERROR_MESSAGES.SIGNOUT_ERROR };
    }
  },
};

// ===== Controladores de UI =====
const uiController = {
  disableSignOutButton() {
    const button = UI_ELEMENTS.signOutButton();
    if (button) {
      button.disabled = true;
      button.textContent = "Cerrando sesión...";
    }
  },

  enableSignOutButton() {
    const button = UI_ELEMENTS.signOutButton();
    if (button) {
      button.disabled = false;
      button.textContent = "Cerrar sesión";
    }
  },

  handleSignOutSuccess() {
    console.log("Redirigiendo a login...");
    // Redirigir después de un breve delay
    setTimeout(() => {
      utils.redirectTo(CONFIG.LOGIN_URL);
    }, 500);
  },

  handleSignOutError(error) {
    this.enableSignOutButton();
    console.error("Error en sign out:", error);
    alert(error); // Puedes cambiar esto por un modal si prefieres
  },
};

// ===== Event Listeners =====
const eventListeners = {
  init() {
    this.setupDOMContentLoaded();
  },

  setupDOMContentLoaded() {
    document.addEventListener("DOMContentLoaded", async () => {
      console.log("Home page loaded");

      try {
        // Esperar a que Firebase esté disponible
        await utils.waitForFirebaseAuth();

        // Configurar event listener del botón
        this.setupSignOutButton();
      } catch (error) {
        console.error("Error inicializando Firebase en home:", error);
      }
    });
  },

  setupSignOutButton() {
    const signOutButton = UI_ELEMENTS.signOutButton();

    if (signOutButton) {
      signOutButton.addEventListener("click", async (event) => {
        event.preventDefault();
        await this.handleSignOut();
      });
      console.log("Event listener configurado para sign-out-button");
    } else {
      console.warn("Botón sign-out-button no encontrado");
    }
  },

  async handleSignOut() {
    uiController.disableSignOutButton();

    const result = await authService.signOut();

    if (result.success) {
      uiController.handleSignOutSuccess();
    } else {
      uiController.handleSignOutError(result.error);
    }
  },
};

// ===== Inicialización =====
eventListeners.init();

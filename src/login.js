
// ===== Variables globales =====
let gCurrentUser = null;
let authProvider = null;

// ===== Constantes =====
const CONFIG = {
  REDIRECT_URL: "/inicio", // URL a la que redirigir después del login exitoso
  MAX_WAIT_TIME: 10000, // Tiempo máximo de espera para Firebase Auth (10 segundos)
  CHECK_INTERVAL: 100, // Intervalo de verificación en milisegundos
};

const UI_ELEMENTS = {
  submitButton: () => document.getElementById("login-form-submit-button"),
  emailInput: () => document.getElementById("email"),
  passwordInput: () => document.getElementById("password"),
  errorDialog: () => document.getElementById("error-dialog"),
  errorDialogMessage: () => document.getElementById("error-dialog-message"),
  loadingDialog: () => document.getElementById("loading-dialog"),
  loginForm: () => document.getElementById("login-form"),
};

const ERROR_MESSAGES = {
  MISSING_FIELDS: "Por favor, complete todos los campos requeridos.",
  INVALID_CREDENTIAL: "Las credenciales proporcionadas son inválidas.",
  USER_NOT_FOUND: "No se encontró una cuenta con este email.",
  TOO_MANY_ATTEMPTS:
    "Demasiados intentos fallidos. Intente de nuevo más tarde.",
  NETWORK_ERROR:
    "Error de conexión. Verifique su internet e intente de nuevo.",
  UNEXPECTED_ERROR: "Error inesperado. Por favor, contacte soporte.",
};

// ===== Utilidades globales =====
const utils = {
  delay: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),

  validateEmail: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  showElement: (element) => {
    if (element) element.style.display = "flex";
  },

  hideElement: (element) => {
    if (element) element.style.display = "none";
  },

  redirectTo: (url) => {
    window.location.href = url;
  },

  // Verificar si el usuario está autenticado
  isUserAuthenticated() {
    if (!authProvider) return false;
    const currentUser = authProvider.currentUser;
    return currentUser !== null && currentUser !== undefined;
  },

  // Obtener información del usuario actual
  getCurrentUserInfo() {
    if (!authProvider || !authProvider.currentUser) return null;
    return {
      uid: authProvider.currentUser.uid,
      email: authProvider.currentUser.email,
      emailVerified: authProvider.currentUser.emailVerified,
      displayName: authProvider.currentUser.displayName,
    };
  },

  // Esperar a que Firebase Auth esté disponible
  async waitForFirebaseAuth() {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      const checkAuth = () => {
        // Verificar si auth está disponible globalmente
        if (typeof auth !== "undefined" && auth !== null) {
          authProvider = auth;
          console.log("Firebase Auth detectado y configurado");
          resolve(auth);
          return;
        }

        // Verificar si ha pasado el tiempo máximo de espera
        if (Date.now() - startTime > CONFIG.MAX_WAIT_TIME) {
          console.error("Timeout esperando Firebase Auth");
          reject(
            new Error("Firebase Auth no disponible después del timeout")
          );
          return;
        }

        // Continuar verificando
        setTimeout(checkAuth, CONFIG.CHECK_INTERVAL);
      };

      checkAuth();
    });
  },
};



// ===== Servicios de Firebase Auth =====
const authService = {
  async signInWithEmail(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(
        authProvider,
        email,
        password
      );
      return { success: true, user: userCredential.user };
    } catch (error) {
      console.error("Error en autenticación:", error);
      return { success: false, error: this.mapFirebaseError(error) };
    }
  },

  mapFirebaseError(error) {
    switch (error.code) {
      case "auth/user-not-found":
        return ERROR_MESSAGES.USER_NOT_FOUND;
      case "auth/invalid-credential":
        return ERROR_MESSAGES.INVALID_CREDENTIAL;
      case "auth/too-many-requests":
        return ERROR_MESSAGES.TOO_MANY_ATTEMPTS;
      case "auth/network-request-failed":
        return ERROR_MESSAGES.NETWORK_ERROR;
      default:
        return ERROR_MESSAGES.UNEXPECTED_ERROR;
    }
  },

  getCurrentUser() {
    return authProvider?.currentUser;
  },

  // Verificar de manera asíncrona el estado de autenticación
  async checkAuthState() {
    return new Promise((resolve) => {
      if (!authProvider) {
        resolve(null);
        return;
      }

      // Si ya hay un usuario, devolverlo inmediatamente
      if (authProvider.currentUser) {
        resolve(authProvider.currentUser);
        return;
      }

      // Escuchar cambios de estado una sola vez
      const unsubscribe = authProvider.onAuthStateChanged((user) => {
        unsubscribe(); // Desuscribirse inmediatamente
        resolve(user);
      });

      // Timeout para evitar esperas indefinidas
      setTimeout(() => {
        unsubscribe();
        resolve(null);
      }, 3000);
    });
  },

  async signOut() {
    try {
      await signOut(authProvider);
      return { success: true };
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      return { success: false, error: ERROR_MESSAGES.UNEXPECTED_ERROR };
    }
  },
};



// ===== Validadores =====
const validators = {
  validateLoginForm() {
    const email = UI_ELEMENTS.emailInput()?.value?.trim();
    const password = UI_ELEMENTS.passwordInput()?.value?.trim();

    if (!email || !password) {
      return { isValid: false, error: ERROR_MESSAGES.MISSING_FIELDS };
    }

    if (!utils.validateEmail(email)) {
      return { isValid: false, error: ERROR_MESSAGES.INVALID_EMAIL };
    }

    return { isValid: true, email, password };
  },
};

// ===== Procesadores de datos de formulario =====
const formDataProcessor = {
  getLoginFormData() {
    const emailInput = UI_ELEMENTS.emailInput();
    const passwordInput = UI_ELEMENTS.passwordInput();

    return {
      email: emailInput?.value?.trim() || "",
      password: passwordInput?.value?.trim() || "",
    };
  },

  clearLoginForm() {
    const emailInput = UI_ELEMENTS.emailInput();
    const passwordInput = UI_ELEMENTS.passwordInput();

    if (emailInput) emailInput.value = "";
    if (passwordInput) passwordInput.value = "";
  },
};

// ===== Controladores de negocio =====
const businessController = {
  async processLogin() {
    try {
      // Validar formulario
      const validation = validators.validateLoginForm();
      if (!validation.isValid) {
        return { success: false, error: validation.error };
      }

      // Intentar autenticación
      const result = await authService.signInWithEmail(
        validation.email,
        validation.password
      );

      if (result.success) {
        gCurrentUser = result.user;
        console.log("Login exitoso:", result.user);
      }

      return result;
    } catch (error) {
      console.error("Error en proceso de login:", error);
      return { success: false, error: ERROR_MESSAGES.UNEXPECTED_ERROR };
    }
  },
};



// ===== Controladores de UI =====
const uiController = {
  showErrorDialog(message) {
    const errorDialogMessage = UI_ELEMENTS.errorDialogMessage();
    const errorDialog = UI_ELEMENTS.errorDialog();

    if (errorDialogMessage) errorDialogMessage.textContent = message;
    if (errorDialog) {
      utils.showElement(errorDialog);
      // Configurar event listeners después de mostrar el modal
      eventListeners.setupErrorDialogEvents();
    }
  },

  hideErrorDialog() {
    const errorDialogMessage = UI_ELEMENTS.errorDialogMessage();
    const errorDialog = UI_ELEMENTS.errorDialog();

    if (errorDialog) utils.hideElement(errorDialog);
    if (errorDialogMessage) errorDialogMessage.textContent = "";
  },

  showLoadingDialog() {
    const loadingDialog = UI_ELEMENTS.loadingDialog();
    if (loadingDialog) utils.showElement(loadingDialog);
  },

  hideLoadingDialog() {
    const loadingDialog = UI_ELEMENTS.loadingDialog();
    if (loadingDialog) utils.hideElement(loadingDialog);
  },

  disableSubmitButton() {
    const submitButton = UI_ELEMENTS.submitButton();
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Iniciando sesión...";
    }
  },

  enableSubmitButton() {
    const submitButton = UI_ELEMENTS.submitButton();
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = "Iniciar sesión";
    }
  },

  handleLoginSuccess(user) {
    console.log("Redirigiendo usuario:", user.email);

    // Opcional: Mostrar mensaje de éxito brevemente antes de redirigir
    this.hideLoadingDialog();

    // Redirigir después de un breve delay
    setTimeout(() => {
      utils.redirectTo(CONFIG.REDIRECT_URL);
    }, 500);
  },

  handleLoginError(error) {
    this.hideLoadingDialog();
    this.enableSubmitButton();
    this.showErrorDialog(error);
  },
};



// ===== Event Listeners =====
const eventListeners = {
  init() {
    this.setupDOMContentLoaded();
    this.setupLoginForm();
    this.setupAuthStateListener();
  },

  setupDOMContentLoaded() {
    document.addEventListener("DOMContentLoaded", async () => {
      console.log("Login page loaded");

      // Esperar a que Firebase esté disponible antes de verificar autenticación
      try {
        if (!authProvider) {
          console.log("Esperando Firebase Auth en DOMContentLoaded...");
          await utils.waitForFirebaseAuth();
        }

        // Verificar si ya hay un usuario autenticado
        this.checkExistingAuth();
      } catch (error) {
        console.error("Error esperando Firebase Auth:", error);
      }
    });
  },

  setupLoginForm() {
    const loginForm = UI_ELEMENTS.loginForm();
    const submitButton = UI_ELEMENTS.submitButton();

    // Event listener para el formulario
    if (loginForm) {
      loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        await this.handleLoginSubmit();
      });
    }

    // Event listener para el botón de submit
    if (submitButton) {
      submitButton.addEventListener("click", async (event) => {
        event.preventDefault();
        await this.handleLoginSubmit();
      });
    }

    // Event listeners para inputs (Enter key)
    const emailInput = UI_ELEMENTS.emailInput();
    const passwordInput = UI_ELEMENTS.passwordInput();

    if (emailInput) {
      emailInput.addEventListener("keypress", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          this.handleLoginSubmit();
        }
      });
    }

    if (passwordInput) {
      passwordInput.addEventListener("keypress", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          this.handleLoginSubmit();
        }
      });
    }
  },

  async handleLoginSubmit() {
    uiController.showLoadingDialog();
    uiController.disableSubmitButton();

    const result = await businessController.processLogin();

    if (result.success) {
      uiController.handleLoginSuccess(result.user);
    } else {
      uiController.handleLoginError(result.error);
    }
  },

  setupErrorDialogEvents() {
    // Configurar event listeners del modal de error
    const closeButton = document.getElementById("error-dialog-close-button");
    if (closeButton && !closeButton.dataset.listenerConfigured) {
      closeButton.addEventListener("click", (event) => {
        uiController.hideErrorDialog();
      });
      closeButton.dataset.listenerConfigured = "true";
    }
  },

  setupAuthStateListener() {
    // Listener para cambios en el estado de autenticación
    if (authProvider) {
      authProvider.onAuthStateChanged((user) => {
        if (user) {
          console.log("Usuario ya autenticado:", user.email);
          gCurrentUser = user;
          // Si ya está autenticado, redirigir
          utils.redirectTo(CONFIG.REDIRECT_URL);
        } else {
          console.log("Usuario no autenticado");
          gCurrentUser = null;
        }
      });
    } else {
      console.log("AuthProvider no disponible para setupAuthStateListener");
    }
  },

  checkExistingAuth() {
    // Verificar si ya hay un usuario autenticado al cargar la página
    if (utils.isUserAuthenticated()) {
      const userInfo = utils.getCurrentUserInfo();
      console.log("Usuario ya autenticado al cargar:", userInfo?.email);
      gCurrentUser = authProvider.currentUser;
      utils.redirectTo(CONFIG.REDIRECT_URL);
      return;
    }

    // Si no hay usuario inmediatamente disponible, verificar de manera asíncrona
    this.checkAuthStateAsync();
  },

  async checkAuthStateAsync() {
    try {
      const user = await authService.checkAuthState();
      if (user) {
        console.log("Usuario autenticado detectado:", user.email);
        gCurrentUser = user;
        utils.redirectTo(CONFIG.REDIRECT_URL);
      } else {
        console.log("No hay usuario autenticado");
      }
    } catch (error) {
      console.error("Error verificando estado de autenticación:", error);
    }
  },
};

// Inicializar event listeners
eventListeners.init();



// ===== Inicialización de la página de login =====
const loginController = {
  async init() {
    console.log("Inicializando página de login...");

    try {
      // Esperar a que Firebase Auth esté disponible
      console.log("Esperando Firebase Auth...");
      await utils.waitForFirebaseAuth();

      console.log("Firebase Auth disponible, página lista.");

      // Verificar inmediatamente si hay un usuario autenticado
      await this.performInitialAuthCheck();
    } catch (error) {
      console.error("Error inicializando Firebase Auth:", error);
      uiController.showErrorDialog(
        "Error de configuración. Por favor, recargue la página."
      );
    }
  },

  async performInitialAuthCheck() {
    // Primera verificación: usuario ya disponible
    if (utils.isUserAuthenticated()) {
      const userInfo = utils.getCurrentUserInfo();
      console.log(
        "Usuario ya autenticado en inicialización:",
        userInfo?.email
      );
      gCurrentUser = authProvider.currentUser;
      utils.redirectTo(CONFIG.REDIRECT_URL);
      return;
    }

    // Segunda verificación: esperar estado de autenticación
    try {
      const user = await authService.checkAuthState();
      if (user) {
        console.log(
          "Usuario autenticado detectado en inicialización:",
          user.email
        );
        gCurrentUser = user;
        utils.redirectTo(CONFIG.REDIRECT_URL);
      } else {
        console.log("No hay usuario autenticado - mostrando login");
      }
    } catch (error) {
      console.error("Error en verificación inicial de autenticación:", error);
    }
  },
};

// Inicializar cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", async () => {
  await loginController.init();
});


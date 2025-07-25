
// ===== Variables globales =====
let gUser = null;
let gCurrentPaymentId = null;
let gCurrentExchangeRate = null;

// ===== Constantes =====
const CONFIG = {
  API_BASE_URL: "https://api.quoota.com/v1",
  AIRTABLE_BASE_URL: "https://api.airtable.com/v0/appGumyin5Xb5JkXR",
  AIRTABLE_TOKEN:
    "Bearer patI5e432yDWTmpLq.31b1b77d953e29d548caf28995864ae95b5b67a1eff7d18b6882c019bb01ae95",
  PAYMENT_CONCEPT: "Pago de Quoota",
  PHONE_PREFIX: "58",
};

const PAYMENT_STATUSES = {
  SCHEDULED: "Scheduled",
  DELAYED: "Delayed",
  PAID: "Paid",
  PAID_LATE: "Paid late",
  UNDER_REVIEW: "Por revisar",
  DATA_ERROR: "Error en datos",
  NO_MATCH: "No coincide",
  AMOUNT_ERROR: "Error en monto",
  REFINANCED: "Refinanciado",
  CANCELED: "Canceled",
};

const UI_ELEMENTS = {
  loadingDialog: () => document.getElementById("loading-dialog"),
  loadingDialogModal: () => document.getElementById("loading-dialog-modal"),
  debitTokenModal: () => document.getElementById("debit-token-modal"),
  debitTokenInput: () => document.getElementById("debit-token"),
  errorDialog: () => document.getElementById("error-dialog"),
  errorDialogMessage: () => document.getElementById("error-dialog-message"),
  successDialog: () => document.getElementById("success-dialog"),
  successDialogMessage: () =>
    document.getElementById("success-dialog-message"),
};

const ERROR_MESSAGES = {
  MISSING_PAYMENT_ID:
    "Error al procesar el pago. Por favor, contacta soporte.",
  MISSING_FIELDS: "Por favor, complete todos los campos requeridos.",
  USER_NOT_LOADED:
    "Ocurrió un error. Por favor, recarga la página o contacta a soporte técnico.",
  UNEXPECTED_ERROR: "Error inesperado al procesar el pago.",
  TOKEN_SEND_ERROR:
    "No se pudo enviar el token. Revisa que el número de telefono introducido. Si el error persiste, contacta con soporte técnico.",
};

// ===== Utilidades globales =====
const utils = {
  delay: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),

  isUserLoaded: () => gUser !== null,

  round: (x) => (Math.round(x * 100) / 100).toFixed(0),

  roundTwo: (x) => (Math.round(x * 100) / 100).toFixed(2),

  formatNumber: (number) =>
    number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "."),

  formatPhoneNumber: (whatsapp) => {
    if (whatsapp.length > 4 && whatsapp.startsWith(CONFIG.PHONE_PREFIX)) {
      const extension = "0" + whatsapp.slice(2, 5);
      const number = whatsapp.slice(5);
      return { extension, number };
    }
    return null;
  },

  formatNationalId: (cedula) => {
    if (cedula.includes("-")) {
      const [letter, numbersWithDots] = cedula.split("-");
      const numbers = numbersWithDots.replace(/\./g, "");
      return { letter, numbers };
    }
    return null;
  },

  showElement: (element) => (element.style.display = "flex"),
  hideElement: (element) => (element.style.display = "none"),

  setElementHTML: (selector, value) => {
    const element = document.querySelector(selector);
    if (element) element.innerHTML = value;
  },
};

// ===== Servicios de API =====
const apiService = {
  async getBankList() {
    const url = `${CONFIG.API_BASE_URL}/payments/banks`;
    const response = await fetch(url, { method: "GET" });
    const data = await response.json();
    return data.data.banks;
  },

  async requestDebitToken(paymentData) {
    const { paymentId, bankCode, nationalId, phone } = paymentData;

    if (!paymentId) {
      console.error("paymentId was not provided");
      return { error: ERROR_MESSAGES.MISSING_PAYMENT_ID };
    }

    if (!bankCode || !nationalId || !phone) {
      return { error: ERROR_MESSAGES.MISSING_FIELDS };
    }

    const url = `${CONFIG.API_BASE_URL}/payments/debit/tokenRequest`;
    const body = { paymentId, bankCode, nationalId, phone };

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    return response.json();
  },

  async payDebit(paymentData) {
    const { paymentId, bankCode, nationalId, phone, name, token } =
      paymentData;

    if (!paymentId) {
      console.error("paymentId was not provided");
      return { error: ERROR_MESSAGES.MISSING_PAYMENT_ID };
    }

    if (!bankCode || !nationalId || !phone || !name || !token) {
      return { error: ERROR_MESSAGES.MISSING_FIELDS };
    }

    const url = `${CONFIG.API_BASE_URL}/payments/debit`;
    const body = {
      paymentId,
      bankCode,
      nationalId,
      phone,
      name,
      concept: CONFIG.PAYMENT_CONCEPT,
      token,
    };

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const result = await response.json();
    const err = result.error;
    return err ? { error: `${err.message}: ${err.details}` } : result;
  },

  async getExchangeRate() {
    const url = `${CONFIG.API_BASE_URL}/currencies/usd`;
    const response = await fetch(url, { method: "GET" });
    const data = await response.json();
    return data.data.rate;
  },

  async processPagoMovil(paymentData) {
    const { paymentId, reference, date, amount } = paymentData;

    if (!paymentId) {
      console.error("paymentId was not provided");
      return { error: ERROR_MESSAGES.MISSING_PAYMENT_ID };
    }

    if (!reference || !date || !amount) {
      return { error: ERROR_MESSAGES.MISSING_FIELDS };
    }

    const url = `${CONFIG.API_BASE_URL}/payments/referencedOperation`;
    const body = { paymentId, reference, date, amount };

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const result = await response.json();

    // Si hay error, devolverlo con el mensaje específico para el usuario
    if (!result.success && result.error) {
      return { error: result.error.details || result.error.message };
    }

    return result;
  },
};

// ===== Servicios de Airtable =====
const airtableService = {
  headers: {
    Authorization: CONFIG.AIRTABLE_TOKEN,
    "Content-Type": "application/json",
  },

  async getEmployeeData(employeeID) {
    const url = `${CONFIG.AIRTABLE_BASE_URL}/employees/${employeeID}`;
    const response = await fetch(url, {
      method: "GET",
      headers: this.headers,
    });
    return response.json();
  },

  async getLoanRequestsInfo(loanRequestsIDs) {
    const requests = loanRequestsIDs.map(async (id) => {
      const url = `${CONFIG.AIRTABLE_BASE_URL}/loan_requests/${id}`;
      const response = await fetch(url, {
        method: "GET",
        headers: this.headers,
      });
      return response.json();
    });

    const results = await Promise.all(requests);
    return results.sort(
      (a, b) => new Date(b.createdTime) - new Date(a.createdTime)
    );
  },

  async getLoansInfo(loansIDs) {
    const requests = loansIDs.map(async (id) => {
      const url = `${CONFIG.AIRTABLE_BASE_URL}/loans/${id}`;
      const response = await fetch(url, {
        method: "GET",
        headers: this.headers,
      });
      return response.json();
    });

    const results = await Promise.all(requests);
    return results.sort(
      (a, b) => new Date(b.createdTime) - new Date(a.createdTime)
    );
  },

  async getPaymentsInfo(loans) {
    const allPayments = [];

    for (const loan of loans) {
      if (loan.fields.payments && loan.fields.payments_count_total > 0) {
        const paymentRequests = loan.fields.payments.map(
          async (paymentId) => {
            const url = `${CONFIG.AIRTABLE_BASE_URL}/payments/${paymentId}`;
            const response = await fetch(url, {
              method: "GET",
              headers: this.headers,
            });
            return response.json();
          }
        );

        const payments = await Promise.all(paymentRequests);
        allPayments.push(...payments);
      }
    }

    return allPayments.sort(
      (a, b) => new Date(b.createdTime) - new Date(a.createdTime)
    );
  },
};

// ===== Validadores =====
const validators = {
  canOpenDebitTokenModal() {
    const requiredFields = [
      "debit-bank",
      "debit-nid-type",
      "debit-nid-number",
      "debit-phone-extension",
      "debit-phone-number",
    ];

    for (const fieldId of requiredFields) {
      const value = document.getElementById(fieldId).value;
      if (!value || value === "none" || value === "") {
        uiController.showErrorDialog(ERROR_MESSAGES.MISSING_FIELDS);
        return false;
      }
    }
    return true;
  },

  canProcessPagoMovil() {
    const requiredFields = [
      "pagomovil-date",
      "pagomovil-phone-extension",
      "pagomovil-phone-number",
      "pagomovil-nid-type",
      "pagomovil-nid-number",
      "pagomovil-reference",
      "pagomovil-amount",
    ];

    for (const fieldId of requiredFields) {
      const value = document.getElementById(fieldId).value;
      if (!value || value === "none" || value === "") {
        uiController.showErrorDialog(ERROR_MESSAGES.MISSING_FIELDS);
        return false;
      }
    }
    return true;
  },
};

// ===== Procesadores de datos de formulario =====
const formDataProcessor = {
  getDebitFormData() {
    const paymentId = gCurrentPaymentId;

    const bankCode = document.getElementById("debit-bank").value;
    const nationalIdType = document
      .getElementById("debit-nid-type")
      .value.toUpperCase();
    const nationalIdNumber =
      document.getElementById("debit-nid-number").value;
    const nationalId = `${nationalIdType}${nationalIdNumber}`;

    const phoneExt = document.getElementById("debit-phone-extension").value;
    const phoneExtTrimmed = phoneExt.substring(1);
    const phoneNumber = document.getElementById("debit-phone-number").value;
    const phone = `${CONFIG.PHONE_PREFIX}${phoneExtTrimmed}${phoneNumber}`;

    return { paymentId, bankCode, nationalId, phone };
  },

  getPagoMovilFormData() {
    const paymentId = gCurrentPaymentId;

    const reference = document.getElementById("pagomovil-reference").value;
    const rawDate = document.getElementById("pagomovil-date").value;
    const rawAmount = document.getElementById("pagomovil-amount").value;

    // Parsear fecha al formato dd-mm-yyyy
    const date = this.formatDateToDDMMYYYY(rawDate);

    // Truncar a 2 decimales máximo
    const amount = parseFloat(parseFloat(rawAmount).toFixed(2));

    return { paymentId, reference, date, amount };
  },

  formatDateToDDMMYYYY(inputDate) {
    // Si la fecha ya está en formato dd-mm-yyyy, devolverla tal como está
    if (/^\d{2}-\d{2}-\d{4}$/.test(inputDate)) {
      return inputDate;
    }

    // Si la fecha está en formato yyyy-mm-dd (HTML date input), convertirla
    if (/^\d{4}-\d{2}-\d{2}$/.test(inputDate)) {
      const [year, month, day] = inputDate.split("-");
      return `${day}-${month}-${year}`;
    }

    // Si la fecha está en formato dd/mm/yyyy, convertirla
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(inputDate)) {
      return inputDate.replace(/\//g, "-");
    }

    // Si no coincide con ningún formato esperado, intentar parsear como Date
    try {
      const dateObj = new Date(inputDate);
      if (isNaN(dateObj.getTime())) {
        throw new Error("Invalid date");
      }
      const day = String(dateObj.getDate()).padStart(2, "0");
      const month = String(dateObj.getMonth() + 1).padStart(2, "0");
      const year = dateObj.getFullYear();
      return `${day}-${month}-${year}`;
    } catch (error) {
      console.error("Error parsing date:", inputDate);
      return inputDate; // Devolver la fecha original si no se puede parsear
    }
  },
};

// ===== Controladores de negocio =====
const businessController = {
  async requestDebitToken() {
    if (!utils.isUserLoaded()) {
      console.error(
        "User data not loaded. Cannot continue with transaction."
      );
      return { error: ERROR_MESSAGES.USER_NOT_LOADED };
    }

    try {
      const formData = formDataProcessor.getDebitFormData();
      return await apiService.requestDebitToken(formData);
    } catch (error) {
      console.error("unknown error processing payment transaction: ", error);
      return { error: ERROR_MESSAGES.UNEXPECTED_ERROR };
    }
  },

  async processDebitPayment() {
    if (!utils.isUserLoaded()) {
      console.error(
        "User data not loaded. Cannot continue with transaction."
      );
      return { error: ERROR_MESSAGES.USER_NOT_LOADED };
    }

    try {
      const formData = formDataProcessor.getDebitFormData();
      const paymentData = {
        ...formData,
        name: gUser.name,
        token: UI_ELEMENTS.debitTokenInput().value,
      };

      const response = await apiService.payDebit(paymentData);

      if (!response.error) {
        console.log(
          `Pago realizado exitosamente. ID de transacción: ${response.transaction_id}`
        );
      }

      return response;
    } catch (error) {
      console.error("unknown error processing payment transaction: ", error);
      return { error: ERROR_MESSAGES.UNEXPECTED_ERROR };
    }
  },

  async processPagoMovilPayment() {
    if (!utils.isUserLoaded()) {
      console.error(
        "User data not loaded. Cannot continue with transaction."
      );
      return { error: ERROR_MESSAGES.USER_NOT_LOADED };
    }

    try {
      const formData = formDataProcessor.getPagoMovilFormData();
      const response = await apiService.processPagoMovil(formData);

      if (response.success) {
        console.log(
          `Pago Móvil procesado exitosamente. Referencia: ${response.data.reference}`
        );
      }

      return response;
    } catch (error) {
      console.error("unknown error processing pagomovil payment: ", error);
      return { error: ERROR_MESSAGES.UNEXPECTED_ERROR };
    }
  },
};

// ===== Controladores de UI =====
const uiController = {
  async populateBankDropdown(dropdownIds) {
    const dropdowns = dropdownIds
      .map((id) => document.getElementById(id))
      .filter((dropdown) => dropdown && dropdown.dataset.loaded !== "true");

    if (dropdowns.length === 0) return;

    // Deshabilitar dropdowns mientras cargan
    dropdowns.forEach((dropdown) => (dropdown.disabled = true));

    try {
      const banks = await apiService.getBankList();

      dropdowns.forEach((dropdown) => {
        dropdown.innerHTML =
          '<option value="none" disabled selected hidden>Seleccione un banco</option>';

        banks.forEach((bank) => {
          const option = document.createElement("option");
          option.value = bank.bankCode;
          option.textContent = `(${bank.bankCode}) ${bank.bankName}`;
          dropdown.appendChild(option);
        });

        dropdown.dataset.loaded = "true";
        dropdown.disabled = false;
      });
    } catch (error) {
      console.error("Error al cargar la lista de bancos:", error);
      dropdowns.forEach((dropdown) => (dropdown.disabled = false));
    }
  },

  handleDebitTokenResponse(response) {
    const tokenSent = response?.data?.tokenSent;
    if (tokenSent === true) {
      return;
    }

    uiController.showErrorDialog(ERROR_MESSAGES.TOKEN_SEND_ERROR);
    return;
  },

  handleDebitPaymentSuccess(response) {
    const successMessage = `Referencia: ${response.data.reference}`;
    this.showSuccessDialog(successMessage);
  },

  handleDebitPaymentError(error) {
    UI_ELEMENTS.errorDialogMessage().textContent = error;
    utils.showElement(UI_ELEMENTS.errorDialog());
  },

  handlePagoMovilSuccess(response) {
    // Mostrar modal de éxito con la información del pago
    const successMessage = `Referencia: ${response.data.reference}\nMonto pagado: $${response.data.amount_paid}`;
    this.showSuccessDialog(successMessage);
  },

  handlePagoMovilError(error) {
    // Mostrar el error específico del servidor usando el modal
    UI_ELEMENTS.errorDialogMessage().textContent = error;
    utils.showElement(UI_ELEMENTS.errorDialog());
  },

  showErrorDialog(message) {
    UI_ELEMENTS.errorDialogMessage().textContent = message;
    utils.showElement(UI_ELEMENTS.errorDialog());
  },

  hideErrorDialog() {
    utils.hideElement(UI_ELEMENTS.errorDialog());
    UI_ELEMENTS.errorDialogMessage().textContent = "";
  },

  showSuccessDialog(message) {
    UI_ELEMENTS.successDialogMessage().textContent = message;
    utils.showElement(UI_ELEMENTS.successDialog());
  },

  hideSuccessDialog() {
    utils.hideElement(UI_ELEMENTS.successDialog());
    UI_ELEMENTS.successDialogMessage().textContent = "";
  },

  showLoadingModal() {
    utils.showElement(UI_ELEMENTS.loadingDialogModal());
  },

  hideLoadingModal() {
    utils.hideElement(UI_ELEMENTS.loadingDialogModal());
  },
};

// ===== Renderizadores de datos =====
const dataRenderer = {
  updateUserFormFields(employeeData) {
    const phoneData = utils.formatPhoneNumber(employeeData.fields.whatsapp);
    if (phoneData) {
      utils.setElementHTML(`#c2p-phone-extension`, phoneData.extension);
      utils.setElementHTML(`#c2p-phone-number`, phoneData.number);
      utils.setElementHTML(`#celular-5`, phoneData.extension);
      utils.setElementHTML(`#celular-6`, phoneData.number);
    }

    const idData = utils.formatNationalId(employeeData.fields.id_number);
    if (idData) {
      utils.setElementHTML(`#debit-id-letter`, idData.letter);
      utils.setElementHTML(`#debit-id-number`, idData.numbers);
      utils.setElementHTML(`#c2p-nid-type`, idData.letter);
      utils.setElementHTML(`#c2p-nid-number`, idData.numbers);
      utils.setElementHTML(`#cedula-5`, idData.letter);
      utils.setElementHTML(`#cedula-6`, idData.numbers);
    }
  },

  updateUserStatus(employeeData) {
    const isActive =
      employeeData.fields.status === "Active" &&
      employeeData.fields.company_status[0] === "Active";
    const isRestricted = employeeData.fields.status === "Restricted";

    if (isActive || isRestricted) {
      utils.showElement(document.getElementById("status_active"));
      utils.hideElement(document.getElementById("status_inactive"));
    } else {
      utils.hideElement(document.getElementById("status_active"));
      utils.showElement(document.getElementById("status_inactive"));
    }
  },

  renderPaymentsTable(payments, employeeData) {
    utils.hideElement(document.getElementById("loading_payments"));

    if (!payments || payments.length === 0) {
      utils.showElement(document.getElementById("empty_payments"));
      utils.hideElement(document.getElementById("list_payments"));
      return;
    }

    utils.hideElement(document.getElementById("empty_payments"));
    utils.showElement(document.getElementById("list_payments"));

    const table = document.getElementById("table_payments");

    payments.forEach((payment, index) => {
      // Usar la misma lógica del código original: index + 1 para insertar después del header
      let row = table.insertRow(index + 1);
      row.className = "table_row_long";

      // Nombre del pago
      let nameCell = row.insertCell(0);
      nameCell.innerHTML = payment.fields.name;
      nameCell.className = "table_cell_5rows full";

      // Fecha
      let dateCell = row.insertCell(1);
      dateCell.innerHTML = payment.fields.date_formated;
      dateCell.className = "table_cell_5rows date";

      // Monto
      let amountCell = row.insertCell(2);
      amountCell.innerHTML = `$${utils.roundTwo(
        payment.fields.amount_total
      )}`;
      amountCell.className = "table_cell_5rows amount";

      // Status
      let statusCell = row.insertCell(3);
      statusCell.innerHTML = this.getPaymentStatusText(payment, employeeData);
      statusCell.className = "table_cell_5rows status";

      // Indicador visual
      let indicatorCell = row.insertCell(4);
      indicatorCell.className = this.getPaymentStatusClass(payment);
    });
  },

  getPaymentStatusText(payment, employeeData) {
    const status = payment.fields.status;
    const isPersonalPayment = employeeData.fields.payment_type === "Personal";
    const shouldCollect = payment.fields.cobranza === "Cobrar";

    switch (status) {
      case PAYMENT_STATUSES.SCHEDULED:
        if (isPersonalPayment && shouldCollect) return "¡Clic para Pagar!";
        if (isPersonalPayment && !shouldCollect)
          return "Clic para adelantar pago";
        return "Programado";
      case PAYMENT_STATUSES.PAID:
        return "Pagado";
      case PAYMENT_STATUSES.PAID_LATE:
        return "Pagado tarde";
      case PAYMENT_STATUSES.DELAYED:
        return employeeData.fields.payment_type !== "Nomina"
          ? "Atrasado - PAGAR aquí"
          : "Atrasado";
      case PAYMENT_STATUSES.REFINANCED:
        return "Refinanciado";
      case PAYMENT_STATUSES.CANCELED:
        return "Cancelado";
      case PAYMENT_STATUSES.UNDER_REVIEW:
      case PAYMENT_STATUSES.DATA_ERROR:
      case PAYMENT_STATUSES.NO_MATCH:
      case PAYMENT_STATUSES.AMOUNT_ERROR:
        return "En revisión";
      default:
        return status;
    }
  },

  getPaymentStatusClass(payment) {
    const status = payment.fields.status;
    const shouldCollect = payment.fields.cobranza === "Cobrar";

    switch (status) {
      case PAYMENT_STATUSES.SCHEDULED:
        return shouldCollect
          ? "table_cell_status_delayed"
          : "table_cell_status_pending";
      case PAYMENT_STATUSES.PAID:
      case PAYMENT_STATUSES.PAID_LATE:
      case PAYMENT_STATUSES.REFINANCED:
      case PAYMENT_STATUSES.CANCELED:
        return "table_cell_status_ready";
      case PAYMENT_STATUSES.DELAYED:
        return "table_cell_status_delayed";
      case PAYMENT_STATUSES.UNDER_REVIEW:
      case PAYMENT_STATUSES.DATA_ERROR:
      case PAYMENT_STATUSES.NO_MATCH:
      case PAYMENT_STATUSES.AMOUNT_ERROR:
        return "table_cell_status_por_revisar";
      default:
        return "table_cell_status_pending";
    }
  },
};

// ===== Manejador de detalles de pago =====
const paymentDetailHandler = {
  async showPaymentDetail(payment, exchangeRate) {
    // Guardar valores en variables globales
    gCurrentPaymentId = payment.id;
    gCurrentExchangeRate = exchangeRate;

    // Actualizar datos generales
    utils.setElementHTML(`#data-payment-id`, payment.fields.name);
    utils.setElementHTML(`#data-payment-cuota`, payment.fields.cuota);

    utils.setElementHTML(
      `#data-payment-amount`,
      utils.roundTwo(Number(payment.fields.amount))
    );
    utils.setElementHTML(
      `#data-payment-mora`,
      utils.roundTwo(Number(payment.fields.mora))
    );
    utils.setElementHTML(
      `#data-payment-total`,
      utils.roundTwo(Number(payment.fields.amount_total))
    );
    utils.setElementHTML(
      `#data-payment-deadline`,
      payment.fields.date_formated
    );

    // Manejar mora
    if (payment.fields.mora > 0) {
      utils.showElement(document.getElementById("wrapper-mora"));
      utils.showElement(document.getElementById("wrapper-total"));
    } else {
      utils.hideElement(document.getElementById("wrapper-mora"));
      utils.hideElement(document.getElementById("wrapper-total"));
    }

    // Configurar tasa BCV usando variable global
    utils.setElementHTML(`#data-payment-tasa`, gCurrentExchangeRate);
    const totalInBs = utils.roundTwo(
      gCurrentExchangeRate * Number(payment.fields.amount_total)
    );
    utils.setElementHTML(`#data-payment-bs`, totalInBs);
    utils.setElementHTML(`#data-payment-bs2`, totalInBs);

    // Configurar UI según tipo de pago y estado
    this.configurePaymentTypeUI(payment);
    this.configurePaymentStatusUI(payment, exchangeRate);

    // Mostrar sección de detalle
    utils.showElement(document.getElementById("section-detail"));
    document.getElementById("section-detail").style.opacity = "100";
    document.getElementById("section-all").style.opacity = "0";
    utils.hideElement(document.getElementById("section-all"));
  },

  configurePaymentTypeUI(payment) {
    const paymentType = payment.fields.payment_type[0];
    const isScheduledOrDelayed =
      payment.fields.status === PAYMENT_STATUSES.SCHEDULED ||
      payment.fields.status === PAYMENT_STATUSES.DELAYED;

    // Mostrar/ocultar sección de cobranza
    if (isScheduledOrDelayed) {
      utils.showElement(document.getElementById("section-cobranza"));
    } else {
      utils.hideElement(document.getElementById("section-cobranza"));
    }

    // Configurar UI según tipo de pago
    const elements = {
      nominaWarning: document.getElementById("warning-pay-nomina"),
      personalTitle: document.getElementById("form-pay-personal-titulo"),
      personalForm: document.getElementById("form-pay-personal"),
      domiciliadoWarning: document.getElementById("warning-pay-domiciliado"),
    };

    // Ocultar todo primero
    Object.values(elements).forEach((el) => utils.hideElement(el));

    switch (paymentType) {
      case "Nomina":
        utils.showElement(elements.nominaWarning);
        break;
      case "Personal":
      case "Domiciliado":
        utils.showElement(elements.personalTitle);
        utils.showElement(elements.personalForm);
        break;
    }
  },

  configurePaymentStatusUI(payment, exchangeRate) {
    const status = payment.fields.status;

    // Elementos de estado
    const statusElements = {
      scheduled: document.getElementById("status-scheduled"),
      porRevisar: document.getElementById("status-por-revisar"),
      delayed: document.getElementById("status-delayed"),
      paid: document.getElementById("status-paid"),
      paidLate: document.getElementById("status-paid-late"),
    };

    // Elementos de información
    const infoElements = {
      tasaBcv: document.getElementById("wrapper-tasa-bcv"),
      bolivares: document.getElementById("wrapper-bolivares"),
      bolivares2: document.getElementById("wrapper-bolivares2"),
      deadline: document.getElementById("wrapper-deadline"),
      date: document.getElementById("wrapper-date"),
      metodo: document.getElementById("wrapper-metodo"),
      comprobante: document.getElementById("wrapper-comprobante"),
      tasaBcvPagado: document.getElementById("wrapper-tasa-bcv-pagado"),
      bolivaresPagado: document.getElementById("wrapper-bolivares-pagado"),
      reportButton: document.getElementById("button-reportar-pago"),
    };

    // Ocultar todos los elementos de estado
    Object.values(statusElements).forEach((el) => utils.hideElement(el));
    Object.values(infoElements).forEach((el) => utils.hideElement(el));

    // Configurar según estado
    switch (status) {
      case PAYMENT_STATUSES.SCHEDULED:
      case PAYMENT_STATUSES.DELAYED:
        const statusElement =
          status === PAYMENT_STATUSES.SCHEDULED
            ? statusElements.scheduled
            : statusElements.delayed;
        utils.showElement(statusElement);
        utils.showElement(infoElements.tasaBcv);
        utils.showElement(infoElements.bolivares);
        utils.showElement(infoElements.bolivares2);
        utils.showElement(infoElements.deadline);
        utils.showElement(infoElements.reportButton);
        break;

      case PAYMENT_STATUSES.UNDER_REVIEW:
      case PAYMENT_STATUSES.DATA_ERROR:
      case PAYMENT_STATUSES.NO_MATCH:
      case PAYMENT_STATUSES.AMOUNT_ERROR:
        utils.showElement(statusElements.porRevisar);
        this.showPaidPaymentInfo(payment, infoElements);
        break;

      case PAYMENT_STATUSES.PAID:
      case PAYMENT_STATUSES.REFINANCED:
      case PAYMENT_STATUSES.CANCELED:
        utils.showElement(statusElements.paid);
        this.showPaidPaymentInfo(payment, infoElements);
        break;

      case PAYMENT_STATUSES.PAID_LATE:
        utils.showElement(statusElements.paidLate);
        this.showPaidPaymentInfo(payment, infoElements);
        break;
    }
  },

  showPaidPaymentInfo(payment, infoElements) {
    utils.showElement(infoElements.bolivares2);
    utils.showElement(infoElements.deadline);
    utils.showElement(infoElements.date);
    utils.showElement(infoElements.metodo);
    utils.showElement(infoElements.comprobante);
    utils.showElement(infoElements.tasaBcvPagado);
    utils.showElement(infoElements.bolivaresPagado);

    // Actualizar valores
    if (payment.fields.date_of_payment_formated) {
      utils.setElementHTML(
        `#data-payment-date`,
        payment.fields.date_of_payment_formated
      );
    }
    if (payment.fields.payment_method) {
      utils.setElementHTML(
        `#data-payment-metodo`,
        payment.fields.payment_method
      );
    }
    if (payment.fields.reference_number) {
      utils.setElementHTML(
        `#data-payment-comprobante`,
        payment.fields.reference_number
      );
    }
    if (payment.fields.tasa_bcv) {
      utils.setElementHTML(
        `#data-payment-tasa-pagado`,
        payment.fields.tasa_bcv
      );
    }
    if (payment.fields.amount_bolivares) {
      utils.setElementHTML(
        `#data-payment-bs-pagado`,
        payment.fields.amount_bolivares
      );
    }
  },
};

// ===== Event Listeners =====
const eventListeners = {
  init() {
    this.setupDOMContentLoaded();
    this.setupDebitTokenEvents();
    this.setupPagoMovilEvents();
    this.setupDialogs();
    this.setupPaymentTableEvents();
    this.setupBackButton();
  },

  setupDOMContentLoaded() {
    document.addEventListener("DOMContentLoaded", async () => {
      await uiController.populateBankDropdown(["c2p-bank", "debit-bank"]);
    });
  },

  async handleDebitTokenRequest() {
    utils.showElement(UI_ELEMENTS.loadingDialogModal());
    const response = await businessController.requestDebitToken();
    utils.hideElement(UI_ELEMENTS.loadingDialogModal());

    uiController.handleDebitTokenResponse(response);
  },

  setupDebitTokenEvents() {
    // Botón continuar (solicitar token)
    document
      .getElementById("debit-continue-button")
      .addEventListener("click", async (event) => {
        if (!validators.canOpenDebitTokenModal()) return;

        await this.handleDebitTokenRequest();

        utils.showElement(UI_ELEMENTS.debitTokenModal());
      });

    // Botón reenviar token
    document
      .getElementById("debit-token-modal-resend-token-button")
      .addEventListener("click", async (event) => {
        await this.handleDebitTokenRequest();
      });

    // Botón cerrar modal
    document
      .getElementById("debit-token-modal-close-button")
      .addEventListener("click", (event) => {
        utils.hideElement(UI_ELEMENTS.debitTokenModal());
      });

    // Botón confirmar pago
    document
      .getElementById("debit-token-modal-continue-button")
      .addEventListener("click", async (event) => {
        event.preventDefault();
        await this.handleDebitPayment();
      });
  },

  async handleDebitPayment() {
    utils.showElement(UI_ELEMENTS.loadingDialogModal());
    const response = await businessController.processDebitPayment();
    utils.hideElement(UI_ELEMENTS.loadingDialogModal());

    if (response.error) {
      uiController.handleDebitPaymentError(response.error);
      return;
    }

    if (response.success) {
      uiController.handleDebitPaymentSuccess(response);
      return;
    }
  },

  setupDialogs() {
    // Botón cerrar modal de error
    document
      .getElementById("error-dialog-close-button")
      .addEventListener("click", (event) => {
        uiController.hideErrorDialog();
      });

    // Botón cerrar modal de éxito
    document
      .getElementById("success-dialog-close-button")
      .addEventListener("click", (event) => {
        uiController.hideSuccessDialog();
        // Recargar la página para mostrar el estado actualizado
        location.reload();
      });
  },

  setupPagoMovilEvents() {
    // Botón enviar pago móvil
    document
      .getElementById("pagomovil-submit-button")
      .addEventListener("click", async (event) => {
        event.preventDefault();
        await this.handlePagoMovilPayment();
      });
  },

  async handlePagoMovilPayment() {
    if (!validators.canProcessPagoMovil()) return;

    uiController.showLoadingModal();

    const response = await businessController.processPagoMovilPayment();

    uiController.hideLoadingModal();

    if (response.error) {
      uiController.handlePagoMovilError(response.error);
      return;
    }

    if (response.success) {
      uiController.handlePagoMovilSuccess(response);
    }
  },

  setupPaymentTableEvents() {
    const table = $("#table_payments");
    table.on("click", "tr", async function () {
      const paymentName = $(this).find("td:eq(0)").text();
      if (!paymentName) return;

      // Buscar el pago en los datos cargados
      const payment = window.paymentsData?.find(
        (p) => p.fields.name === paymentName
      );
      if (!payment) return;

      // Obtener tasa de cambio y mostrar detalle
      const exchangeRate = await apiService.getExchangeRate();
      await paymentDetailHandler.showPaymentDetail(payment, exchangeRate);
    });
  },

  setupBackButton() {
    document
      .getElementById("button-regresar")
      .addEventListener("click", function (event) {
        utils.hideElement(document.getElementById("section-detail"));
        utils.showElement(document.getElementById("section-all"));
        document.getElementById("section-all").style.opacity = "100";
      });
  },
};

// Inicializar event listeners
eventListeners.init();

// ===== Controlador principal de datos =====
const dataController = {
  async initializeUserData(user) {
    if (!user.user_data_loaded.custom_fields) return;

    gUser = user;
    console.log(user);

    try {
      const employeeData = await airtableService.getEmployeeData(
        user.data.airtableid
      );
      await this.processEmployeeData(employeeData);
    } catch (error) {
      console.error("Error initializing user data:", error);
    }
  },

  async processEmployeeData(employeeData) {
    // Actualizar estado del usuario
    dataRenderer.updateUserStatus(employeeData);
    dataRenderer.updateUserFormFields(employeeData);

    // Procesar préstamos y pagos
    const loanRequestsIDs = employeeData.fields.loan_requests;
    const loansIDs = employeeData.fields.loans;

    if (loanRequestsIDs) {
      await airtableService.getLoanRequestsInfo(loanRequestsIDs);
    }

    if (loansIDs) {
      const loans = await airtableService.getLoansInfo(loansIDs);
      const payments = await airtableService.getPaymentsInfo(loans);

      // Ordenar pagos por fecha límite
      payments.sort(
        (a, b) => new Date(a.fields.deadline) - new Date(b.fields.deadline)
      );

      // Guardar datos globalmente para el event listener de tabla
      window.paymentsData = payments;

      // Renderizar tabla de pagos
      dataRenderer.renderPaymentsTable(payments, employeeData);
    } else {
      // Mostrar estado vacío
      utils.hideElement(document.getElementById("loading_payments"));
      utils.showElement(document.getElementById("empty_payments"));
      utils.hideElement(document.getElementById("list_payments"));
    }
  },
};

// ===== Integración con Webflow/SA5 =====
window.sa5 = window.sa5 || [];
window.sa5.push([
  "userInfoChanged",
  async (user) => {
    await dataController.initializeUserData(user);
  },
]);

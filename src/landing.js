let salario = document.getElementById("salario");
//console.log("salario ORIGINAL:",salario)
let pay_capacity_available = 400 / 3;
//console.log("pay_capacity_available ORIGINAL:",pay_capacity_available)
let meses3 = document.getElementById("meses3");
let meses4 = document.getElementById("meses4");
let meses5 = document.getElementById("meses5");
let meses6 = document.getElementById("meses6");
let pay_frecuency = "mensuales";
let frecuency = 1;
let interest_variable = 0.0711548740112150;
let comisiones_rate = 0.1;
let meses = 6;
let max = round((pay_capacity_available * meses) / ((1 + comisiones_rate) + (interest_variable)));
//console.log('max nuevo:',max);
let credito = max * 0.75;
//console.log('credito',credito);
//slider
let sliderNew = document.getElementById("myRange");
let tooltipNew = document.getElementById("sliderValue");
//V1.6 - NUEVAS VARIABLES PARA CÁLCULO DE INTERÉS
let resultadoFlat = 0;
let comisiones = 0;
let resultadoInteres = 0;
let resultadoInteresTotal = 0;
let resultadoTotal = 0;
let effective_interest_rate = 0;
let resultadoPagoMensual = 0;

//V1.6 - NUEVO MÉTODO DE CÁLCULO DE INTERÉS
function calculateInterest() {
    //Variables para el ciclo de Cálculo
    let capital = 0;
    let amortizado = 0;
    let vigente = 0;
    let interest = 0;
    //Cálculo de comisiones
    resultadoFlat = credito * comisiones_rate;
    comisiones = resultadoFlat / (meses * frecuency);
    //Cálculo del effective_interest_rate
    effective_interest_rate = (0.24 * (meses * 30)) / (360 * (meses * frecuency));
    //Cálculo del Payment mensual
    resultadoPagoMensual = (credito / ((1 - (1 / ((1 + effective_interest_rate) ** (meses * frecuency)))) / effective_interest_rate)) + (comisiones);
    for (let i = 1; i <= (meses * frecuency); i++) {
        if (i === 1) {
            //Primera cuota
            interest = credito * effective_interest_rate;
            capital = resultadoPagoMensual - interest - comisiones;
            amortizado = capital;
            vigente = credito - amortizado;
            //Inicial
            resultadoInteres = interest;
        } else {
            //Resto de cuotas
            interest = vigente * effective_interest_rate;
            capital = resultadoPagoMensual - interest - comisiones;
            amortizado = amortizado + capital;
            vigente = credito - amortizado;
            //Acumulado
            resultadoInteres = resultadoInteres + interest;
        };
    }
    resultadoInteresTotal = Number(resultadoFlat) + Number(resultadoInteres);
    //console.log('resultadoInteresTotal',resultadoInteresTotal);
    resultadoTotal = Number(credito) + Number(resultadoInteresTotal);
    //console.log('resultadoTotal',resultadoTotal);
    interest_variable = resultadoInteres / credito;
    //console.log('interest_variable',interest_variable);
}
calculateInterest();

//Estados iniciales del Calculador
Webflow.push(function () {
    //console.log("hello world");
    document.getElementById("salario").value = 400;
    salario = document.getElementById("salario");
    document.getElementById("min-credit").innerHTML = "0";
    document.getElementById("max-credit").innerHTML = max;
    document.getElementById("resultado-pago-mensual").innerHTML = round(resultadoPagoMensual);
    document.getElementById("resultado-total").innerHTML = round(resultadoTotal);
    document.getElementById("resultado-interes").innerHTML = round(resultadoInteresTotal);;
    document.getElementById("resultado-meses").innerHTML = meses;
    tooltipNew.value = Number(75);
    tooltipNew.innerHTML = `$ ${round(Number(credito))} USD`;
    sliderNew.value = Number(75);
    document.getElementById("credit-amount").value = credito;
    document.getElementById("output-meses").value = meses;
    document.getElementById("output-pago-mensual").value = resultadoPagoMensual;
    document.getElementById("output-interes").value = resultadoInteresTotal;
    document.getElementById("output-total").value = resultadoTotal;
});

//v1.4 Función para calcular máximo y reiniciar crédito al 75%, basado en capacidad del 1/3 de salario disponible
function calculateMax() {
    //BACKUP V1.6: let max = round((pay_capacity_available*meses)/(1.1+((0.24*(meses*30))/360)));
    max = round((pay_capacity_available * meses) / ((1 + comisiones_rate) + (interest_variable)));
    //console.log("NUEVO máximo ajustado: ",max);
    credito = max * 0.75;
    sliderNew.value = Number(75);
    tooltipNew.innerHTML = `$ ${round(max * 0.75)} USD`;
    tooltipNew.value = Number(75);
    //TEMPORAL Ajuste de posición del tooltip
    tooltipNew.style.left = 72 + "%";
    //Cambiar el label del máximo del Slider 
    document.getElementById("max-credit").innerHTML = max;
}
//Función para cambiar Plazos de Financiamiento (meses)
function calculateChange(new_max_needed) {
    //Meses de pago (radio buttons)
    if (meses3.checked == true && meses4.checked == false && meses5.checked == false && meses6.checked == false) {
        meses = 3;
    } else {
        if (meses3.checked == false && meses4.checked == true && meses5.checked == false && meses6.checked == false) {
            meses = 4;
        } else {
            if (meses3.checked == false && meses4.checked == false && meses5.checked == true && meses6.checked == false) {
                meses = 5;
            } else {
                if (meses3.checked == false && meses4.checked == false && meses5.checked == false && meses6.checked == true) {
                    meses = 6;
                }
            }
        }
    }
    //V1.7 Caso B: Solo necesito nuevos resultados, sin cambiar MAX. Para Caso A: calculo interest_variable con new_MESES.
    calculateInterest();
    //V1.7 Caso A: con un interest_variable inicial (depende solo de meses), calculo nuevo MAX y resultados finales.
    if (new_max_needed) {
        //NOTA: calculateMax() requiere haber calculado antes el interest_variable antes.
        calculateMax();
        //NOTA: con el nuevo MAX, repetimos calculateInterest() para los resultados reales finales.
        calculateInterest();
    };

    //Display en resultados
    document.getElementById("resultado-meses").innerHTML = meses;
    document.getElementById("resultado-pago-mensual").innerHTML = round(resultadoPagoMensual);
    document.getElementById("resultado-total").innerHTML = round(resultadoTotal);
    document.getElementById("resultado-interes").innerHTML = round(resultadoInteresTotal);
    //Resultados al Formulario
    document.getElementById("credit-amount").value = credito;
    document.getElementById("output-meses").value = meses;
    document.getElementById("output-pago-mensual").value = round(resultadoPagoMensual);
    document.getElementById("output-interes").value = round(resultadoInteresTotal);
    document.getElementById("output-total").value = round(resultadoTotal);
    //console.log("changed");
}

//Funciones para activar calculador
salario.onchange = function () {
    //console.log("salario value:",salario.value)
    pay_capacity_available = (salario.value) / 3;
    //console.log("pay_capacity_available es:",pay_capacity_available)
    calculateChange(true); //Caso A
};
//Funciones para activar calculador
meses3.onchange = function () {
    calculateChange(true); //Caso A
};
meses4.onchange = function () {
    calculateChange(true); //Caso A
};
meses5.onchange = function () {
    calculateChange(true); //Caso A
};
meses6.onchange = function () {
    calculateChange(true); //Caso A
};
sliderNew.addEventListener("input", function () {
    //NECESITO: calcular resultados con nuevo crédito, NO cambiar max.
    //TEMPORAL Ajuste de posición del tooltip
    tooltipNew.style.marginLeft = "-40px";
    let percentage = (this.value - this.min) / (this.max - this.min) * 100;
    tooltipNew.style.left = percentage + "%";
    //tooltipNew.innerHTML = this.value; //LO MUEVE DE 0 A 100;
    tooltipNew.innerHTML = `$ ${round(((Number(max)) * percentage) / 100)} USD`;
    credito = round((Number(max) * percentage) / 100);
    calculateChange(false); //Caso B
});

//Funciones para redondear
function round(x) {
    return (Math.round(x * 100) / 100).toFixed(0);
}
function formatNumber(number) {
    return number.toString().replace(/\\B(?=(\\d{3})+(?!\\d))/g, ".");
}

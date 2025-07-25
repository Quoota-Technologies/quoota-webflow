
let dataWebflow;
//0. WEBFLOW - GET user data
window.sa5 = window.sa5 || [];
window.sa5.push(['userInfoChanged',
    (user) => {
        // Check to verify the custom field data is loaded
        if (user.user_data_loaded.custom_fields) {
            //0. INITIALIZE process with airtable ID
            dataWebflow = user;
            //console.log("1. START - dataWebflow: ",dataWebflow);

            //4.1 AIRTABLE LOAN_REQUESTS - GET array with loan_requests data
            const getLoanRequestsInfo = async (loan_requests_IDs) => {
                let arrayLoanRequests = []
                for (let index = 0; index < loan_requests_IDs.length; index++) {
                    const Id = loan_requests_IDs[index];
                    const baseUrl = `https://api.airtable.com/v0/appGumyin5Xb5JkXR/loan_requests/${Id}`
                    const res = await fetch(baseUrl, {
                        method: 'GET',
                        headers: {
                            'Authorization': 'Bearer patI5e432yDWTmpLq.31b1b77d953e29d548caf28995864ae95b5b67a1eff7d18b6882c019bb01ae95',
                            'Content-Type': 'application/json'
                        }
                    })
                    const response = await res.json();
                    arrayLoanRequests.push(response);
                }
                //Order newest to oldest
                arrayLoanRequests.sort(function (a, b) { return new Date(b.createdTime) - new Date(a.createdTime); });
                return arrayLoanRequests;
            }

            //4.2 AIRTABLE LOANS - GET array with loans data
            const getLoansInfo = async (loans_ID) => {
                let arrayLoans = []
                for (let index = 0; index < loans_ID.length; index++) {
                    const Id = loans_ID[index];
                    const baseUrl = `https://api.airtable.com/v0/appGumyin5Xb5JkXR/loans/${Id}`
                    const res = await fetch(baseUrl, {
                        method: 'GET',
                        headers: {
                            'Authorization': 'Bearer patI5e432yDWTmpLq.31b1b77d953e29d548caf28995864ae95b5b67a1eff7d18b6882c019bb01ae95',
                            'Content-Type': 'application/json'
                        }
                    })
                    const response = await res.json();
                    arrayLoans.push(response);
                }
                //Order newest to oldest
                arrayLoans.sort(function (a, b) { return new Date(b.createdTime) - new Date(a.createdTime); });
                return arrayLoans;
            }

            //4.3 AIRTABLE PAYMENTS - GET array with payments data
            const getPaymentsInfo = async (loans) => {
                let arrayPayments = []
                for (let index1 = 0; index1 < loans.length; index1++) {
                    //Second FOR to get every payment for each loan
                    for (let index2 = 0; index2 < loans[index1].fields.payments_count_total; index2++) {
                        const Id = loans[index1].fields.payments[index2];
                        const baseUrl = `https://api.airtable.com/v0/appGumyin5Xb5JkXR/payments/${Id}`
                        const res = await fetch(baseUrl, {
                            method: 'GET',
                            headers: {
                                'Authorization': 'Bearer patI5e432yDWTmpLq.31b1b77d953e29d548caf28995864ae95b5b67a1eff7d18b6882c019bb01ae95',
                                'Content-Type': 'application/json'
                            }
                        })
                        const response = await res.json();
                        arrayPayments.push(response);
                    };
                };
                //Order newest to oldest
                arrayPayments.sort(function (a, b) { return new Date(b.createdTime) - new Date(a.createdTime); });
                return arrayPayments;
            }

            //2. AIRTABLE - GET employee data:
            const getInfo = async (employeeID) => {
                let dataAirtable = [];
                const baseUrl = `https://api.airtable.com/v0/appGumyin5Xb5JkXR/employees/${employeeID}`;
                const res = await fetch(baseUrl, {
                    method: 'GET',
                    headers: {
                        'Authorization': 'Bearer patI5e432yDWTmpLq.31b1b77d953e29d548caf28995864ae95b5b67a1eff7d18b6882c019bb01ae95',
                        'Content-Type': 'application/json'
                    }
                })
                dataAirtable = await res.json();
                //console.log('2. Airtable getInfo - dataAirtable: ',dataAirtable);

                //Validación de estatus inactivo
                if (dataAirtable.fields.status == "Active" && dataAirtable.fields.company_status[0] == "Active") {
                    document.getElementById('status_active').style.display = 'block';
                    document.getElementById('status_inactive').style.display = 'none';
                } else {
                    document.getElementById('status_active').style.display = 'none';
                    document.getElementById('status_inactive').style.display = 'block';
                }

                //3. PAGE DASHBOARD (PASTE DATA) - View data on page's front-end:
                //---> $('#balance').html(dataAirtable.fields.balance);
                //---> $('#loans_count_total').html(dataAirtable.fields.loans_count_total);
                //---> $('#loans_count_requests').html(dataAirtable.fields.loans_count_requests);
                //---> $('#loans_count_active').html(dataAirtable.fields.loans_count_active);
                //---> $('#loans_count_finished').html(dataAirtable.fields.loans_count_finished);

                //Funciones para redondear
                function round(x) {
                    return (Math.round(x * 100) / 100).toFixed(0);
                }
                function roundTwo(x) {
                    return (Math.round(x * 100) / 100).toFixed(2);
                }
                function formatNumber(number) {
                    return number.toString().replace(/\\B(?=(\\d{3})+(?!\\d))/g, ".");
                };

                //4. LOANS & LOAN_REQUESTS - GET transacctions data:
                let loan_requests_IDs = dataAirtable.fields.loan_requests;
                let loans_IDs = dataAirtable.fields.loans;
                //console.log('4.1 loan_requests_ID: ',loan_requests_IDs);
                //console.log('4.2 loans_ID: ',loans_IDs);

                //4.1. LOANS REQUESTS - Function to get data:
                if (loan_requests_IDs != null) {
                    const loan_requests = await getLoanRequestsInfo(loan_requests_IDs);
                    //console.log('4.3 loan_requests data: ',loan_requests);
                }

                if (loans_IDs != null) {
                    //4.2. LOANS - Function to get data:
                    const loans = await getLoansInfo(loans_IDs);
                    //console.log('4.4 loans data: ',loans);

                    //4.3. PAYMENTS - Function to get data:
                    const payments = await getPaymentsInfo(loans);
                    //console.log('4.5 payments data: ',payments);

                    //5. RECENT TRANSACCIONTS - Concat Loans & Payments:
                    const recent_transactions = [].concat(loans, payments);
                    recent_transactions.sort(function (a, b) { return new Date(b.createdTime) - new Date(a.createdTime); });
                    //console.log('5. recent_transaccions data',recent_transactions);

                    //6. NOW DO SOMETHING WITH ALL YOUR DATA
                    //PRÉSTAMOS PAGE with data
                    document.getElementById('loading_loans').style.display = 'none';
                    document.getElementById('empty_loans').style.display = 'none';
                    document.getElementById('list_loans').style.display = 'flex';
                    var table_recents = document.getElementById("table_loans");

                    //POBLAR LA TABLA DE PRÉSTAMOS
                    for (let indexRowLoans = 0; indexRowLoans < loans.length; indexRowLoans++) {
                        //if (indexRowRecents === 4) { break; }; //No max needed here
                        var newRow = table_recents.insertRow(indexRowLoans + 1);
                        newRow.className = "table_row_long";
                        var cell1 = newRow.insertCell(0);
                        cell1.innerHTML = loans[indexRowLoans].fields.name;
                        cell1.className = "table_cell_full long";
                        var cell2 = newRow.insertCell(1);
                        cell2.innerHTML = loans[indexRowLoans].fields.date_formated;
                        cell2.className = "table_cell_full date";
                        var cell3 = newRow.insertCell(2);
                        cell3.innerHTML = `$${loans[indexRowLoans].fields.amount}`;
                        cell3.className = "table_cell_full amount";
                        var cell4 = newRow.insertCell(3);
                        cell4.innerHTML = loans[indexRowLoans].fields.status;
                        cell4.className = "table_cell_full long mobile_short";
                        var cell5 = newRow.insertCell(4);
                        cell5.innerHTML = `${loans[indexRowLoans].fields.months} meses`;
                        cell5.className = "table_cell_full hidden_landscape";
                        var cell6 = newRow.insertCell(5);
                        cell6.innerHTML = `$${loans[indexRowLoans].fields.payments_done}`;
                        cell6.className = "table_cell_full amount paid";
                        var cell7 = newRow.insertCell(6);
                        cell7.innerHTML = loans[indexRowLoans].fields.payments_received;
                        cell7.className = "table_cell_full short";
                        var cell8 = newRow.insertCell(7);
                        cell8.innerHTML = `$${loans[indexRowLoans].fields.pending_balance}`;
                        cell8.className = "table_cell_full amount pending";
                    }

                    //V1.14: FUNCIONALIDADES PARA VER DETALLE DE CADA FILA DE LA TABLA
                    const table = $('#table_loans');
                    table.on('click', 'tr', async function () {
                        //Get the index of the clicked row (starting from 0)
                        //var clickedRowIndex = $(this).index();
                        //console.log("Clicked row number:", clickedRowIndex);
                        //Get the Loan internal ID from text 
                        var firstCell = $(this).find('td:eq(0)');
                        var loanID = firstCell.text();
                        //console.log("Text in first cell in this row:", loanID);

                        //Filter Loans
                        //console.log("Loans:", loans);
                        var filteredLoan = loans.filter((record) => {
                            return record.fields.name === loanID;
                        })
                        //console.log("Filtered Loan:", filteredLoan);

                        //DATOS GENERALES DEL PRÉSTAMO:
                        $(`#data-loan-id`).html(filteredLoan[0].fields.name);
                        $(`#data-loan-amount`).html(roundTwo(Number(filteredLoan[0].fields.amount)));
                        $(`#data-loan-meses`).html(filteredLoan[0].fields.months);
                        $(`#data-loan-payment`).html(roundTwo(Number(filteredLoan[0].fields.payment)));
                        $(`#data-loan-total`).html(roundTwo(Number(filteredLoan[0].fields.total_payment)));
                        $(`#data-loan-cuotas`).html(filteredLoan[0].fields.payments_received);
                        $(`#data-loan-pagado`).html(roundTwo(Number(filteredLoan[0].fields.payments_done)));
                        switch (filteredLoan[0].fields.status) {
                            case "Pending deposit":
                                document.getElementById('status-pending-deposit').style.display = 'flex';
                                document.getElementById('status-up-to-date').style.display = 'none';
                                document.getElementById('status-pending-payment').style.display = 'none';
                                document.getElementById('status-cancelled').style.display = 'none';
                                document.getElementById('status-finished').style.display = 'none';
                                break;
                            case "Up to date":
                                document.getElementById('status-pending-deposit').style.display = 'none';
                                document.getElementById('status-up-to-date').style.display = 'flex';
                                document.getElementById('status-pending-payment').style.display = 'none';
                                document.getElementById('status-cancelled').style.display = 'none';
                                document.getElementById('status-finished').style.display = 'none';
                                break;
                            case "Pending payments":
                                document.getElementById('status-pending-deposit').style.display = 'none';
                                document.getElementById('status-up-to-date').style.display = 'none';
                                document.getElementById('status-pending-payment').style.display = 'flex';
                                document.getElementById('status-cancelled').style.display = 'none';
                                document.getElementById('status-finished').style.display = 'none';
                                break;
                            case "Canceled":
                                document.getElementById('status-pending-deposit').style.display = 'none';
                                document.getElementById('status-up-to-date').style.display = 'none';
                                document.getElementById('status-pending-payment').style.display = 'none';
                                document.getElementById('status-canceled').style.display = 'flex';
                                document.getElementById('status-finished').style.display = 'none';
                                break;
                            case "Finished":
                                document.getElementById('status-pending-deposit').style.display = 'none';
                                document.getElementById('status-up-to-date').style.display = 'none';
                                document.getElementById('status-pending-payment').style.display = 'none';
                                document.getElementById('status-cancelled').style.display = 'none';
                                document.getElementById('status-finished').style.display = 'flex';
                                break;
                            default:
                                document.getElementById('status-pending-deposit').style.display = 'none';
                                document.getElementById('status-up-to-date').style.display = 'none';
                                document.getElementById('status-pending-payment').style.display = 'none';
                                document.getElementById('status-cancelled').style.display = 'none';
                                document.getElementById('status-finished').style.display = 'none';
                                break;
                        };

                        //TABLA DE AMORTIZACIÓN:              
                        for (let n = 24; n >= 1; n--) {
                            document.getElementById(`quoota_${n}`).style.display = 'none';
                        };
                        //console.log("Payments amount",filteredLoan[0].fields.payments_count_total);
                        for (let i = 1; i <= (filteredLoan[0].fields.payments_count_total); i++) {
                            //Extraer data de cada Pago:
                            //console.log("Each payment:", filteredLoan[0].fields.payments[i-1]);
                            var filteredPayment = payments.filter((record) => {
                                return record.id === filteredLoan[0].fields.payments[i - 1];
                            })
                            //console.log("Filtered Payment:", filteredPayment);

                            //Poblar el POP-UP y tabla de amortización:
                            document.getElementById(`quoota_${i}`).style.display = 'flex';
                            $(`#quoota_value_${i}`).html(roundTwo(Number(filteredPayment[0].fields.amount)));
                            $(`#item_amortizacion_${i}_1`).html(roundTwo(filteredPayment[0].fields.interest));
                            $(`#item_amortizacion_${i}_2`).html(roundTwo(filteredPayment[0].fields.comisiones));
                            $(`#item_amortizacion_${i}_3`).html(roundTwo(filteredPayment[0].fields.capital));
                            $(`#item_amortizacion_${i}_4`).html(roundTwo(filteredPayment[0].fields.amortizado));
                        };
                        document.getElementById('section-detail').style.display = 'flex';
                        document.getElementById('section-detail').style.opacity = '100';
                        document.getElementById('section-all').style.opacity = '0';
                        document.getElementById('section-all').style.display = 'none';

                        //Populate Loan's Detail view
                        //document.getElementById("resultado-interes").innerHTML = round(resultadoInteresTotal);
                        //document.getElementById("credit-amount").value = credito;

                    });
                    document.getElementById("button-regresar").addEventListener("click", function (event) {
                        document.getElementById('section-detail').style.opacity = '0';
                        document.getElementById('section-detail').style.display = 'none';
                        document.getElementById('section-all').style.display = 'flex';
                        document.getElementById('section-all').style.opacity = '100';
                        //console.log("BOTÓN: ",regresar);
                    });


                } else {
                    //NOW DO SOMETHING WITH YOUR EMPTY DATA
                    //6. PRÉSTAMOS EMPTY 
                    document.getElementById('loading_loans').style.display = 'none';
                    document.getElementById('empty_loans').style.display = 'flex';
                    document.getElementById('list_loans').style.display = 'none';
                }

                return dataAirtable;
            }

            //1.START - Run function to get Employee data:
            getInfo(dataWebflow.data.airtableid);

            return;
        }
    }
]);

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
                    for (let index2 = 0; index2 < loans[index1].fields.payments_count; index2++) {
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
                    }
                }
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
                    document.getElementById('status_restricted').style.display = 'none';
                };
                if ((dataAirtable.fields.status != "Active" && dataAirtable.fields.status != "Restricted") || dataAirtable.fields.company_status[0] != "Active") {
                    document.getElementById('status_active').style.display = 'none';
                    document.getElementById('status_inactive').style.display = 'block';
                    document.getElementById('status_restricted').style.display = 'none';
                };
                if (dataAirtable.fields.status == "Restricted") {
                    document.getElementById('status_active').style.display = 'none';
                    document.getElementById('status_inactive').style.display = 'none';
                    document.getElementById('status_restricted').style.display = 'block';
                };

                //3. PAGE DASHBOARD (PASTE DATA) - View data on page's front-end:
                //---> $('#balance').html(dataAirtable.fields.balance);
                //---> $('#loans_count_total').html(dataAirtable.fields.loans_count_total);
                //---> $('#loans_count_requests').html(dataAirtable.fields.loans_count_requests);
                //---> $('#loans_count_active').html(dataAirtable.fields.loans_count_active);
                //---> $('#loans_count_finished').html(dataAirtable.fields.loans_count_finished);

                //4. LOANS & LOAN_REQUESTS - GET transacctions data:
                let loan_requests_IDs = dataAirtable.fields.loan_requests;
                let loans_IDs = dataAirtable.fields.loans;
                //console.log('4.1 loan_requests_ID: ',loan_requests_IDs);
                //console.log('4.2 loans_ID: ',loans_IDs);

                //4.1. LOANS REQUESTS - Function to get data:
                if (loan_requests_IDs != null) {
                    const loan_requests = await getLoanRequestsInfo(loan_requests_IDs);
                    //console.log('4.3 loan_requests data: ',loan_requests);

                    //5. NOW DO SOMETHING WITH ALL YOUR DATA
                    //SOLICITUDES PAGE with data
                    document.getElementById('loading_requests').style.display = 'none';
                    document.getElementById('empty_requests').style.display = 'none';
                    document.getElementById('list_requests').style.display = 'flex';
                    var table_requests = document.getElementById("table_requests");

                    for (let indexRowRequests = 0; indexRowRequests < loan_requests.length; indexRowRequests++) {
                        //if (indexRowRecents === 4) { break; }; //No max needed here
                        var newRow = table_requests.insertRow(indexRowRequests + 1);
                        newRow.className = "table_row_long static";
                        var cell1 = newRow.insertCell(0);
                        cell1.innerHTML = loan_requests[indexRowRequests].fields.name;
                        cell1.className = "table_cell_6rows full";
                        var cell2 = newRow.insertCell(1);
                        cell2.innerHTML = loan_requests[indexRowRequests].fields.data_formated;
                        cell2.className = "table_cell_6rows date";
                        var cell3 = newRow.insertCell(2);
                        cell3.innerHTML = `$${loan_requests[indexRowRequests].fields.amount}`;
                        cell3.className = "table_cell_6rows amount";
                        var cell4 = newRow.insertCell(3);
                        cell4.innerHTML = `${loan_requests[indexRowRequests].fields.months}`;
                        cell4.className = "table_cell_6rows meses";
                        var cell5 = newRow.insertCell(4);
                        if (loan_requests[indexRowRequests].fields.status == "Approved") {
                            cell5.innerHTML = "Aprobado";
                        };
                        if (loan_requests[indexRowRequests].fields.status == "Rejected") {
                            cell5.innerHTML = "Rechazado";
                        };
                        if (loan_requests[indexRowRequests].fields.status !== "Approved" && loan_requests[indexRowRequests].fields.status !== "Rejected") {
                            cell5.innerHTML = "Pendiente";
                        }
                        //cell5.innerHTML = loan_requests[indexRowRequests].fields.status;
                        cell5.className = "table_cell_6rows status";
                        var cell6 = newRow.insertCell(5);
                        if (loan_requests[indexRowRequests].fields.status == "Approved") {
                            cell6.className = "table_cell_status_ready";
                        }
                        if (loan_requests[indexRowRequests].fields.status == "Rejected") {
                            cell6.className = "table_cell_status_rejected";
                        }
                        if (loan_requests[indexRowRequests].fields.status !== "Approved" && loan_requests[indexRowRequests].fields.status !== "Rejected") {
                            cell6.className = "table_cell_status_pending";
                        }
                    }
                } else {
                    //5. SOLICITUDES EMPTY 
                    document.getElementById('loading_requests').style.display = 'none';
                    document.getElementById('empty_requests').style.display = 'flex';
                    document.getElementById('list_requests').style.display = 'none';
                }

                return dataAirtable;
            }

            //1.START - Run function to get Employee data:
            getInfo(dataWebflow.data.airtableid);
            return;
        }
    }
]);
const TABLE_TABS = {
    'PROJECTS': {
        'REQUEST_URL': '/api/admin/projects',
        'TAB_NAME': 'PROJECTS',
        'DATA_TYPE': 'hub',
        'BY_DEFAULT': true
    },
    'PROJECT': {
        'REQUEST_URL': '/api/admin/project',
        'TAB_NAME': 'PROJECT',
        'DATA_TYPE': 'project',
        'BY_DEFAULT': true
    },
    'USERS': {
        'REQUEST_URL': '/api/admin/project/users',
        'TAB_NAME': 'USERS',
        'DATA_TYPE': 'project',
        'BY_DEFAULT': false
    }
}


//////////////////////////////////////////////////////////////////////////////////////////////////////////
//Table class wraps the specific data info
export class Table {
    constructor(tableId, accountId = null, projectId = null, tabKey = 'PROJECTS', dataSet = null) {
        this.tableId = tableId;
        this.accountId = accountId;
        this.projectId = projectId;
        this.tabKey = tabKey;
        this.dataSet = dataSet;
    };

    resetDataInfo( tabKey=null, accountId=null, projectId=null ){
        this.tabKey = tabKey? tabKey: this.tabKey;
        this.accountId = accountId? accountId: this.accountId;
        this.projectId = accountId||projectId? projectId: this.projectId;
        this.dataSet = null;
    }

    async prepareDataAndDraw(){
        const url = TABLE_TABS[this.tabKey].REQUEST_URL;
        const data = {
            'accountId': this.accountId,
            'projectId': this.projectId
        }
        try {
            const response = await axios.get(url, { params: data } );
            this.dataSet = response.data;
        } catch (err) {
            console.error(err);
            return;
        }
        for (var key in this.dataSet[0]) {
            if (Array.isArray(this.dataSet[0][key]) || typeof this.dataSet[0][key] === 'object' && this.dataSet[0][key] != null) {
                this.dataSet.forEach(item => {
                    item[key] = "N/A";
                })
            }
        }
        let columns = [];
        for (var key in this.dataSet[0]) {
            columns.push({
                field: key,
                title: key,
                align: "center"
            })
        }
        $(this.tableId).bootstrapTable('destroy');
        $(this.tableId).bootstrapTable({
            data: this.dataSet,
            customToolbarButtons: [
                {
                    name: "grid-export",
                    title: "Export",
                    icon: "glyphicon-import",
                    callback: exportData
                },
                {
                    name: "grid-import",
                    title: "Import",
                    icon: "glyphicon-export",
                    callback: importData
                }
            ],
            editable: true,
            clickToSelect: true,
            cache: false,
            showToggle: false,
            pagination: true,
            pageList: [5,10],
            pageSize: 5,
            pageNumber: 1,
            uniqueId: 'id',
            striped: true,
            search: true,
            showRefresh: true,
            minimumCountColumns: 2,
            smartDisplay: true,
            columns: columns
        });
    }

    exportToCSV() {
        if (this.dataSet == null || this.dataSet.length == 0) {
            console.warn('DataSet is not ready, please fetch your data first.');
            return;
        }

        let csvData = [];
        let csvHeader = [];

        for (let key in this.dataSet[0]) {
            csvHeader.push(key);
        }
        csvData.push(csvHeader);
        this.dataSet.forEach((row) => {
            let csvRowTmp = [];
            for (let key in row) {
                if (typeof row[key] === 'string')
                    csvRowTmp.push("\"" + row[key].replace(/\"/g, "\"\"").replace("#", "") + "\"")
                else
                    csvRowTmp.push(row[key]);
            }
            csvData.push(csvRowTmp);
        })
        let csvString = csvData.join("%0A");
        let a = document.createElement('a');
        a.href = 'data:attachment/csv,' + csvString;
        a.target = '_blank';
        a.download = this.tabKey + (new Date()).getTime() + '.csv';
        document.body.appendChild(a);
        a.click();
    }

    async importFromCSV( csvInputData ){
        if( csvInputData == null ){
            console.warn('The input csv file is not ready, please provide correct csv data.');
            return;
        }
        const rows = csvInputData.split("\r\n");
        const keys = rows[0].split(',');
        let csvData = [];
        for (let i = 1; i < rows.length; i++) {
            let jsonData = {};
            var cells = rows[i].split(",");
            for (var j = 0; j < cells.length; j++) {
                if (cells[j] == null || cells[j] == '')
                    continue
                let key = keys[j];
                switch (this.tabKey) {
                    case 'PROJECTS':
                        if (key == 'template') {
                            jsonData[key] = { 'projectId': cells[j] };
                            continue;
                        }
                        break;
                    case 'PROJECT':
                    case 'USERS':
                        const params = key.split('.')
                        const length = params.length;
                        if (length == 2 && params[0] == 'products') {
                            let productAccess = {
                                "key": params[length - 1],
                                "access": cells[j]
                            }
                            if (jsonData["products"] == null) {
                                jsonData["products"] = [];
                            }
                            jsonData["products"].push(productAccess)
                            continue
                        }
                        break;
                    default:
                        console.warn("The current Admin Data Type is not expected");
                        break;
                }
                jsonData[key] = cells[j];
            }
            csvData.push(jsonData);
        }
        const data = {
            'accountId': this.accountId,
            'projectId': this.projectId,
            'data': csvData
        }
        const url = TABLE_TABS[this.tabKey].REQUEST_URL;
        let response = null;
        try {
            response = await axios.post(url, data );
        } catch (err) {
            console.error(err);
        }
        return response?response.data : null;
    }
}


function exportData() {
    if (!g_accDataTable ) {
        alert('The CSV data is not ready, please generate the data first.')
        return;
    }
    g_accDataTable.exportToCSV();
}


function importData() {
    let input = document.createElement('input');
    input.type = 'file';
    input.onchange = _ => {
        let fileUpload = Array.from(input.files);
        var regex = /^([a-zA-Z0-9\s_\\.\-:\(\)])+(.csv|.txt)$/;
        if (regex.test(fileUpload[0].name.toLowerCase())) {
            if (typeof (FileReader) != "undefined") {
                var reader = new FileReader();
                reader.onload = async function (e) {
                    if (!g_accDataTable) {
                        alert('please select one collection!');
                        return;
                    }
                    showTable(false);
                    try {
                        await g_accDataTable.importFromCSV(e.target.result);
                        await g_accDataTable.prepareDataAndDraw();
                    } catch (err) {
                        console.log(err);
                    }
                    showTable(true);
                }
                reader.readAsText(fileUpload[0]);
            } else {
                alert("This browser does not support HTML5.");
            }
        } else {
            alert("Please upload a valid CSV file.");
        }
    };
    input.click();
}

function showTable( visible ){
    $('#table_area')[0].hidden = !visible;
    $('#workingAnimation')[0].hidden = visible;
}

export async function refreshTable( accountId = null, projectId=null ) {
    showTable(false);

    if (projectId == null) {
        $("#PROJECTS").addClass("active");
        $("#PROJECTS").removeClass("hidden")

        $("#PROJECT").removeClass("active");
        $("#PROJECT").addClass("hidden")

        $("#USERS").removeClass("active");
        $("#USERS").addClass("hidden")

    } else {
        $("#PROJECTS").removeClass("active");
        $("#PROJECTS").addClass("hidden")

        $("#PROJECT").addClass("active");
        $("#PROJECT").removeClass("hidden")

        $("#USERS").removeClass("active");
        $("#USERS").removeClass("hidden")
    } 
    const activeTab = $("ul#adminTableTabs li.active")[0].id;
    g_accDataTable.resetDataInfo( activeTab, accountId, projectId );
    await g_accDataTable.prepareDataAndDraw();
    showTable(true);
}

export async function initTableTabs(){
    // add all tabs
    for (let key in TABLE_TABS) {
        $('<li id=' + key + '><a href="acc_table" data-toggle="tab">' + TABLE_TABS[key].TAB_NAME + '</a></li>').appendTo('#adminTableTabs');
        $("#" + key).addClass((TABLE_TABS[key].DATA_TYPE == 'hub' && TABLE_TABS[key].BY_DEFAULT) ? "active" : "hidden");
        $("#" + key).removeClass((TABLE_TABS[key].DATA_TYPE == 'hub' && TABLE_TABS[key].BY_DEFAULT)? "hidden" : "active");
    } 
    // event on the tabs
    $('a[data-toggle="tab"]').on('shown.bs.tab', async function (e) {
        if (g_accDataTable == null) {
            console.warn("The table is not ready, please create the table first!");
            return;
        }
        showTable(false);        
        try {
            const activeTab = e.target.parentElement.id;
            g_accDataTable.resetDataInfo(activeTab);
            await g_accDataTable.prepareDataAndDraw();
        } catch (err) {
            console.log(err);
        }    
        showTable(true);
    });  
}

var g_accDataTable = new Table('#acc_table' );

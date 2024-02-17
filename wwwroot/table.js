var g_costTable = null;


// Data type
export const DataType = {
    PROJECT : 'project',
    USERS   : 'users',
    PROJECTS: 'projects',
  }


const TypeInfo = {
    'projects': {
        'tableId' : '#projectsTable',
        'exportUrl': '/api/admin/projects',
        'importUrl': '/api/admin/projects'
    },
    'project': {
        'tableId' : '#projectTable',
        'exportUrl': '/api/admin/project',
        'importUrl': '/api/admin/project'
    },
    'users': {
        'tableId' : '#usersTable',
        'exportUrl': '/api/admin/project/users',
        'importUrl': '/api/admin/project/users'
    }
}


//////////////////////////////////////////////////////////////////////////////////////////////////////////
//Table class wraps the specific data info
export class Table {
    constructor(tableId, accountId, projectId, type = DataType.PROJECT, dataSet = null) {
        this.tableId = tableId;
        this.accountId = accountId;
        this.projectId = projectId;
        this.type = type;
        this.dataSet = dataSet;
        this.csvDataToBeExported = null;
        this.csvDataToBeImported = null;
    };




    resetDataInfo( type=null, accountId=null, projectId=null ){
        this.accountId = accountId? accountId: this.accountId;
        this.projectId = accountId||projectId? projectId: this.projectId;
        this.type = type? type: this.type;
        this.tableId = TypeInfo[this.type].tableId;
        this.dataSet = null;
        this.csvDataToBeExported = null;
        this.csvDataToBeImported = null;
    }

    // get the required data based on current data type
    async fetchDataAsync() {
        const url = TypeInfo[this.type].exportUrl;
        const data = {
            'accountId': this.accountId,
            'projectId': this.projectId
        }
        try {
            const response = await axios.get(url, { params: data } );
            this.dataSet = response.data;
        } catch (err) {
            console.error(err);
        }
    };

    // polish the data
    polishData() {
        if (this.dataSet == null){
            console.warn('No dataSet, please fetch data first.');
            return;
        }

        for (var key in this.dataSet[0]) {
            if (Array.isArray(this.dataSet[0][key]) || typeof this.dataSet[0][key] === 'object' && this.dataSet[0][key] != null) {
                this.dataSet.forEach(item => {
                    item[key] = "N/A";
                })
            }
        }
    };



    // protected: get the data cached to be exported to CSV later
    generateCSVData() {
        if(this.dataSet==null || this.dataSet.length==0){
            console.warn('DataSet is not ready, please fetch your data first.');
            return;
        }

        this.csvDataToBeExported = [];
        let csvHeader = [];

        // Set the header of CSV
        for (let key in this.dataSet[0]) {
            csvHeader.push(key);
        }
        this.csvDataToBeExported.push(csvHeader);

        // Set the row data of CSV
        this.dataSet.forEach((row) => {
            let csvRowTmp = [];
            for (let key in row) {
                if (typeof row[key] === 'string')
                    csvRowTmp.push("\"" + row[key].replace(/\"/g, "\"\"").replace("#", "") + "\"")
                else
                    csvRowTmp.push(row[key]);
            }
            this.csvDataToBeExported.push(csvRowTmp);
        })
    };




    // export data in cost table to CSV file
    exportCSV() {
        if(this.csvDataToBeExported ==null){
            console.warn('CSV data is not ready, please generate the CSV data first');
            return;
        }
        let csvString = this.csvDataToBeExported.join("%0A");
        let a = document.createElement('a');
        a.href = 'data:attachment/csv,' + csvString;
        a.target = '_blank';
        a.download = this.type + (new Date()).getTime() + '.csv';
        document.body.appendChild(a);
        a.click();
    }




    parseCSVData( csvInputData ){
        if( csvInputData == null ){
            console.warn('The input csv file is not ready, please provide correct csv data.');
            return;
        }
        const rows = csvInputData.split("\r\n");
        const keys = rows[0].split(',');
        this.csvDataToBeImported = [];
        for (let i = 1; i < rows.length; i++) {
            let jsonData = {};
            var cells = rows[i].split(",");
            for (var j = 0; j < cells.length; j++) {
                if (cells[j] == null || cells[j] == '')
                    continue

                let key = keys[j];
                // special handle with some keys
                switch (this.type) {
                    case DataType.PROJECTS:
                        if (key == 'template') {
                            jsonData[key] = { 'projectId': cells[j] };
                            continue;
                        }
                        break;
                    case DataType.PROJECT:
                    case DataType.USERS:
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
            this.csvDataToBeImported.push(jsonData);
        }
    }


    // protected: import projects or project users
    async importCSVDataAsync() {
        if (this.csvDataToBeImported == null) {
            console.warn('The CSV data to be imported is not ready, please parse the input CSV data first');
            return;
        }
        const data = {
            'accountId': this.accountId,
            'projectId': this.projectId,
            'data': this.csvDataToBeImported
        }
        const url = TypeInfo[this.type].importUrl;
        let response = null;
        try {
            response = await axios.post(url, data );
        } catch (err) {
            console.error(err);
        }
        return response?response.data : null;
    }
    
    async prepareDataAsync(){
        await this.fetchDataAsync();
        this.polishData();
        this.generateCSVData();
    }

    
    drawTable() {
        if(this.dataSet==null){
            console.warn('DataSet is not ready, please fetch your data first.');
            return;
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
            pageList: [5],
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
    };


}


export async function refreshTableAsync( accountId = null, projectId=null ) {
    if (g_costTable == null) {
        g_costTable = new Table('#projectsTable', accountId, projectId );
    }

    $('.clsInProgress').show();
    $('.clsResult').hide();

    const activeTab = $("ul#adminTableTabs li.active").children()[0].hash.replace('#','');
    g_costTable.resetDataInfo( activeTab, accountId, projectId );
    
    
    if (g_costTable.projectId == null) {
        $("#projectsTab").addClass("active");
        $("#projectsTab").removeClass("hidden")
        $("#projects").addClass("active")

        $("#projectTab").removeClass("active");
        $("#projectTab").addClass("hidden")
        $("#project").removeClass("active");

        $("#usersTab").removeClass("active");
        $("#usersTab").addClass("hidden")
        $("#users").removeClass("active");

    } else {
        $("#projectsTab").removeClass("active");
        $("#projectsTab").addClass("hidden")
        $("#projects").removeClass("active");

        $("#projectTab").addClass("active");
        $("#projectTab").removeClass("hidden")
        $("#project").addClass("active");

        $("#usersTab").removeClass("active");
        $("#usersTab").removeClass("hidden")
        $("#users").removeClass("active");

    } 

    await g_costTable.prepareDataAsync();

    
    g_costTable.drawTable();

    $('.clsInProgress').hide();
    $('.clsResult').show();


}

export async function initApp(){
    $('a[data-toggle="tab"]').on('shown.bs.tab', async function (e) {
        if (g_costTable == null) {
            console.warn("The table is not ready, please create the table first!");
            return;
        }

        $('.clsInProgress').show();
        $('.clsResult').hide();
    
        try {
            const dataType = e.target.hash.replace('#','');
            g_costTable.resetDataInfo(dataType);
            await g_costTable.prepareDataAsync()
            g_costTable.drawTable();
        } catch (err) {
            console.log(err);
        }
    
        $('.clsInProgress').hide();
        $('.clsResult').show();
    });  
}


function exportData() {
    if (!g_costTable || !g_costTable.csvDataToBeExported) {
        alert('The CSV data is not ready, please generate the data first.')
        return;
    }
    g_costTable.exportCSV();
}


function importData() {
    let input = document.createElement('input');
    input.type = 'file';
    input.onchange = _ => {
        // you can use this method to get file and perform respective operations
        let fileUpload = Array.from(input.files);
        // Import data from selected CSV file
        var regex = /^([a-zA-Z0-9\s_\\.\-:\(\)])+(.csv|.txt)$/;
        if (regex.test(fileUpload[0].name.toLowerCase())) {
            if (typeof (FileReader) != "undefined") {
                var reader = new FileReader();
                reader.onload = async function (e) {
                    if (!g_costTable) {
                        alert('please select one collection!');
                        return;
                    }
                    $('.clsInProgress').show();
                    $('.clsResult').hide();
                    try {
                        g_costTable.parseCSVData(e.target.result);
                        await g_costTable.importCSVDataAsync();
                        await g_costTable.prepareDataAsync();
                        g_costTable.drawTable();
                    } catch (err) {
                        console.log(err);
                    }

                    $('.clsInProgress').hide();
                    $('.clsResult').show();

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
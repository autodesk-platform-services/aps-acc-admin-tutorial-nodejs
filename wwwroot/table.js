var g_costTable = null;


// Data type
export const AdminDataType = {
    PROJECT : 'project',
    USERS   : 'users',
    PROJECTS: 'projects',
  }

//////////////////////////////////////////////////////////////////////////////////////////////////////////
//Cost Table class that manage the operation to the table
export class ACCTable {
    constructor(tableId, accountId, projectId, currentDataType = AdminDataType.PROJECT, dataSet = []) {
        this.tableId = tableId;
        this.accountId = accountId;
        this.projectId = projectId;
        this.currentDataType = currentDataType;
        this.dataSet = dataSet;
        this.csvData = null;
        this.importData = null;
    };


    // get the required data for cost table
    async fetchDataAsync() {
        this.dataSet = [];
        try {
            let requestUrl = null;
            let requetData = null;

            switch (this.currentDataType) {
                case AdminDataType.PROJECTS: {
                    requestUrl = '/api/admin/projects';
                    requetData = {
                        'account_id': this.accountId
                    };                          
                    break;
                }
                case AdminDataType.PROJECT: {
                    requestUrl = '/api/admin/project';
                    requetData = {
                        'project_id': this.projectId
                    };
                    break;
                }
                case AdminDataType.USERS: {
                    requestUrl = '/api/admin/project/users';
                    requetData = {
                        'project_id': this.projectId
                    };
                    break;
                }
                default: {
                    console.error("Data type is not set correctly!");
                }
            }   
            if( requestUrl != null )
                this.dataSet = await apiClientAsync(requestUrl, requetData);
        } catch (err) {
            console.log(err);
        }
    };


    // prepare|customize the data to be displayed in the cost table
    async polishDataAsync() {
        if (this.dataSet.length === 0)
            return;

        for (var key in this.dataSet[0]) {
            if (Array.isArray(this.dataSet[0][key]) || typeof this.dataSet[0][key] === 'object' && this.dataSet[0][key] != null) {
                this.dataSet.forEach(item => {
                    item[key] = "N/A";
                })
            }
        }
    };


  
    // get current cost data type 
    get CurrentDataType() {
        return this.currentDataType;
    }

    // set current cost data type
    set CurrentDataType(dataType = AdminDataType.PROJECT) {
        this.currentDataType = dataType;
        switch (this.currentDataType) {
            case AdminDataType.PROJECTS:{
                this.tableId = '#projectsTable';
                break;
            }
            case AdminDataType.PROJECT: {
                this.tableId = '#projectTable';
                break;
            }
            case AdminDataType.USERS: {
                this.tableId = '#usersTable';
                break;
            }
            default:{
                console.error("Data Type is not set correctly.");
            }
        }
    };

    // current table id
    set CurrentTableId(newTableId) {
        this.tableId = newTableId;
    };

    setProjectId(accountId, projectId){
        this.accountId = accountId;
        this.projectId = projectId;
    }

    drawTable() {
        let columns = [];
        if (this.dataSet.length !== 0) {
            for (var key in this.dataSet[0]) {
                columns.push({
                    field: key,
                    title: key,
                    align: "center"
                })
            }
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


    // export data in cost table to CSV file
    exportCSV() {
        let csvString = this.csvData.join("%0A");
        let a = document.createElement('a');
        a.href = 'data:attachment/csv,' + csvString;
        a.target = '_blank';
        a.download = this.currentDataType + (new Date()).getTime() + '.csv';
        document.body.appendChild(a);
        a.click();
    }




    // protected: get the data cached to be exported to CSV later
    prepareCSVData() {
        this.csvData = [];
        let csvHeader = [];

        // Set the header of CSV
        for (let key in this.dataSet[0]) {
            csvHeader.push(key);
        }
        this.csvData.push(csvHeader);

        // Set the row data of CSV
        this.dataSet.forEach((item) => {
            let csvRowTmp = [];
            for (let key in item) {
                if (typeof item[key] === 'string')
                    csvRowTmp.push("\"" + item[key].replace(/\"/g, "\"\"").replace("#", "") + "\"")
                else
                    csvRowTmp.push(item[key]);
            }
            this.csvData.push(csvRowTmp);
        })
    };

    prepareInputData(){

    }


    // protected: import projects or project users
    async importACCInfo(requestData) {

        let requestUrl = null;
        let requestBody = null;
        try {

        switch (this.currentDataType){
            case AdminDataType.PROJECTS:
                requestUrl = '/api/admin/project';
                requestBody = {
                    'accountId': this.accountId,
                    'projectsData': requestData
                };
                break;

            case AdminDataType.PROJECT:
            case AdminDataType.USERS:
                requestUrl = '/api/admin/project/users';
                requestBody = {
                    'projectId': this.projectId,
                    'usersData': { 'users': requestData}
                };
                break; 
                default:
                    console.warn('Current Admin Data Type is not expected.')
                    return false;
        }

            return await apiClientAsync(requestUrl, requestBody, 'post');
        } catch (err) {
            console.error(err);
            return fasle;
        }
    }

}



async function redrawTable(){

    if (g_costTable == null) {
        console.error("The table has to be created!");
        return;
    }

    $('.clsInProgress').show();
    $('.clsResult').hide();

    try {
        await g_costTable.fetchDataAsync();
        await g_costTable.polishDataAsync();
        g_costTable.prepareCSVData();
        g_costTable.drawTable();
    } catch (err) {
        console.log(err);
    }

    $('.clsInProgress').hide();
    $('.clsResult').show();


}

export async function loadTable( accountId, projectId ) {
    if (g_costTable == null) {
        g_costTable = new ACCTable('#projectsTable', accountId, projectId );
    }else{
        g_costTable.setProjectId( accountId, projectId);
    }

    if (projectId == null) {
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

    // get the active tab
    const activeTab = $("ul#adminTableTabs li.active").children()[0].hash;
    switch (activeTab) {
        case '#projects': {
            g_costTable.CurrentDataType = AdminDataType.PROJECTS;
            break;
        }
        case '#project': {
            g_costTable.CurrentDataType = AdminDataType.PROJECT;
            break;
        }
        case '#users': {
            g_costTable.CurrentDataType = AdminDataType.USERS;
            break;
        }
        default:{
            console.error("current active tab is not expected, please check!");
        }
    }

    await redrawTable();

}

export function initTable(){
    $('a[data-toggle="tab"]').on('shown.bs.tab', async function (e) {
        if (g_costTable == null) {
            console.error("The table has to be created!");
            return;
        }

        switch( e.target.hash ){
            case '#projects':{
                g_costTable.CurrentDataType = AdminDataType.PROJECTS;
                break;
            }
            case '#project':{
                g_costTable.CurrentDataType = AdminDataType.PROJECT;
                break;
            }
            case '#users':{
                g_costTable.CurrentDataType = AdminDataType.USERS;
                break;
            }
        }
        await redrawTable();

    });  
}


function exportData() {
    if (!g_costTable || !g_costTable.csvData) {
        alert('Please get the data first.')
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

                    var rows = e.target.result.split("\r\n");
                    const keys = rows[0].split(',');
                    var jsonArray = [];
                    for (var i = 1; i < rows.length; i++) {
                        var jsonData = {};
                        var cells = rows[i].split(",");
                        for (var j = 0; j < cells.length; j++) {
                            if (cells[j] == null || cells[j] == '')
                                continue

                            let key = keys[j];
                            // special handle with some keys
                            switch (g_costTable.CurrentDataType) {
                                case AdminDataType.PROJECTS:
                                    if (key == 'template') {
                                        jsonData[key] = { 'projectId': cells[j] };
                                        continue;
                                    }
                                    break;
                                case AdminDataType.PROJECT:
                                case AdminDataType.USERS:
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
                        jsonArray.push(jsonData);
                    }
                    try {
                        await g_costTable.importACCInfo(jsonArray);
                    } catch (err) {
                        console.log(err);
                    }

                    await redrawTable();
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


// helper function for Request
function apiClientAsync( requestUrl, requestData=null, requestMethod='get' ) {
    let def = $.Deferred();
  
    if( requestMethod == 'post' ){
      requestData = JSON.stringify(requestData);
    }
  
    jQuery.ajax({
      url: requestUrl,
      contentType: 'application/json',
      type: requestMethod,
      dataType: 'json',
      data: requestData,
      success: function (res) {
        def.resolve(res);
      },
      error: function (err) {
        console.error('request failed:');
        def.reject(err)
      }
    });
    return def.promise();
  }
  
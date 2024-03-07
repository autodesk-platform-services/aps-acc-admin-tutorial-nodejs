const TABLE_TABS = {
    'PROJECTS': {
        'REQUEST_URL': '/api/admin/projects',
        'TAB_NAME': 'PROJECTS',
        'CATEGORY_NAME': 'hub',
        'CATEGORY_DEFAULT': true
    },
    'PROJECT': {
        'REQUEST_URL': '/api/admin/project',
        'TAB_NAME': 'PROJECT',
        'CATEGORY_NAME': 'project',
        'CATEGORY_DEFAULT': true
    },
    'USERS': {
        'REQUEST_URL': '/api/admin/project/users',
        'TAB_NAME': 'USERS',
        'CATEGORY_NAME': 'project',
        'CATEGORY_DEFAULT': false
    }
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////
//Table class wraps the specific data info
class Table {
    #tableId;
    #accountId;
    #projectId;
    #tabKey;
    #dataSet;

    constructor(tableId, accountId = null, projectId = null, tabKey = 'PROJECTS') {
        this.#tableId = tableId;
        this.#accountId = accountId;
        this.#projectId = projectId;
        this.#tabKey = tabKey;
        this.#dataSet = null;
    };

    get tabKey(){
        return this.#tabKey;
    }

    set tabKey( tabKey ){
        this.#tabKey = tabKey;
    }

    resetData = async( tabKey=null, accountId=null, projectId=null ) =>{
        this.#tabKey = tabKey? tabKey: this.#tabKey;
        this.#accountId = accountId? accountId: this.#accountId;
        this.#projectId = accountId||projectId? projectId: this.#projectId;
        const url = TABLE_TABS[this.#tabKey].REQUEST_URL;
        const data = {
            'accountId': this.#accountId,
            'projectId': this.#projectId
        }
        try {
            const response = await axios.get(url, { params: data } );
            this.#dataSet = response.data;
        } catch (err) {
            console.error(err);
            return;
        }
        // Mark "N/A" for complicated properties.
        for (var key in this.#dataSet[0]) {
            if (Array.isArray(this.#dataSet[0][key]) || typeof this.#dataSet[0][key] === 'object' && this.#dataSet[0][key] != null) {
                this.#dataSet.forEach(item => {
                    item[key] = "N/A";
                })
            }
        }
    }

    drawTable = () => {
        if (this.#dataSet == null || this.#dataSet.length == 0) {
            console.warn('DataSet is not ready, please fetch your data first.');
            return;
        }

        let columns = [];
        for (var key in this.#dataSet[0]) {
            columns.push({
                field: key,
                title: key,
                align: "center"
            })
        }
        $(this.#tableId).bootstrapTable('destroy');
        $(this.#tableId).bootstrapTable({
            data: this.#dataSet,
            customToolbarButtons: [
                {
                    name: "grid-export",
                    title: "Export",
                    icon: "glyphicon-export",
                    callback: this.exportToCSV
                },
                {
                    name: "grid-import",
                    title: "Import",
                    icon: "glyphicon-import",
                    callback: this.importFromCSV
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
    }

    exportToCSV = ()=>{
        if (this.#dataSet == null || this.#dataSet.length == 0) {
            console.warn('DataSet is not ready, please fetch your data first.');
            return;
        }
        let csvDataList = [];
        let csvHeader = [];
        for (let key in this.#dataSet[0]) {
            csvHeader.push(key);
        }
        csvDataList.push(csvHeader);
        this.#dataSet.forEach((row) => {
            let csvRowItem = [];
            for (let key in row) {
                if (typeof row[key] === 'string')
                    csvRowItem.push("\"" + row[key].replace(/\"/g, "\"\"").replace("#", "") + "\"")
                else
                    csvRowItem.push(row[key]);
            }
            csvDataList.push(csvRowItem);
        })
        let csvString = csvDataList.join("%0A");
        let a = document.createElement('a');
        a.href = 'data:attachment/csv,' + csvString;
        a.target = '_blank';
        a.download = this.#tabKey + (new Date()).getTime() + '.csv';
        document.body.appendChild(a);
        a.click();
    }

    importFromCSV = async() => {
        let input = document.createElement('input');
        input.type = 'file';
        input.onchange = _ => {
            let fileUpload = Array.from(input.files);
            var regex = /^([a-zA-Z0-9\s_\\.\-:\(\)])+(.csv|.txt)$/;
            if (regex.test(fileUpload[0].name.toLowerCase())) {
                if (typeof (FileReader) != "undefined") {
                    var reader = new FileReader();
                    reader.onload = async (e) => {
                        function sleep(ms = 0) {
                            return new Promise(resolve => setTimeout(resolve, ms));
                        }
                        $("#loadingoverlay").fadeIn()
                        const rows = e.target.result.split("\r\n");
                        const keys = rows[0].split(',');
                        let requestDataList = [];
                        for (let i = 1; i < rows.length; i++) {
                            let jsonItem = {};
                            let cells = rows[i].split(",");
                            for (let j = 0; j < cells.length; j++) {
                                if (cells[j] == null || cells[j] == '')
                                    continue
                                // customize the input property
                                let key = keys[j];
                                switch (this.#tabKey) {
                                    case 'PROJECTS':
                                        if (key == 'template') {
                                            jsonItem[key] = { 'projectId': cells[j] };
                                            continue;
                                        }
                                        break;
                                    case 'PROJECT':
                                    case 'USERS':
                                        if (key == 'roleIds') {
                                            const roleIdList = cells[j].replace(/\s/g, '').split('|');
                                            jsonItem[key] = roleIdList;
                                            continue;
                                        }
                                        const params = key.split('.')
                                        const length = params.length;
                                        if (length == 2 && params[0] == 'products') {
                                            let productAccess = {
                                                "key": params[length - 1],
                                                "access": cells[j]
                                            }
                                            if (jsonItem["products"] == null) {
                                                jsonItem["products"] = [];
                                            }
                                            jsonItem["products"].push(productAccess)
                                            continue
                                        }
                                        break;
                                    default:
                                        console.warn("The current Admin Data Type is not expected");
                                        break;
                                }
                                jsonItem[key] = cells[j];
                            }
                            requestDataList.push(jsonItem);
                        }
                        const data = {
                            'accountId': this.#accountId,
                            'projectId': this.#projectId,
                            'data': requestDataList
                        }
                        const url = TABLE_TABS[this.#tabKey].REQUEST_URL;
                        try {
                            const resp = await axios.post(url, data);
                            resp.data.Succeed && resp.data.Succeed.forEach( item => console.log( item + ' is created'));
                            resp.data.Failed && resp.data.Failed.forEach( item => console.warn( item + ' failed to be created') );
                            await sleep(3000);
                            await this.resetData();
                        } catch (err) {
                            console.error(err);
                        }
                        this.drawTable();
                        $("#loadingoverlay").fadeOut()
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
}

export async function refreshTable( accountId = null, projectId=null ) {
    $("#loadingoverlay").fadeIn()
    if( TABLE_TABS[g_accDataTable.tabKey].CATEGORY_NAME=='hub' && projectId ){
        for (let key in TABLE_TABS) {
            if( TABLE_TABS[key].CATEGORY_NAME == 'hub' ){
                $("#" + key).addClass("hidden");
                $("#" + key).removeClass("active");
            }
            else{
                if( TABLE_TABS[key].CATEGORY_DEFAULT )
                    $("#" + key).addClass("active");
                $("#" + key).removeClass("hidden");
            }
        } 
    }
    if (TABLE_TABS[g_accDataTable.tabKey].CATEGORY_NAME == 'project' && !projectId) {
        for (let key in TABLE_TABS) {
            if (TABLE_TABS[key].CATEGORY_NAME == 'hub') {
                $("#" + key).removeClass("hidden");
                if (TABLE_TABS[key].CATEGORY_DEFAULT)
                    $("#" + key).addClass("active");
            }
            else {
                $("#" + key).addClass("hidden");
                $("#" + key).removeClass("active");
            }
        }
    }
    const activeTab = $("ul#adminTableTabs li.active")[0].id;
    try{
        await g_accDataTable.resetData( activeTab, accountId, projectId );
        g_accDataTable.drawTable();
    }catch(err){
        console.warn(err);
    }
    $("#loadingoverlay").fadeOut()
}

export async function initTableTabs(){
    // add all tabs
    for (let key in TABLE_TABS) {
        $('<li id=' + key + '><a href="accTable" data-toggle="tab">' + TABLE_TABS[key].TAB_NAME + '</a></li>').appendTo('#adminTableTabs');
        $("#" + key).addClass((TABLE_TABS[key].CATEGORY_NAME == 'hub' && TABLE_TABS[key].CATEGORY_DEFAULT) ? "active" : "hidden");
    } 
    // event on the tabs
    $('a[data-toggle="tab"]').on('shown.bs.tab', async function (e) {
        $("#loadingoverlay").fadeIn()
        const activeTab = e.target.parentElement.id;
        try {
            await g_accDataTable.resetData(activeTab);
            g_accDataTable.drawTable();
        } catch (err) {
            console.warn(err);
        }    
        $("#loadingoverlay").fadeOut()
    });  
}

var g_accDataTable = new Table('#accTable' );

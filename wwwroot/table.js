var g_costTable = null;

// the following 2 strings will be used to replace ',' and '\n'
const Enter_Replacement = '\xfe';
const Comma_Replacement = '\xfd';



// Data type
export const AdminDataType = {
    PROJECT   : 'project',
    USERS : 'users',
    PROJECTS: 'projects',
  }

//////////////////////////////////////////////////////////////////////////////////////////////////////////
//Cost Table class that manage the operation to the table
export class CostTable {
    constructor(tableId, accountId, projectId, currentDataType = AdminDataType.PROJECT, dataSet = []) {
        this.tableId = tableId;
        this.accountId = accountId;
        this.projectId = projectId;
        this.dataSet = dataSet;
        this.currentDataType = currentDataType;
        this.isHumanReadable = false;
        this.csvData = null;
        this.cachedInfo = {
            DataInfo: []
        }
    };


    // get the required data for cost table
    async fetchDataOfCurrentDataTypeAsync() {
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
    async polishDataOfCurrentDataTypeAsync() {
        if (this.dataSet.length === 0)
            return;

        try {
            this.customizeProperties();
            // if (this.humanReadableData) {
            //     this.humanReadableTitles();
            //     await this.updateIdToHumanReadableData();
            //     this.removeNotRelevantColumns();
            // }
            this.csvData = this.prepareCSVData();
        }
        catch (err) {
            console.log(err);
        }
    };


    // raw data or human readable data
    set IsHumanReadable(isHumanReadable = fasle) {
        this.humanReadableData = isHumanReadable;
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
            editable: true,
            clickToSelect: true,
            cache: false,
            showToggle: false,
            showPaginationSwitch: true,
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


    // protected: remove not relevant properties to make it clear
    removeNotRelevantColumns() {
        NotRelevantProperties[this.currentDataType].forEach((propertyName) => {
            this.removeColumns(propertyName)
        })
    }




    // protected: adjust the value of some array|object properties, including custom attributes, adjustments, recipients
    // budgets,formInstances, costItems
    customizeProperties() {
        for (var key in this.dataSet[0]) {
            if (key === 'adjustments') {
                this.dataSet.forEach((rowData) => {
                    if (rowData[key] != null) {
                        rowData[key] = rowData[key].total;
                    }
                })
                continue;
            }


            // property in cost item enitity
            if (key === 'project') {
                this.dataSet.forEach((rowData) => {
                    if (rowData[key] != null) {
                        rowData[key] = rowData[key].id;
                    }
                })
                continue;
            }

            if (Array.isArray(this.dataSet[0][key])) {
                this.dataSet.forEach((rowData) => {
                    switch (key) {
                        case 'recipients':
                            let recipientsText = '';
                            if (rowData[key] !== null) {
                                const recipientCount = rowData[key].length;
                                for (let i = 0; i < recipientCount; ++i) {
                                    recipientsText += rowData[key][i].id;
                                    recipientsText += ';  ';
                                }
                                rowData[key] = recipientsText;
                            }
                            break;

                        // make all the custom attributes as new column.
                        case 'properties':
                            const propertyCount = rowData[key].length;
                            for (let i = 0; i < propertyCount; ++i) {
                                let customPropertyKey = '';
                                // only show the property definition id in raw mode
                                customPropertyKey = 'CA:' + rowData[key][i].name + ':' + rowData[key][i].propertyDefinitionId;
                                let propertyValue = rowData[key][i].value;
                                rowData[customPropertyKey] = propertyValue ? propertyValue.replaceAll('\n', ';') : propertyValue;
                            }
                            rowData[key] = 'N/A';
                            break;

                        // "budgets" properties when include formInstances in GET Contracts
                        case 'budgets':
                            let budgetsText = '';
                            const budgetCount = rowData[key].length;
                            for (let i = 0; i < budgetCount; ++i) {
                                budgetsText += rowData[key][i].id;
                                budgetsText += ';  ';
                            }
                            rowData[key] = budgetsText;
                            break;

                        // "formInstances" properties when include formInstances in GET Cost Items
                        case 'formInstances':
                            let formInstancesText = '';
                            const formInstanceCount = rowData[key].length;
                            for (let i = 0; i < formInstanceCount; ++i) {
                                formInstancesText += rowData[key][i].formDefinition.name;
                                formInstancesText += ' : ';
                                formInstancesText += rowData[key][i].name;
                                formInstancesText += ';  ';
                            }
                            rowData[key] = formInstancesText;
                            break;

                        // "costItems" properties when include costItems in GET Change Orders
                        case 'costItems':
                            let costItemsText = '';
                            const costItemCount = rowData[key].length;
                            for (let i = 0; i < costItemCount; ++i) {
                                costItemsText += rowData[key][i].name;
                                costItemsText += ';  ';
                            }
                            rowData[key] = costItemsText;
                            break;
                        default:
                            rowData[key] = "N/A";
                            break;
                    };
                })
            }
        }
    };





    // // protected: change the title to be easily understood, mainly remove the GUID for custom attribute
    // humanReadableTitles() {
    //     for (var key in this.dataSet[0]) {
    //         // remove the GUID if it's custom attribute
    //         const params = key.split(':');
    //         if (params[0] === 'CA') {
    //             let newKey = params[0] + ':' + params[1];
    //             this.dataSet.forEach((row) => {
    //                 row[newKey] = row[key];
    //                 delete row[key];
    //             })
    //         }
    //     }
    // }


    // // protected: change to the real data from the Id for specified column
    // async updateIdToHumanReadableData() {
    //     await Promise.all(
    //         IdProperties[this.currentDataType].map(async (propertyName) => {
    //             try {
    //                 await this.updateTableContent(propertyName);
    //             } catch (err) {
    //                 console.log(err);
    //             }
    //         })
    //     )
    //     console.log("all the ids are updated to real content.");
    // };



    // // protected: update all the properties within this column to the real name
    // async updateTableContent(keyName) {
    //     /// get the real data from the Id
    //     for (let i in this.dataSet) {
    //         if (keyName == null || this.dataSet[i][keyName] == null)
    //             continue;

    //         let idArray = this.dataSet[i][keyName].split(';');
    //         let textArray = [];

    //         // wait here until all the ids are converted.
    //         await Promise.all(
    //             idArray.map(async (id) => {
    //                 const idWithoutSpace = id.split(' ').join('');
    //                 if (idWithoutSpace === '')
    //                     return;
    //                 // Check if it's cached
    //                 let dataCached = false;
    //                 // const cacheCount = this.cachedInfo.DataInfo.length;
    //                 for (let j in this.cachedInfo.DataInfo) {
    //                     if (this.cachedInfo.DataInfo[j].Id === idWithoutSpace) {
    //                         textArray.push(this.cachedInfo.DataInfo[j].Value);
    //                         dataCached = true;
    //                         break;
    //                     }
    //                 }
    //                 if (!dataCached) {
    //                     try {
    //                         const realValue = await this.getContentFromId(keyName, idWithoutSpace);
    //                         this.cachedInfo.DataInfo.push({ Id: idWithoutSpace, Value: realValue })
    //                         textArray.push(realValue);
    //                     }
    //                     catch (err) {
    //                         console.log("Failed to get data " + idWithoutSpace + " for " + keyName);
    //                     }
    //                 }
    //             })
    //         )
    //         this.dataSet[i][keyName] = textArray[0];
    //         for (let k = 1; k < textArray.length; k++) {
    //             this.dataSet[i][keyName] = this.dataSet[i][keyName] + ';' + textArray[k];
    //         }
    //     }
    // }


    // // protected: get the real data for the specified id
    // async getContentFromId(propertyName, propertyId) {
    //     if (propertyName == null || propertyId == null) {
    //         console.log('input parameters is not valid.');
    //         return;
    //     }
    //     const requestUrl = '/api/aps/bim360/type/' + encodeURIComponent(propertyName) + '/id/' + encodeURIComponent(propertyId);
    //     const requestData = {
    //         'projectId': this.projectId,
    //         'costContainerId': this.costContainerId
    //     };
    //     try {
    //         const respBody = await apiClientAsync(requestUrl, requestData);
    //         return respBody.name;
    //     } catch (err) {
    //         console.error(err);
    //         return 'Not Found';
    //     }
    // }



    // // protected: update the cost entity info
    // async updateEntityInfo(requestData) {
    //     try {
    //         const requestUrl = '/api/aps/cost/info';
    //         const requestBody = {
    //             'projectId': this.projectId,
    //             'costContainerId': this.costContainerId,
    //             'costType': this.currentDataType,
    //             'requestData': requestData
    //         };
    //         return await apiClientAsync(requestUrl, requestBody, 'post');
    //     } catch (err) {
    //         console.error(err);
    //         return null;
    //     }
    // }


    // // protected: update the custom attribute info
    // async updateCustomAttribute(associationId, propertyDefinitionId, propertyValue) {
    //     let associationType = null;
    //     switch (this.currentDataType) {
    //         case 'project': {
    //             associationType = 'Project';
    //             break;
    //         }
    //         case 'users': {
    //             associationType = 'Users';
    //             break;
    //         }
    //         case 'costitem': {
    //             associationType = 'CostItem';
    //             break;
    //         }
    //     }
    //     const requestBody = {
    //         'costContainerId': this.costContainerId,
    //         'requestData': [{
    //             'associationType': associationType,
    //             'associationId': associationId,
    //             'propertyDefinitionId': propertyDefinitionId,
    //             'value': propertyValue
    //         }]
    //     };
    //     return await apiClientAsync('/api/aps/cost/attribute', requestBody, 'post');
    // }


    // protected: get the data cached to be exported to CSV later
    prepareCSVData() {

        let csvRows = [];
        let csvHeader = [];

        // Set the header of CSV
        for (var key in this.dataSet[0]) {
            csvHeader.push(key);
        }
        csvRows.push(csvHeader);

        // Set the row data of CSV
        this.dataSet.forEach((item) => {
            let csvRowTmp = [];
            for (key in item) {
                // TBD: special handle scopeOfWork property since it includes a rich text
                if ((key == 'scopeOfWork' || key == 'addressLine2' || key == 'aboutMe' )&& item[key] != null) {
                    let tmpStr = item[key].replaceAll(',', Comma_Replacement).replaceAll('\n', Enter_Replacement).replaceAll('#', Enter_Replacement);
                    csvRowTmp.push(tmpStr);
                } else {
                    csvRowTmp.push(item[key]);
                }
            }
            csvRows.push(csvRowTmp);
        })
        return csvRows;
    };


    // private: remove the specified column
    removeColumns(columnName) {
        this.dataSet.forEach((item) => {
            if (typeof item[columnName] != null) {
                delete item[columnName];
            }
        })
    }
}



// async function getAccessToken(callback) {
//     try {
//         const resp = await fetch('/api/auth/token');
//         if (!resp.ok)
//             throw new Error(await resp.text());
//         const { access_token, expires_in } = await resp.json();
//         callback(access_token, expires_in);
//     } catch (err) {
//         alert('Could not obtain access token. See the console for more details.');
//         console.error(err);
//     }
// }

// export function initViewer(container) {
//     return new Promise(function (resolve, reject) {
//         Autodesk.Viewing.Initializer({ env: 'AutodeskProduction', getAccessToken }, function () {
//             const config = {
//                 extensions: ['Autodesk.DocumentBrowser']
//             };
//             const viewer = new Autodesk.Viewing.GuiViewer3D(container, config);
//             viewer.start();
//             viewer.setTheme('light-theme');
//             resolve(viewer);
//         });
//     });
// }


async function redrawTable(){

    if (g_costTable == null) {
        console.error("The table has to be created!");
        return;
    }

    $('.clsInProgress').show();
    $('.clsResult').hide();


        try {
            await g_costTable.fetchDataOfCurrentDataTypeAsync();
            await g_costTable.polishDataOfCurrentDataTypeAsync();
            g_costTable.drawTable();
        } catch (err) {
            console.log(err);
        }

    $('.clsInProgress').hide();
    $('.clsResult').show();


}

export async function loadTable( accountId, projectId ) {
    // create the cost table when project is selected.
    if (g_costTable == null) {
        g_costTable = new CostTable('#projectsTable', accountId, projectId );
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


    $('#exportCSV').click(function () {
        if( !g_costTable || !g_costTable.csvData ){
            alert('Please get the data first.')
            return;
          }
          g_costTable.exportCSV();    
    })

    

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
  